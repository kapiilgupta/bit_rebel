// Factory Brain — auth.js (Frontend)
// Calls real REST API endpoints

/* ─── Shared helpers ─── */
function togglePwd(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = btn.querySelector('[data-lucide]');
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) { icon.setAttribute('data-lucide', 'eye-off'); lucide.createIcons(); }
  } else {
    input.type = 'password';
    if (icon) { icon.setAttribute('data-lucide', 'eye'); lucide.createIcons(); }
  }
}

function checkStrength(val) {
  const segs = [document.getElementById('str1'), document.getElementById('str2'),
                document.getElementById('str3'), document.getElementById('str4')];
  const label = document.getElementById('strengthLabel');
  if (!segs[0]) return;
  segs.forEach(s => { s.className = 'strength-seg'; });
  if (val.length === 0) { label.textContent = 'Enter a password'; return; }
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const cls = score <= 1 ? 'weak' : score <= 2 ? 'medium' : 'strong';
  const labels = ['', 'Weak', 'Weak', 'Medium', 'Strong'];
  for (let i = 0; i < score; i++) segs[i].classList.add(cls);
  label.textContent = labels[score] || '';
}

function showError(msg) {
  let el = document.getElementById('globalError');
  if (!el) {
    el = document.createElement('div');
    el.id = 'globalError';
    el.style.cssText = 'background:#FEF2F2;border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:10px 14px;font-size:13px;color:#EF4444;margin-bottom:12px;display:flex;align-items:center;gap:8px;';
    const form = document.querySelector('.signup-body:not([style*="none"]), .login-form');
    if (form) form.prepend(el);
  }
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${msg}`;
  el.style.display = 'flex';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function clearError() {
  const el = document.getElementById('globalError');
  if (el) el.style.display = 'none';
}

function setLoading(btn, isLoading, text) {
  btn.disabled = isLoading;
  btn.textContent = isLoading ? text : btn.dataset.originalText || text;
  if (!isLoading && btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
}

/* ─── Signup Multi-Step ─── */
let currentStep = 1;
let otpVerified = false;
let verifiedEmail = '';
let countdown;

const steps = {
  1: { heading: 'Verify your email', sub: 'Enter your work email to get started', progress: '33%' },
  2: { heading: 'Create your credentials', sub: 'Choose a username and secure password', progress: '66%' },
  3: { heading: 'Tell us about your company', sub: 'Help us configure your workspace', progress: '100%' },
};

function updateStepUI(step) {
  const s = steps[step];
  if (!s) return;
  const heading = document.getElementById('stepHeading');
  const sub = document.getElementById('stepSub');
  const fill = document.getElementById('progressFill');
  if (heading) heading.textContent = s.heading;
  if (sub) sub.textContent = s.sub;
  if (fill) fill.style.width = s.progress;

  [1, 2, 3].forEach(n => {
    const dot  = document.getElementById('sd' + n);
    const body = document.getElementById('step' + n);
    if (!dot || !body) return;
    dot.className = 'step-dot' + (n < step ? ' done' : n === step ? ' active' : '');
    dot.textContent = n < step ? '✓' : String(n);
    body.style.display = n === step ? 'block' : 'none';
  });

  [1, 2].forEach(n => {
    const line = document.getElementById('sc' + n);
    if (line) line.className = 'step-connector-line' + (n < step ? ' done' : '');
  });

  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (backBtn) backBtn.style.display = step > 1 ? 'inline-flex' : 'none';
  if (nextBtn) nextBtn.textContent = step === 3 ? 'Create Account →' : 'Continue →';
  clearError();
}

async function nextStep() {
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn && !nextBtn.dataset.originalText) nextBtn.dataset.originalText = nextBtn.textContent;

  if (currentStep === 1) {
    if (!otpVerified) {
      await sendOTP();
    } else {
      currentStep = 2; updateStepUI(2);
    }
  } else if (currentStep === 2) {
    const username = document.getElementById('signup-username');
    const password = document.getElementById('signup-password');
    const confirm  = document.getElementById('signup-confirm');
    const terms    = document.getElementById('terms-agree');
    if (!username?.value.trim()) { username?.focus(); showError('Please enter a username.'); return; }
    if (!/^[a-z0-9_]+$/i.test(username.value)) { showError('Username may only contain letters, numbers, and underscores.'); return; }
    if (password?.value.length < 8) { password?.focus(); showError('Password must be at least 8 characters.'); return; }
    if (password?.value !== confirm?.value) { confirm?.focus(); showError('Passwords do not match.'); return; }
    if (!terms?.checked) { showError('Please accept the Terms of Service to continue.'); return; }
    currentStep = 3; updateStepUI(3);
  } else if (currentStep === 3) {
    await submitRegistration();
  }
}

function prevStep() {
  if (currentStep > 1) { currentStep--; updateStepUI(currentStep); }
}

/* ── OTP ── */
async function sendOTP() {
  const emailEl = document.getElementById('signup-email');
  if (!emailEl) return;
  const email = emailEl.value.trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    emailEl.focus(); emailEl.style.borderColor = '#EF4444';
    showError('Please enter a valid email address.'); return;
  }
  emailEl.style.borderColor = '';

  const btn = document.getElementById('sendOtpBtn');
  if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (!data.success) { showError(data.message); if (btn) { btn.textContent = 'Send verification code'; btn.disabled = false; } return; }

    verifiedEmail = email;
    const sendSection = document.getElementById('sendOtpSection');
    const otpSection  = document.getElementById('otpSection');
    const display     = document.getElementById('emailDisplay');
    if (display) display.textContent = email;
    if (sendSection) sendSection.style.display = 'none';
    if (otpSection)  otpSection.style.display  = 'block';
    emailEl.readOnly = true;
    startOTPTimer();
    setupOTPInputs();
    const o1 = document.getElementById('otp1');
    if (o1) o1.focus();
  } catch (_) {
    showError('Could not send OTP. Please check your connection.');
    if (btn) { btn.textContent = 'Send verification code'; btn.disabled = false; }
  }
}

async function verifyOTP() {
  const otp = ['otp1','otp2','otp3','otp4','otp5','otp6']
    .map(id => document.getElementById(id)?.value || '').join('');
  if (otp.length < 6) { showError('Please enter the full 6-digit code.'); return; }

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: verifiedEmail, otp }),
    });
    const data = await res.json();
    if (!data.success) { showError(data.message); return; }
    otpVerified = true;
    clearInterval(countdown);
    currentStep = 2; updateStepUI(2);
  } catch (_) {
    showError('Verification failed. Please try again.');
  }
}

function setupOTPInputs() {
  const ids = ['otp1','otp2','otp3','otp4','otp5','otp6'];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (el.value && i < ids.length - 1) document.getElementById(ids[i + 1])?.focus();
      // Auto-verify when all 6 filled
      const full = ids.every(k => document.getElementById(k)?.value);
      if (full) verifyOTP();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !el.value && i > 0) document.getElementById(ids[i - 1])?.focus();
    });
    el.addEventListener('paste', (e) => {
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      ids.forEach((k, j) => { const inp = document.getElementById(k); if (inp) inp.value = pasted[j] || ''; });
      e.preventDefault();
      if (pasted.length === 6) verifyOTP();
    });
  });
}

function startOTPTimer() {
  let secs = 60;
  const timer   = document.getElementById('otpTimer');
  const resendBtn = document.getElementById('resendBtn');
  if (resendBtn) resendBtn.disabled = true;
  clearInterval(countdown);
  countdown = setInterval(() => {
    secs--;
    if (timer) timer.textContent = secs > 0 ? `(${secs}s)` : '';
    if (secs <= 0) { clearInterval(countdown); if (resendBtn) resendBtn.disabled = false; }
  }, 1000);
}

function resendOTP() {
  otpVerified = false;
  const sendSection = document.getElementById('sendOtpSection');
  const otpSection  = document.getElementById('otpSection');
  if (sendSection) sendSection.style.display = 'block';
  if (otpSection)  otpSection.style.display  = 'none';
  const emailEl = document.getElementById('signup-email');
  if (emailEl) emailEl.readOnly = false;
  sendOTP();
}

/* ── Registration ── */
async function submitRegistration() {
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) { nextBtn.textContent = 'Creating workspace...'; nextBtn.disabled = true; }

  const payload = {
    email:    verifiedEmail,
    username: document.getElementById('signup-username')?.value.trim(),
    password: document.getElementById('signup-password')?.value,
    company: {
      name:           document.getElementById('company-name')?.value.trim(),
      industry:       document.getElementById('industry')?.value,
      numMachines:    document.getElementById('num-machines')?.value,
      productionType: document.getElementById('prod-type')?.value,
    },
  };

  try {
    const res = await fetch('/api/auth/register', {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) {
      showError(data.message);
      if (nextBtn) { nextBtn.textContent = 'Create Account →'; nextBtn.disabled = false; }
      return;
    }
    // Success — redirect to dashboard
    window.location.href = '/dashboard';
  } catch (_) {
    showError('Registration failed. Please check your connection.');
    if (nextBtn) { nextBtn.textContent = 'Create Account →'; nextBtn.disabled = false; }
  }
}

/* ─── Login ─── */
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const usernameEl = document.getElementById('login-username');
  const passwordEl = document.getElementById('login-password');
  if (!usernameEl?.value.trim() || !passwordEl?.value) {
    showError('Please enter your username and password.'); return;
  }
  if (btn) { btn.textContent = 'Logging in...'; btn.disabled = true; }
  clearError();

  try {
    const res = await fetch('/api/auth/login', {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ username: usernameEl.value.trim(), password: passwordEl.value }),
    });
    const data = await res.json();
    if (!data.success) {
      const msg = res.status === 503
        ? '⚠ Database not connected. Please set MONGODB_URI in .env and restart the server.'
        : data.message;
      showError(msg);
      if (btn) { btn.textContent = 'Log in to Factory Brain'; btn.disabled = false; }
      return;
    }
    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
    window.location.href = redirect;
  } catch (_) {
    showError('Login failed. Please check your connection.');
    if (btn) { btn.textContent = 'Log in to Factory Brain'; btn.disabled = false; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateStepUI(currentStep);
});
