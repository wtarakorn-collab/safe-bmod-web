const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let registrations = [];

// ตั้งค่าตัวส่งอีเมล (โปรดเปลี่ยนเป็นอีเมล และ App Password 16 หลักของคุณ)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'YOUR_EMAIL@gmail.com',         // 👈 ใส่อีเมลของคุณตรงนี้
        pass: 'YOUR_GMAIL_APP_PASSWORD'      // 👈 ใส่ App Password 16 หลักตรงนี้
    }
});

// Route หน้าเว็บ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API รับลงทะเบียน (ครอบ try-catch แยกส่วนอีเมลเพื่อป้องกันระบบล่ม)
app.post('/api/register', async (req, res) => {
    try {
        const formData = req.body;
        const newEntry = {
            id: registrations.length + 1,
            prefix: formData.prefix || '',
            firstname: formData.firstname || '',
            lastname: formData.lastname || '',
            position: formData.position || '',
            affiliation: formData.affiliation || '',
            phone: formData.phone || '',
            email: formData.email || '',
            address: formData.address || '',
            registeredAt: new Date().toLocaleString('th-TH')
        };
        
        // 1. บันทึกข้อมูลลงในระบบก่อนทันที
        registrations.push(newEntry);

        // 2. พยายามส่งอีเมล (ถ้าตั้งค่าไม่ถูกต้อง จะแค่แจ้งเตือนใน Console แต่ไม่ทำให้การลงทะเบียนล้มเหลว)
        if (formData.email) {
            try {
                const mailOptions = {
                    from: '"SAFE B-MOD" <YOUR_EMAIL@gmail.com>',
                    to: formData.email,
                    subject: 'ยืนยันการลงทะเบียนเข้าร่วมโครงการ SAFE B-MOD',
                    html: `
                        <h3>ยืนยันการลงทะเบียนสำเร็จ</h3>
                        <p>เรียน คุณ${formData.firstname} ${formData.lastname}</p>
                        <p>ระบบได้บันทึกการลงทะเบียนเข้าร่วมโครงการ SAFE B-MOD เรียบร้อยแล้ว</p>
                        <hr>
                        <p><b>สังกัด/โรงเรียน:</b> ${formData.affiliation}</p>
                        <p><b>ตำแหน่ง:</b> ${formData.position}</p>
                    `
                };
                await transporter.sendMail(mailOptions);
                console.log('ส่งอีเมลสำเร็จหา:', formData.email);
            } catch (emailErr) {
                console.error('ส่งอีเมลไม่สำเร็จ (ตรวจสอบ App Password):', emailErr.message);
            }
        }

        // ตอบกลับหน้าเว็บว่าลงทะเบียนสำเร็จ
        res.json({ success: true, message: 'ลงทะเบียนสำเร็จ' });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
    }
});

// API สำหรับ Admin
app.get('/api/admin/registrations', (req, res) => {
    res.json({ count: registrations.length, data: registrations });
});

app.delete('/api/admin/registrations/:id', (req, res) => {
    const { id } = req.params;
    registrations = registrations.filter(item => String(item.id) !== String(id));
    res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});