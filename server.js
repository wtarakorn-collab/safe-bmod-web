const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database ในหน่วยความจำ (In-Memory Data)
const registrations = [];

// ==========================================
// NODEMAILER CONFIGURATION
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'YOUR_EMAIL@gmail.com',       // 👈 เปลี่ยนเป็นอีเมลผู้ส่งของคุณ
        pass: 'YOUR_GMAIL_APP_PASSWORD'    // 👈 ใส่ App Password 16 หลักจาก Google
    }
});

async function sendConfirmationEmail(data) {
    const mailOptions = {
        from: '"SAFE B-MOD Project" <YOUR_EMAIL@gmail.com>',
        to: data.email,
        subject: 'ยืนยันการลงทะเบียนเข้าร่วมโครงการ SAFE B-MOD',
        html: `
            <div style="font-family: 'Sarabun', sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #0d6efd;">การลงทะเบียนเสร็จสมบูรณ์</h2>
                <p>เรียน คุณ${data.firstname} ${data.lastname},</p>
                <p>ขอขอบพระคุณที่ลงทะเบียนเข้าร่วม <strong>โครงการพัฒนาศักยภาพครู (SAFE B-MOD) เขตสุขภาพที่ 1</strong></p>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="margin-top:0;">สรุปข้อมูลการลงทะเบียน:</h4>
                    <ul>
                        <li><strong>ชื่อ-นามสกุล:</strong> ${data.prefix}${data.firstname} ${data.lastname}</li>
                        <li><strong>ตำแหน่ง:</strong> ${data.position}</li>
                        <li><strong>สังกัด/โรงเรียน:</strong> ${data.affiliation}</li>
                        <li><strong>เบอร์โทรศัพท์:</strong> ${data.phone}</li>
                    </ul>
                </div>
                <hr>
                <small style="color: #6c757d;">ข้อความนี้เป็นการแจ้งเตือนแบบอัตโนมัติ</small>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✉️ ส่งอีเมลยืนยันไปยัง ${data.email} สำเร็จ`);
    } catch (err) {
        console.error('❌ ไม่สามารถส่งอีเมลได้:', err.message);
    }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// 1. ลงทะเบียน
app.post('/api/register', async (req, res) => {
    const { prefix, firstname, lastname, position, affiliation, address, phone, email } = req.body;

    if (!prefix || !firstname || !lastname || !position || !affiliation || !phone) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const newRecord = {
        id: registrations.length + 1,
        prefix,
        firstname,
        lastname,
        position,
        affiliation,
        address: address || '-',
        phone,
        email: email || '-',
        registeredAt: new Date().toLocaleString('th-TH')
    };

    registrations.push(newRecord);

    if (email && email !== '-') {
        sendConfirmationEmail(newRecord);
    }

    res.json({ success: true, message: 'ลงทะเบียนสำเร็จ', data: newRecord });
});

// 2. ตรวจสอบรายชื่อแบบสาธารณะ (เปิดเผยเฉพาะข้อมูลพื้นฐาน)
app.get('/api/registrations/public', (req, res) => {
    const publicList = registrations.map(item => ({
        id: item.id,
        prefix: item.prefix,
        firstname: item.firstname,
        lastname: item.lastname,
        position: item.position,
        affiliation: item.affiliation,
        registeredAt: item.registeredAt
    }));

    res.json({ success: true, data: publicList });
});

// 3. ดึงข้อมูลรายชื่อทั้งหมดสำหรับ Admin
app.get('/api/admin/registrations', (req, res) => {
    res.json({ success: true, count: registrations.length, data: registrations });
});

// 4. Export ไฟล์ Excel (.xlsx)
app.get('/api/admin/export-excel', async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('รายชื่อผู้ลงทะเบียน');

    worksheet.columns = [
        { header: 'ลำดับ', key: 'id', width: 8 },
        { header: 'คำนำหน้า', key: 'prefix', width: 12 },
        { header: 'ชื่อ', key: 'firstname', width: 20 },
        { header: 'นามสกุล', key: 'lastname', width: 20 },
        { header: 'ตำแหน่ง', key: 'position', width: 25 },
        { header: 'สังกัด / โรงเรียน', key: 'affiliation', width: 30 },
        { header: 'เบอร์โทรศัพท์', key: 'phone', width: 18 },
        { header: 'อีเมล', key: 'email', width: 25 },
        { header: 'ที่อยู่', key: 'address', width: 35 },
        { header: 'วันที่ลงทะเบียน', key: 'registeredAt', width: 22 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0D6EFD' } };

    registrations.forEach(item => worksheet.addRow(item));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="SAFE_B-MOD_Registrations.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
});

// หน้า Admin HTML Route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔐 Admin Dashboard: http://localhost:${PORT}/admin`);
});