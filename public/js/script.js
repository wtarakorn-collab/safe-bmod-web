let publicRegistrationsData = [];

function goRegister() {
    document.getElementById('page-info').style.display = 'none';
    document.getElementById('page-check').style.display = 'none';
    document.getElementById('page-register').style.display = 'block';
    window.scrollTo(0, 0);
}

function goInfo() {
    document.getElementById('page-register').style.display = 'none';
    document.getElementById('page-check').style.display = 'none';
    document.getElementById('page-info').style.display = 'block';
    window.scrollTo(0, 0);
}

async function goCheckStatus() {
    document.getElementById('page-info').style.display = 'none';
    document.getElementById('page-register').style.display = 'none';
    document.getElementById('page-check').style.display = 'block';
    window.scrollTo(0, 0);

    await loadPublicRegistrations();
}

async function loadPublicRegistrations() {
    try {
        const res = await fetch('/api/registrations/public');
        const result = await res.json();

        if (result.success) {
            publicRegistrationsData = result.data;
            renderPublicTable(publicRegistrationsData);
        }
    } catch (err) {
        console.error('Error loading names:', err);
    }
}

function renderPublicTable(data) {
    const tbody = document.getElementById('publicTableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">ยังไม่มีข้อมูลผู้ลงทะเบียน</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((item, index) => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px;">${index + 1}</td>
            <td style="padding: 10px; font-weight: 600;">${item.prefix}${item.firstname} ${item.lastname}</td>
            <td style="padding: 10px;">${item.position}</td>
            <td style="padding: 10px;">${item.affiliation}</td>
            <td style="padding: 10px; text-align: center;"><span style="color: #0d6efd; font-weight: 600;">✓ ลงทะเบียนแล้ว</span></td>
        </tr>
    `).join('');
}

function searchNames() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = publicRegistrationsData.filter(item => {
        const fullName = `${item.prefix}${item.firstname} ${item.lastname}`.toLowerCase();
        const affiliation = item.affiliation.toLowerCase();
        return fullName.includes(query) || affiliation.includes(query);
    });
    renderPublicTable(filtered);
}

async function submitForm(e) {
    e.preventDefault();
    const form = e.target;
    
    const formData = {
        prefix: form.prefix.value,
        firstname: form.firstname.value,
        lastname: form.lastname.value,
        position: form.position.value,
        affiliation: form.affiliation.value,
        address: form.address.value,
        phone: form.phone.value,
        email: form.email.value
    };

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const res = await response.json();
        if (res.success) {
            document.getElementById('form-view').style.display = 'none';
            document.getElementById('confirm').style.display = 'block';
            document.getElementById('summaryBox').innerHTML = `
                <p><strong>ชื่อ-นามสกุล:</strong> ${formData.prefix}${formData.firstname} ${formData.lastname}</p>
                <p><strong>สังกัด:</strong> ${formData.affiliation}</p>
                <p><strong>เบอร์โทรศัพท์:</strong> ${formData.phone}</p>
            `;
        }
    } catch (err) {
        alert('เกิดข้อผิดพลาดในการลงทะเบียน');
    }

    return false;
}