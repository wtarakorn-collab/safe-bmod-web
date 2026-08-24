const express = require('express');
const path = require('path');
const app = express();

// อ่านข้อมูลแบบ JSON และ Form Data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ชี้ตำแหน่งโฟลเดอร์ public
app.use(express.static(path.join(__dirname, 'public')));

// ตัวแปรเก็บข้อมูลการลงทะเบียนชั่วคราวใน Memory
let registrations = [];

// 1. Route หน้าแรก และ หน้า Admin
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 2. API รับข้อมูลการลงทะเบียน (แก้ไขข้อผิดพลาดลงทะเบียนไม่ได้)
app.post('/api/register', (req, res) => {
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
        res.json({ success: true, message: 'ลงทะเบียนสำเร็จ' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
    }
});

// 3. API สำหรับดึงข้อมูลไปแสดงในหน้า Admin
app.get('/api/admin/registrations', (req, res) => {
    res.json({
        count: registrations.length,
        data: registrations
    });
});

// 4. API สำหรับลบข้อมูลผู้ลงทะเบียน (สำหรับหน้า Admin)
app.delete('/api/admin/registrations/:id', (req, res) => {
    const { id } = req.params;
    registrations = registrations.filter(item => String(item.id) !== String(id));
    res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
});

// Port สำหรับ Render (วางไว้บรรทัดล่างสุดเสมอ)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});