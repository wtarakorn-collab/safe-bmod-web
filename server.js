const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer'); // 1. ดึง nodemailerมาใช้งาน
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let registrations = [];

// 2. ตั้งค่าตัวส่งอีเมล (ใช้ Gmail App Password)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'YOUR_EMAIL@gmail.com',     // ใส่อีเมลของคุณที่จะใช้ส่ง
        pass: 'tccc kxlw lkyl mkkv'  // รหัสผ่านแอป (App Password 16 หลักจาก Google)
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 3. API รับการลงทะเบียนพร้อมส่งอีเมล
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
        
        registrations.push(newEntry);

        // ส่งอีเมลยืนยันหากผู้ใช้งานกรอกอีเมลเข้ามา
        if (formData.email) {
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
                    <br>
                    <p>ขอบคุณที่สนใจเข้าร่วมโครงการกับเรา</p>
                `
            };

            await transporter.sendMail(mailOptions);
        }

        res.json({ success: true, message: 'ลงทะเบียนและส่งอีเมลเรียบร้อยแล้ว' });
    } catch (err) {
        console.error('Register/Email error:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
    }
});

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