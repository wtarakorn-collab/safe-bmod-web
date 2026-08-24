const express = require('express');
const path = require('path');
const app = express();

// อ่านข้อมูลแบบ JSON และ Form Data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ชี้ตำแหน่งโฟลเดอร์ public สำหรับไฟล์ CSS, JS และรูปภาพ (แก้ไขปัญหา Not Found และ CSS ไม่โหลด)
app.use(express.static(path.join(__dirname, 'public')));

// Route หน้าแรก
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Port สำหรับเปิดใช้งานบน Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});