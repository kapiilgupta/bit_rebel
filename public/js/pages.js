// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(id) { const m = document.getElementById(id); if (m) { m.classList.add('active', 'open'); lucide.createIcons(); } }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('active', 'open'); }

// ─── Table helpers ────────────────────────────────────────────────────────────
function filterTable(tableId, q) {
  const rows = document.querySelectorAll(`#${tableId} tbody tr`);
  q = q.toLowerCase();
  rows.forEach(r => { r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'; });
}
function filterByStatus(tableId, val) {
  const rows = document.querySelectorAll(`#${tableId} tbody tr`);
  rows.forEach(r => { r.style.display = (!val || (r.dataset.status || '').includes(val)) ? '' : 'none'; });
}
function deleteRow(btn) { if (confirm('Delete this row?')) { btn.closest('tr').remove(); showToast('Deleted', 'success'); } }
function exportTable(tableId, name) { showToast('Export started for ' + name, 'info'); }

// ─── Pill helpers ─────────────────────────────────────────────────────────────
function statusPill(s) {
  const map = {
    active:      ['balanced','Active'],
    discontinued:['completed','Discontinued'],
    draft:       ['planned','Draft'],
    ok:          ['balanced','OK'],
    low:         ['low','Low'],
    short:       ['shortage','Short'],
    shortage:    ['shortage','Shortage'],
    balanced:    ['balanced','Balanced'],
    good:        ['balanced','Good'],
    medium:      ['low','Medium'],
    pending:     ['planned','Pending'],
    in_progress: ['in-progress','In Progress'],
    completed:   ['completed','Completed'],
    cancelled:   ['cancelled','Cancelled'],
  };
  const [cls, label] = map[s] || ['planned', s];
  return `<span class="pill ${cls}"><span class="pill-dot"></span>${label}</span>`;
}
function utilBar(pct) {
  const color = pct >= 85 ? '#EF4444' : pct >= 60 ? '#D97706' : '#10B981';
  return `<div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;height:6px;background:#F1F5F9;border-radius:3px;"><div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div></div><span style="font-size:12px;color:#64748B;min-width:32px;">${pct}%</span></div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────
async function loadProducts() {
  try {
    const r = await fetch('/api/products');
    if (r.status === 401) {
      // Not logged in — redirect to login
      window.location.href = '/login';
      return;
    }
    const j = await r.json();
    const data = j.data || [];
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#94A3B8;">No products yet. Click "+ Add Product" to get started.</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(p => `
      <tr data-status="${p.status || 'active'}">
        <td><div class="td-primary">${p.name}</div><div class="td-secondary">${p.variant || ''}</div></td>
        <td class="td-secondary">${p.sku}</td>
        <td>${p.category || '—'}</td>
        <td class="td-number">${p.dailyTarget || 0}</td>
        <td class="td-secondary">₹${p.unitCost || 0}</td>
        <td class="td-secondary">${p.leadTimeDays || 1} day(s)</td>
        <td>${statusPill(p.status || 'active')}</td>
        <td><div class="row-actions">
          <button class="row-action-btn" onclick="editProduct('${p._id}','${p.name}','${p.sku}',${p.dailyTarget || 0})"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>
          <button class="row-action-btn danger" onclick="deleteProduct('${p._id}',this)"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>
        </div></td>
      </tr>`).join('');
    lucide.createIcons();
  } catch(e) { showToast('Failed to load products','error'); }
}

async function addProduct() {
  const nameEl    = document.getElementById('new-name');
  const skuEl     = document.getElementById('new-sku');
  const catEl     = document.getElementById('new-cat');
  const targetEl  = document.getElementById('new-target');
  const costEl    = document.getElementById('new-cost');
  const leadEl    = document.getElementById('new-lead');
  const variantEl = document.getElementById('new-variant');

  const name    = nameEl?.value?.trim();
  const sku     = skuEl?.value?.trim();
  const cat     = catEl?.value;
  const target  = targetEl?.value;
  const cost    = costEl?.value;
  const lead    = leadEl?.value;
  const variant = variantEl?.value?.trim();

  if (!name || !sku) return showToast('Name and SKU are required','error');

  // Disable button to prevent double-submit
  const btn = document.querySelector('#add-product-modal .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    const r = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, sku,
        category: cat,
        dailyTarget: Number(target) || 0,
        unitCost: Number(cost) || 0,
        leadTimeDays: Number(lead) || 1,
        variant,
        status: 'active'
      })
    });
    const j = await r.json();
    if (!j.success) return showToast(j.message || 'Failed to add product', 'error');

    // Reset form fields
    if (nameEl) nameEl.value = '';
    if (skuEl) skuEl.value = '';
    if (targetEl) targetEl.value = '';
    if (costEl) costEl.value = '';
    if (leadEl) leadEl.value = '';
    if (variantEl) variantEl.value = '';

    closeModal('add-product-modal');
    showToast('Product added successfully!', 'success');
    loadProducts();
  } catch(e) {
    console.error('addProduct error:', e);
    showToast('Error adding product. Please try again.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Add Product'; }
  }
}

function editProduct(id, name, sku, target) { showToast('Edit coming soon — ' + name, 'info'); }

async function deleteProduct(id, btn) {
  if (!confirm('Delete this product?')) return;
  try {
    const r = await fetch('/api/products/'+id, { method:'DELETE' });
    const j = await r.json();
    if (!j.success) return showToast(j.message,'error');
    btn.closest('tr').remove();
    showToast('Deleted','success');
  } catch(e) { showToast('Delete failed','error'); }
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY
// ─────────────────────────────────────────────────────────────────────────────
let _products = [];

async function loadInventory() {
  try {
    const [ir, pr] = await Promise.all([fetch('/api/inventory'), fetch('/api/products')]);
    const { data } = await ir.json();
    const pr2 = await pr.json();
    _products = pr2.data || [];

    // Populate product dropdown
    const sel = document.getElementById('stock-product-select');
    if (sel) {
      sel.innerHTML = '<option value="">Select product...</option>' +
        _products.map(p => `<option value="${p._id}">${p.name} — ${p.sku}</option>`).join('');
    }

    const tbody = document.getElementById('inv-tbody');
    if (!tbody) return;

    if (!data || !data.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94A3B8;">No inventory records. Add products first, then update stock.</td></tr>';
      document.getElementById('stat-total').textContent = '0';
      return;
    }

    let low=0, ok=0, total=0;
    tbody.innerHTML = data.map(inv => {
      const p = inv.productId;
      const stock = inv.stockQty;
      const reorder = inv.reorderLevel;
      total += stock;
      let s = 'ok', sl = 'OK';
      if (stock <= 0) { s='short'; sl='Short'; low++; }
      else if (stock < reorder) { s='low'; sl='Low'; low++; }
      else ok++;
      return `<tr data-status="${s}">
        <td><div class="td-primary">${p?.name||'—'}</div></td>
        <td class="td-secondary">${p?.sku||'—'}</td>
        <td class="td-secondary">${p?.variant||'—'}</td>
        <td class="td-number">${stock}</td>
        <td class="td-secondary">${reorder}</td>
        <td>${statusPill(s)}</td>
        <td><div class="row-actions">
          <button class="row-action-btn" onclick="openEditStock('${inv._id}','${p?._id||''}','${p?.name||''}',${stock},${reorder})"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>
        </div></td>
      </tr>`;
    }).join('');

    document.getElementById('stat-total').textContent = data.length;
    document.getElementById('stat-low').textContent   = low;
    document.getElementById('stat-ok').textContent    = ok;
    document.getElementById('stat-units').textContent = total.toLocaleString();
    lucide.createIcons();
  } catch(e) { showToast('Failed to load inventory','error'); }
}

function openEditStock(invId, productId, name, qty, reorder) {
  document.getElementById('stock-inv-id').value     = invId;
  document.getElementById('stock-product-id').value = productId;
  document.getElementById('stock-modal-title').textContent = 'Update Stock — ' + name;
  document.getElementById('stock-qty').value    = qty;
  document.getElementById('stock-reorder').value = reorder;
  openModal('update-stock-modal');
}

async function saveStock() {
  const invId     = document.getElementById('stock-inv-id').value;
  const productId = document.getElementById('stock-product-id').value || document.getElementById('stock-product-select')?.value;
  const qty       = document.getElementById('stock-qty').value;
  const reorder   = document.getElementById('stock-reorder').value;
  if (!productId) return showToast('Select a product','error');

  try {
    let url = '/api/inventory', method = 'POST';
    let body = { productId, stockQty: Number(qty)||0, reorderLevel: Number(reorder)||50 };
    if (invId) { url = '/api/inventory/'+invId; method = 'PUT'; }

    const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.success) return showToast(j.message,'error');
    closeModal('update-stock-modal');
    showToast('Stock updated!','success');
    loadInventory();
  } catch(e) { showToast('Save failed','error'); }
}

// ─────────────────────────────────────────────────────────────────────────────
// MACHINES
// ─────────────────────────────────────────────────────────────────────────────
function openAddMachineModal() {
  document.getElementById('machine-edit-id').value = '';
  document.getElementById('machine-modal-title').textContent = 'Add Machine';
  document.getElementById('machine-name').value = '';
  document.getElementById('machine-type').value = '';
  document.getElementById('machine-shift').value = 480;
  document.getElementById('machine-location').value = '';
  document.getElementById('machine-operational').checked = true;
  openModal('machine-modal');
}

async function loadMachines() {
  try {
    const r = await fetch('/api/machines');
    const { data } = await r.json();
    const tbody = document.getElementById('mach-tbody');
    if (!tbody) return;

    if (!data || !data.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#94A3B8;">No machines yet. Click "+ Add Machine".</td></tr>';
      ['mach-total','mach-operational','mach-idle','mach-util'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent='0'; });
      return;
    }

    const operational = data.filter(m => m.isOperational).length;
    const avgUtil = data.length ? Math.round(data.reduce((s,m)=>s+(m.utilization||0),0)/data.length) : 0;
    document.getElementById('mach-total').textContent       = data.length;
    document.getElementById('mach-operational').textContent = operational;
    document.getElementById('mach-idle').textContent        = data.length - operational;
    document.getElementById('mach-util').textContent        = avgUtil + '%';

    tbody.innerHTML = data.map(m => `
      <tr>
        <td><div class="td-primary">${m.name}</div></td>
        <td class="td-secondary">${m.type||'—'}</td>
        <td class="td-number">${m.shiftMinutes}</td>
        <td class="td-secondary">${m.location||'—'}</td>
        <td><span class="pill ${m.isOperational?'balanced':'completed'}">${m.isOperational?'Yes':'No'}</span></td>
        <td class="td-number">${m.scheduledMins||0}</td>
        <td style="min-width:120px;">${utilBar(m.utilization||0)}</td>
        <td><div class="row-actions">
          <button class="row-action-btn" onclick="editMachine('${m._id}','${m.name}','${m.type||''}',${m.shiftMinutes},'${m.location||''}',${m.isOperational})"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>
          <button class="row-action-btn" onclick="toggleMachine('${m._id}',${!m.isOperational})" title="${m.isOperational?'Mark offline':'Mark operational'}"><i data-lucide="${m.isOperational?'power-off':'power'}" style="width:13px;height:13px;"></i></button>
          <button class="row-action-btn danger" onclick="deleteMachine('${m._id}',this)"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>
        </div></td>
      </tr>`).join('');
    lucide.createIcons();
  } catch(e) { showToast('Failed to load machines','error'); }
}

function editMachine(id, name, type, shift, loc, operational) {
  document.getElementById('machine-edit-id').value = id;
  document.getElementById('machine-modal-title').textContent = 'Edit Machine';
  document.getElementById('machine-name').value = name;
  document.getElementById('machine-type').value = type;
  document.getElementById('machine-shift').value = shift;
  document.getElementById('machine-location').value = loc;
  document.getElementById('machine-operational').checked = operational;
  openModal('machine-modal');
}

async function saveMachine() {
  const id   = document.getElementById('machine-edit-id').value;
  const name = document.getElementById('machine-name').value.trim();
  if (!name) return showToast('Machine name is required','error');
  const body = {
    name, type: document.getElementById('machine-type').value,
    shiftMinutes: Number(document.getElementById('machine-shift').value)||480,
    location: document.getElementById('machine-location').value,
    isOperational: document.getElementById('machine-operational').checked,
  };
  try {
    const url = id ? '/api/machines/'+id : '/api/machines';
    const r = await fetch(url, { method: id?'PUT':'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.success) return showToast(j.message,'error');
    closeModal('machine-modal');
    showToast(id?'Machine updated!':'Machine added!','success');
    loadMachines();
  } catch(e) { showToast('Save failed','error'); }
}

async function toggleMachine(id, newState) {
  try {
    const r = await fetch('/api/machines/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({isOperational:newState}) });
    const j = await r.json();
    if (!j.success) return showToast(j.message,'error');
    showToast(newState?'Machine marked operational':'Machine marked offline','success');
    loadMachines();
  } catch(e) { showToast('Toggle failed','error'); }
}

async function deleteMachine(id, btn) {
  if (!confirm('Delete this machine?')) return;
  try {
    const r = await fetch('/api/machines/'+id, { method:'DELETE' });
    const j = await r.json();
    if (!j.success) return showToast(j.message,'error');
    btn.closest('tr').remove();
    showToast('Machine deleted','success');
  } catch(e) { showToast('Delete failed','error'); }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────
async function loadSchedule() {
  const dateEl = document.getElementById('sched-date');
  const date = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];
  try {
    const r = await fetch('/api/schedule?date='+date);
    const { data } = await r.json();
    const rows = document.getElementById('sched-rows');
    const tbody = document.getElementById('sched-tbody');

    if (!data || !data.length) {
      if (rows) rows.innerHTML = `<div style="text-align:center;padding:40px;color:#94A3B8;"><i data-lucide="calendar-clock" style="width:28px;height:28px;margin-bottom:8px;color:#C7D2FE;"></i><div style="font-size:14px;font-weight:600;color:#475569;margin-bottom:6px;">No schedule for this date</div><div style="font-size:12px;">Click "Generate Schedule" to auto-assign pending orders to machines.</div></div>`;
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94A3B8;padding:24px;">No slots for this date.</td></tr>';
      lucide.createIcons();
      return;
    }

    // Group by machine for Gantt
    const machMap = {};
    data.forEach(s => {
      const mName = s.machineId?.name || 'Unknown';
      if (!machMap[mName]) machMap[mName] = { shiftMins: s.machineId?.shiftMinutes||480, slots:[] };
      machMap[mName].slots.push(s);
    });

    if (rows) {
      rows.innerHTML = Object.entries(machMap).map(([mName, m]) => {
        const blocks = m.slots.map(s => {
          const w = Math.round((s.durationMinutes/m.shiftMins)*100);
          const pName = s.productionOrderId?.productId?.name || s.productionOrderId?.orderNumber || '—';
          return `<div class="sched-block blue" style="width:${w}%">${pName} · ${s.productionOrderId?.quantity||0}u</div>`;
        }).join('');
        const used = m.slots.reduce((a,s)=>a+(s.durationMinutes||0),0);
        const idlePct = Math.max(0,100-Math.round((used/m.shiftMins)*100));
        const idle = idlePct>0 ? `<div class="sched-block idle" style="width:${idlePct}%">Idle</div>` : '';
        return `<div class="sched-row"><span class="sched-machine-label">${mName}</span><div class="sched-track">${blocks}${idle}</div></div>`;
      }).join('');
    }

    if (tbody) {
      tbody.innerHTML = data.map(s => {
        const startH = Math.floor((s.startMinute||0)/60)+6;
        const startM = String((s.startMinute||0)%60).padStart(2,'0');
        const pName = s.productionOrderId?.productId?.name || '—';
        return `<tr>
          <td><div class="td-primary">${s.machineId?.name||'—'}</div></td>
          <td class="td-secondary">${s.productionOrderId?.orderNumber||'—'}</td>
          <td>${pName}</td>
          <td class="td-number">${s.productionOrderId?.quantity||0}</td>
          <td class="td-secondary">${startH}:${startM}</td>
          <td class="td-secondary">${s.durationMinutes} min</td>
        </tr>`;
      }).join('');
    }

    const badge = document.getElementById('sched-status-badge');
    if (badge) badge.style.display = 'flex';
    lucide.createIcons();
  } catch(e) { showToast('Failed to load schedule','error'); }
}

async function generateSchedule() {
  const btn = document.getElementById('gen-sched-btn');
  if (btn) { btn.disabled=true; btn.textContent='Generating...'; }
  try {
    const dateEl = document.getElementById('sched-date');
    const date = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];
    const r = await fetch('/api/schedule/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({date}) });
    const j = await r.json();
    if (!j.success) return showToast(j.message||'Failed','error');
    showToast(j.message,'success');
    loadSchedule();
  } catch(e) { showToast('Generation failed','error'); }
  finally { if(btn){btn.disabled=false; btn.innerHTML='<i data-lucide="zap" style="width:14px;height:14px;"></i> Generate Schedule'; lucide.createIcons();} }
}

// ─────────────────────────────────────────────────────────────────────────────
// FORECAST page helpers
// ─────────────────────────────────────────────────────────────────────────────
async function generateAIForecast() {
  const btn = document.getElementById('gen-forecast-btn');
  if (btn) { btn.disabled=true; btn.textContent='Generating...'; }
  try {
    const r = await fetch('/api/forecast/generate', { method:'POST' });
    const j = await r.json();
    if (!j.success) return showToast(j.message,'error');
    showToast(`Forecast generated: ${j.count} entries`,'success');
  } catch(e) { showToast('Generation failed','error'); }
  finally { if(btn){btn.disabled=false; btn.textContent='Generate AI Forecast';} }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION ORDERS page helpers
// ─────────────────────────────────────────────────────────────────────────────
async function loadOrders() {
  try {
    const r = await fetch('/api/orders');
    const { data } = await r.json();
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;
    if (!data || !data.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94A3B8;">No production orders yet. Click "Generate Orders".</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(o => `
      <tr data-status="${o.status}">
        <td class="td-secondary">${o.orderNumber}</td>
        <td><div class="td-primary">${o.productId?.name||'—'}</div><div class="td-secondary">${o.productId?.sku||''}</div></td>
        <td class="td-secondary">${o.productId?.variant||'—'}</td>
        <td>${new Date(o.dueDate).toLocaleDateString('en-IN')}</td>
        <td class="td-number">${o.quantity}</td>
        <td>${statusPill(o.status)}</td>
        <td><div class="row-actions">
          <button class="row-action-btn danger" onclick="deleteOrder('${o._id}',this)"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>
        </div></td>
      </tr>`).join('');
    lucide.createIcons();
  } catch(e) { showToast('Failed to load orders','error'); }
}

async function generateOrders() {
  const btn = document.getElementById('gen-orders-btn');
  if (btn) { btn.disabled=true; btn.textContent='Generating...'; }
  try {
    const r = await fetch('/api/orders/generate', { method:'POST' });
    const j = await r.json();
    showToast(j.message||'Done', j.success?'success':'error');
    if (j.success) loadOrders();
  } catch(e) { showToast('Failed','error'); }
  finally { if(btn){btn.disabled=false; btn.innerHTML='<i data-lucide="zap" style="width:14px;height:14px;"></i> Generate Orders'; lucide.createIcons();} }
}

async function deleteOrder(id, btn) {
  if (!confirm('Delete this order?')) return;
  try {
    const r = await fetch('/api/orders/'+id, { method:'DELETE' });
    const j = await r.json();
    if (!j.success) return showToast(j.message,'error');
    btn.closest('tr').remove();
    showToast('Order deleted','success');
  } catch(e) { showToast('Delete failed','error'); }
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD helpers (called from dashboard.js)
// ─────────────────────────────────────────────────────────────────────────────
async function refreshDash() {
  const icon = document.getElementById('refreshIcon');
  if (icon) icon.style.animation = 'spin 0.8s linear infinite';
  try {
    const [s, p, sc, a, inv] = await Promise.all([
      fetch('/api/dashboard/summary').then(r=>r.json()),
      fetch('/api/dashboard/production').then(r=>r.json()),
      fetch('/api/dashboard/schedule').then(r=>r.json()),
      fetch('/api/dashboard/alerts').then(r=>r.json()),
      fetch('/api/dashboard/inventory').then(r=>r.json()),
    ]);
    showToast('Dashboard refreshed','success');
  } catch(e) { showToast('Refresh failed','error'); }
  finally { if(icon) icon.style.animation=''; }
}
