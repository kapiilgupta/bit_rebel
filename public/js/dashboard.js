// Factory Brain — dashboard.js

document.addEventListener('DOMContentLoaded', () => {
  // Set today's date in topbar
  const dateEl = document.getElementById('todayDate');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // Active nav item highlight
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('href') === path) item.classList.add('active');
  });

  // Animate KPI cards on load
  document.querySelectorAll('.kpi-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(12px)';
    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 80 * i);
  });

  // Animate section cards
  document.querySelectorAll('.sec-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(10px)';
    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 150 + 60 * i);
  });
});

// Traceability node selection
function selectTrace(el, type) {
  document.querySelectorAll('.trace-node').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  const detail = document.getElementById('traceDetail');
  if (!detail) return;
  const info = {
    demand: {
      icon: '📡', title: 'Demand Signal',
      color: '#4F46E5', bg: '#EEF2FF', border: 'rgba(79,70,229,0.15)',
      rows: [['Source', 'Sales forecast'], ['Updated', '06:00am'], ['Forecast qty', '<strong style="color:#0F172A">480</strong>'], ['Confidence', '<strong style="color:#10B981">94%</strong>']]
    },
    plan: {
      icon: '🧮', title: 'Production Plan',
      color: '#0D9488', bg: '#F0FDFA', border: 'rgba(13,148,136,0.15)',
      rows: [['Required', '<strong style="color:#0F172A">360 units</strong>'], ['In stock', '<strong style="color:#EF4444">120 units</strong>'], ['Planned', '<strong style="color:#0F172A">360 units</strong>'], ['Plan date', 'Today, 06:00am']]
    },
    schedule: {
      icon: '🏭', title: 'Machine Schedule',
      color: '#7C3AED', bg: '#F5F3FF', border: 'rgba(124,58,237,0.15)',
      rows: [['Machine', '<strong style="color:#0F172A">M-01</strong>'], ['Shift', 'Shift A (6am–6pm)'], ['Time slot', '6:00am – 2:00pm'], ['Output est.', '<strong style="color:#EF4444">312 / 360 units (gap: 18%)</strong>']]
    }
  };
  const d = info[type];
  if (!d) return;
  detail.style.background = d.bg;
  detail.style.borderColor = d.border;
  detail.innerHTML = `
    <p style="font-size:13px;font-weight:700;color:${d.color};margin-bottom:10px;">${d.icon} ${d.title}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      ${d.rows.map(([k,v]) => `
        <div style="font-size:12px;color:#64748B;">${k}: ${v}</div>
      `).join('')}
    </div>`;
}

// Refresh dashboard (visual feedback)
function refreshDash() {
  const icon = document.getElementById('refreshIcon');
  if (icon) {
    icon.style.transition = 'transform 0.6s ease';
    icon.style.transform = 'rotate(360deg)';
    setTimeout(() => { icon.style.transform = ''; icon.style.transition = ''; }, 700);
  }
}
