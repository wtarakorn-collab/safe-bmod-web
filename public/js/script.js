let publicRegistrationsData = [];

// ---------- Page navigation ----------
function goRegister() {
  document.getElementById('page-info').style.display = 'none';
  document.getElementById('page-check').style.display = 'none';
  document.getElementById('page-register').style.display = 'block';
  document.getElementById('form-view').style.display = 'block';
  document.getElementById('confirm').style.display = 'none';
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

// ---------- Rationale "read more" ----------
function toggleClip() {
  const clip = document.getElementById('rationale-clip');
  const btn = document.getElementById('readmore-btn');
  clip.classList.toggle('open');
  btn.textContent = clip.classList.contains('open') ? 'ย่อข้อความ ↑' : 'อ่านเพิ่มเติม ↓';
}

// ---------- Public check-status table ----------
async function loadPublicRegistrations() {
  const tbody = document.getElementById('publicTableBody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">กำลังโหลดข้อมูล...</td></tr>';
  try {
    const res = await fetch('/api/registrations/public');
    const result = await res.json();
    if (result.success) {
      publicRegistrationsData = result.data;
      renderPublicTable(publicRegistrationsData);
    } else {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง</td></tr>';
    }
  } catch (err) {
    console.error('Error loading names:', err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้</td></tr>';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function renderPublicTable(data) {
  const tbody = document.getElementById('publicTableBody');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">ยังไม่มีข้อมูลผู้ลงทะเบียน</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td style="font-weight:600;">${escapeHtml(item.prefix)}${escapeHtml(item.firstname)} ${escapeHtml(item.lastname)}</td>
      <td>${escapeHtml(item.position)}</td>
      <td>${escapeHtml(item.affiliation)}</td>
      <td style="text-align:center; color: var(--accent); font-weight:600;">✓ ลงทะเบียนแล้ว</td>
    </tr>
  `).join('');
}

function searchNames() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const filtered = publicRegistrationsData.filter((item) => {
    const fullName = `${item.prefix}${item.firstname} ${item.lastname}`.toLowerCase();
    const affiliation = (item.affiliation || '').toLowerCase();
    return fullName.includes(query) || affiliation.includes(query);
  });
  renderPublicTable(filtered);
}

// ---------- Registration form ----------
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return /^[0-9\-\s()+]{9,15}$/.test(value);
}

function setFieldState(fieldId, isValid, message) {
  const wrap = document.getElementById(fieldId);
  if (!wrap) return;
  wrap.classList.toggle('invalid', !isValid);
  if (message) {
    const msgEl = wrap.querySelector('.err-msg');
    if (msgEl) msgEl.textContent = message;
  }
}

function clearAllFieldStates() {
  document.querySelectorAll('#registration-form .field').forEach((f) => f.classList.remove('invalid'));
}

function renderSummary(data) {
  const box = document.getElementById('summaryBox');
  const rows = [
    ['ชื่อ-นามสกุล', `${data.prefix}${data.firstname} ${data.lastname}`],
    ['ชื่อเล่น', data.nickname],
    ['ตำแหน่ง', data.position],
    ['สังกัด / โรงเรียน', data.affiliation],
    ['เบอร์โทรศัพท์', data.phone]
  ];
  if (data.email) rows.push(['อีเมล', data.email]);

  box.innerHTML = rows
    .map(([label, value]) => `<div><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`)
    .join('');
}

async function submitForm(e) {
  e.preventDefault();
  const form = e.target;
  clearAllFieldStates();

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  // Client-side validation (server re-validates everything too)
  const requiredChecks = [
    ['f-prefix', !!(data.prefix && data.prefix.trim())],
    ['f-firstname', !!(data.firstname && data.firstname.trim())],
    ['f-lastname', !!(data.lastname && data.lastname.trim())],
    ['f-nickname', !!(data.nickname && data.nickname.trim())],
    ['f-position', !!(data.position && data.position.trim())],
    ['f-affiliation', !!(data.affiliation && data.affiliation.trim())],
    ['f-phone', !!(data.phone && isValidPhone(data.phone.trim()))]
  ];

  let allValid = true;
  requiredChecks.forEach(([fieldId, ok]) => {
    setFieldState(fieldId, ok);
    if (!ok) allValid = false;
  });

  const emailOk = !data.email || isValidEmail(data.email.trim());
  setFieldState('f-email', emailOk);
  if (!emailOk) allValid = false;

  if (!allValid) {
    const firstInvalid = document.querySelector('.field.invalid');
    if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'กำลังบันทึก...';

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    let result;
    try {
      result = await res.json();
    } catch {
      throw new Error('เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง');
    }

    if (res.ok && result.success) {
      renderSummary(data);
      document.getElementById('form-view').style.display = 'none';
      document.getElementById('confirm').style.display = 'block';
      window.scrollTo(0, 0);
      form.reset();
    } else if (result.errors) {
      Object.entries(result.errors).forEach(([field, message]) => {
        setFieldState('f-' + field, false, message);
      });
      const firstInvalid = document.querySelector('.field.invalid');
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert(result.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  } catch (err) {
    console.error('Submit error:', err);
    alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'ยืนยันการลงทะเบียน';
  }

  return false;
}
