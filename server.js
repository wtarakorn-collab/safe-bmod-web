require('dotenv').config();

const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 10000;

// ---------- Database ----------
if (!process.env.DATABASE_URL) {
  console.warn(
    '[warn] DATABASE_URL is not set. The server will start, but registration ' +
    'and admin features will fail until you connect a PostgreSQL database.'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDb() {
  if (!process.env.DATABASE_URL) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      prefix TEXT NOT NULL,
      firstname TEXT NOT NULL,
      lastname TEXT NOT NULL,
      nickname TEXT,
      position TEXT NOT NULL,
      affiliation TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      address TEXT,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Safe migration: adds the column if the table already existed from before
  // this field was introduced. Running this on every startup is harmless.
  await pool.query(`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS nickname TEXT;`);
}

// ---------- Email (optional — only enabled if credentials are configured) ----------
// NEVER hardcode credentials here. Set GMAIL_USER / GMAIL_APP_PASSWORD as
// environment variables on Render (or in a local .env file that is gitignored).
let transporter = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
} else {
  console.warn('[warn] GMAIL_USER / GMAIL_APP_PASSWORD not set — confirmation emails are disabled.');
}

async function sendConfirmationEmail(entry) {
  if (!transporter || !entry.email) return;
  try {
    await transporter.sendMail({
      from: `"SAFE B-MOD" <${process.env.GMAIL_USER}>`,
      to: entry.email,
      subject: 'ยืนยันการลงทะเบียนเข้าร่วมโครงการ SAFE B-MOD',
      html: `
        <h3>ยืนยันการลงทะเบียนสำเร็จ</h3>
        <p>เรียน คุณ${entry.firstname} ${entry.lastname}</p>
        <p>ระบบได้บันทึกการลงทะเบียนเข้าร่วมโครงการ SAFE B-MOD เรียบร้อยแล้ว</p>
        <hr>
        <p><b>ตำแหน่ง:</b> ${entry.position}</p>
        <p><b>สังกัด/โรงเรียน:</b> ${entry.affiliation}</p>
        <br>
        <p>ขอบคุณที่สนใจเข้าร่วมโครงการกับเรา</p>
      `
    });
  } catch (err) {
    // A failed email must never fail the registration itself — the response
    // to the user has already been sent by the time this runs.
    console.error('Confirmation email failed to send:', err.message);
  }
}

// ---------- Admin auth (HTTP Basic Auth) ----------
// Set ADMIN_USER and ADMIN_PASS as environment variables on Render.
// If they are not set, the admin area stays locked (fails closed) instead of open.
function requireAdminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded && process.env.ADMIN_USER && process.env.ADMIN_PASS) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const sepIndex = decoded.indexOf(':');
    const user = decoded.slice(0, sepIndex);
    const pass = decoded.slice(sepIndex + 1);
    if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="SAFE B-MOD Admin"');
  return res.status(401).send('Authentication required.');
}

// ---------- Validation ----------
function isValidPhone(v) {
  return /^[0-9\-\s()+]{9,15}$/.test(v);
}
function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Public pages ----------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ---------- Public: submit a registration ----------
app.post('/api/register', async (req, res) => {
  try {
    const { prefix, firstname, lastname, nickname, position, affiliation, email, phone, address } = req.body || {};

    const errors = {};
    if (!prefix || !prefix.trim()) errors.prefix = 'กรุณาเลือกคำนำหน้า';
    if (!firstname || !firstname.trim()) errors.firstname = 'กรุณากรอกชื่อ';
    if (!lastname || !lastname.trim()) errors.lastname = 'กรุณากรอกนามสกุล';
    if (!nickname || !nickname.trim()) errors.nickname = 'กรุณากรอกชื่อเล่น';
    if (!position || !position.trim()) errors.position = 'กรุณากรอกตำแหน่ง';
    if (!affiliation || !affiliation.trim()) errors.affiliation = 'กรุณากรอกสังกัด / โรงเรียน';
    if (!phone || !isValidPhone(phone.trim())) errors.phone = 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง';
    if (email && !isValidEmail(email.trim())) errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง', errors });
    }

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        message: 'ระบบยังไม่ได้เชื่อมต่อฐานข้อมูล (DATABASE_URL) กรุณาติดต่อผู้ดูแลระบบ'
      });
    }

    const entry = {
      prefix: prefix.trim(),
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      nickname: nickname ? nickname.trim() : null,
      position: position.trim(),
      affiliation: affiliation.trim(),
      email: email ? email.trim() : null,
      phone: phone.trim(),
      address: address ? address.trim() : null
    };

    const result = await pool.query(
      `INSERT INTO registrations
        (prefix, firstname, lastname, nickname, position, affiliation, email, phone, address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, submitted_at`,
      [entry.prefix, entry.firstname, entry.lastname, entry.nickname, entry.position, entry.affiliation, entry.email, entry.phone, entry.address]
    );

    // Respond to the client immediately — registration is already saved.
    res.json({ success: true, id: result.rows[0].id, submittedAt: result.rows[0].submitted_at });

    // Send the confirmation email afterwards, without blocking or affecting
    // the response already sent. A failed email will never fail the registration.
    sendConfirmationEmail(entry);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' });
  }
});

// ---------- Public: check-registration list ----------
// Only exposes name / position / affiliation — never phone, email, or address.
// Set ENABLE_PUBLIC_LIST=false on Render to turn this off without a code change.
app.get('/api/registrations/public', async (req, res) => {
  if (process.env.ENABLE_PUBLIC_LIST === 'false') {
    return res.json({ success: true, data: [] });
  }
  if (!process.env.DATABASE_URL) {
    return res.json({ success: true, data: [] });
  }
  try {
    const result = await pool.query(
      'SELECT prefix, firstname, lastname, position, affiliation FROM registrations ORDER BY submitted_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Public list error:', err);
    res.status(500).json({ success: false, data: [] });
  }
});

// ---------- Admin: list / delete / export ----------
app.get('/api/admin/registrations', requireAdminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registrations ORDER BY submitted_at DESC');
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Admin list error:', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

app.delete('/api/admin/registrations/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM registrations WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการนี้' });
    }
    res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

app.get('/api/admin/export-excel', requireAdminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registrations ORDER BY submitted_at DESC');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Registrations');
    sheet.columns = [
      { header: 'ลำดับ', key: 'id', width: 8 },
      { header: 'คำนำหน้า', key: 'prefix', width: 10 },
      { header: 'ชื่อ', key: 'firstname', width: 18 },
      { header: 'นามสกุล', key: 'lastname', width: 18 },
      { header: 'ชื่อเล่น', key: 'nickname', width: 14 },
      { header: 'ตำแหน่ง', key: 'position', width: 20 },
      { header: 'สังกัด / โรงเรียน', key: 'affiliation', width: 28 },
      { header: 'เบอร์โทร', key: 'phone', width: 16 },
      { header: 'อีเมล', key: 'email', width: 24 },
      { header: 'ที่อยู่', key: 'address', width: 30 },
      { header: 'วันที่ลงทะเบียน', key: 'submitted_at', width: 22 }
    ];
    sheet.getRow(1).font = { bold: true };
    result.rows.forEach((row) => sheet.addRow(row));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="safe-bmod-registrations.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export excel error:', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งออกไฟล์' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SAFE B-MOD server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
