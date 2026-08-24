const express = require('express');
const path = require('path');
const app = express();

// อ่านข้อมูลแบบ JSON และ Form Data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ชี้ตำแหน่งโฟลเดอร์ public สำหรับไฟล์ CSS, JS และรูปภาพ
app.use(express.static(path.join(__dirname, 'public')));

// Route หน้าแรก
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route หน้า Admin Dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API สำหรับลบข้อมูลผู้ลงทะเบียน (สำหรับหน้า Admin)
app.delete('/api/admin/registrations/:id', (req, res) => {
    const { id } = req.params;
    
    // ลบข้อมูลออกจาก Array หรือ Database
    if (typeof registrations !== 'undefined') {
        registrations = registrations.filter(item => String(item.id) !== String(id));
    }
    
    res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
});

// Port สำหรับเปิดใช้งานบน Render (เอาไว้บรรทัดล่างสุดของไฟล์เสมอ)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});