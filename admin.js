/* ─────────────────────────────────────────────────────────
   admin.js  –  Zaffran Admin Dashboard
   Requires: config.js, @supabase/supabase-js
   ───────────────────────────────────────────────────────── */

'use strict';

// ── SUPABASE ──────────────────────────────────────────────
const { createClient } = window.supabase;
const db = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// ── STATE ─────────────────────────────────────────────────
let currentPage     = 'overview';
let orderFilter     = 'all';
let allOrders       = [];
let allMenu         = [];
let allReservations = [];

// ── INIT ──────────────────────────────────────────────────
(async function init() {
  setDate();
  await checkAuth();
  setupSidebar();
  setupOrderFilters();
  setupMenuForm();
  setupLoginForm();
})();

// ── DATE ──────────────────────────────────────────────────
function setDate() {
  document.getElementById('pageDate').textContent =
    new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// ── AUTH ──────────────────────────────────────────────────
async function checkAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (session) showDashboard(session.user);
}

function setupLoginForm() {
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl    = document.getElementById('loginErr');
    const btn      = document.getElementById('loginBtn');

    if (!email || !password) { errEl.textContent = 'Enter email and password.'; return; }

    btn.textContent = 'Signing in…';
    btn.disabled    = true;

    const { data, error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
      errEl.textContent = error.message;
      btn.textContent = 'Sign In';
      btn.disabled    = false;
      return;
    }
    showDashboard(data.user);
  });

  // Allow Enter key
  document.getElementById('loginPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
  });
}

function showDashboard(user) {
  document.getElementById('loginScreen').style.display  = 'none';
  document.getElementById('dashboard').style.display    = 'flex';
  document.getElementById('adminEmail').textContent     = user.email;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await db.auth.signOut();
    location.reload();
  });

  loadPage('overview');
}

// ── SIDEBAR NAV ───────────────────────────────────────────
function setupSidebar() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadPage(btn.dataset.page);
    });
  });
}

function loadPage(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.getElementById('pageTitle').textContent =
    { overview:'Overview', orders:'Orders', menu:'Menu', reservations:'Reservations' }[page];

  if (page === 'overview')     loadOverview();
  if (page === 'orders')       loadOrders();
  if (page === 'menu')         loadMenuAdmin();
  if (page === 'reservations') loadReservations();
}

// ── OVERVIEW ──────────────────────────────────────────────
async function loadOverview() {
  const today = new Date().toISOString().split('T')[0];

  // Fetch in parallel
  const [{ data: orders }, { data: menu }, { data: reservations }] = await Promise.all([
    db.from('orders').select('*').order('created_at', { ascending: false }),
    db.from('menu_items').select('id').eq('available', true),
    db.from('reservations').select('*').eq('date', today).eq('status', 'pending'),
  ]);

  const todayOrders = (orders || []).filter(o => o.created_at?.startsWith(today));
  const revenue     = todayOrders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.total || 0), 0);

  document.getElementById('stat-orders').textContent  = todayOrders.length;
  document.getElementById('stat-revenue').textContent = `₹${revenue.toLocaleString('en-IN')}`;
  document.getElementById('stat-res').textContent     = (reservations || []).length;
  document.getElementById('stat-menu').textContent    = (menu || []).length;

  allOrders = orders || [];
  renderRecentOrders(allOrders.slice(0, 8));
}

function renderRecentOrders(orders) {
  const el = document.getElementById('recentOrdersList');
  if (!orders.length) { el.innerHTML = '<div class="empty-state">No orders yet today.</div>'; return; }

  el.innerHTML = `
    <table class="data-table">
      <thead><tr>
        <th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Time</th>
      </tr></thead>
      <tbody>${orders.map(o => orderRow(o)).join('')}</tbody>
    </table>`;
}

// ── ORDERS ────────────────────────────────────────────────
async function loadOrders() {
  const { data } = await db.from('orders').select('*').order('created_at', { ascending: false });
  allOrders = data || [];
  renderOrders();
}

function renderOrders() {
  const filtered = orderFilter === 'all' ? allOrders : allOrders.filter(o => o.status === orderFilter);
  const el = document.getElementById('ordersList');

  if (!filtered.length) { el.innerHTML = '<div class="empty-state">No orders found.</div>'; return; }

  el.innerHTML = `
    <table class="data-table">
      <thead><tr>
        <th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Time</th>
      </tr></thead>
      <tbody>${filtered.map(o => orderRow(o, true)).join('')}</tbody>
    </table>`;

  // Status change listeners
  el.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', () => updateOrderStatus(sel.dataset.id, sel.value));
  });
}

function orderRow(o, editable = false) {
  const items   = Array.isArray(o.items) ? o.items.map(i => `${i.name} ×${i.qty}`).join(', ') : '—';
  const time    = o.created_at ? new Date(o.created_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '—';
  const shortId = String(o.id).substring(0, 8) + '…';
  const statusEl = editable
    ? `<select class="status-select" data-id="${o.id}">
        ${['pending','paid','preparing','delivered'].map(s =>
          `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
       </select>`
    : `<span class="badge badge-${o.status}">${o.status}</span>`;

  return `<tr>
    <td><code style="font-size:.75rem;color:#888">${shortId}</code></td>
    <td>${o.customer_name || '—'}<br><span style="font-size:.75rem;color:#666">${o.customer_phone || ''}</span></td>
    <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${items}</td>
    <td style="font-family:'DM Mono',monospace;color:var(--gold)">₹${(o.total||0).toLocaleString('en-IN')}</td>
    <td>${statusEl}</td>
    <td style="font-size:.78rem;color:#666">${time}</td>
  </tr>`;
}

async function updateOrderStatus(id, status) {
  const { error } = await db.from('orders').update({ status }).eq('id', id);
  if (error) showToast('Failed to update status');
  else showToast(`Order marked as ${status}`);
}

function setupOrderFilters() {
  document.getElementById('orderFilterTabs').addEventListener('click', e => {
    const tab = e.target.closest('.ftab');
    if (!tab) return;
    document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    orderFilter = tab.dataset.status;
    renderOrders();
  });
}

// ── MENU ADMIN ────────────────────────────────────────────
async function loadMenuAdmin() {
  const { data } = await db.from('menu_items').select('*').order('category');
  allMenu = data || [];
  renderMenuList();
}

function renderMenuList() {
  const el = document.getElementById('menuList');
  if (!allMenu.length) { el.innerHTML = '<div class="empty-state">No dishes yet. Add your first dish above.</div>'; return; }

  el.innerHTML = allMenu.map(item => {
    const imgEl = item.image_url
      ? `<div class="menu-row-img"><img src="${item.image_url}" alt="${item.name}" /></div>`
      : `<div class="menu-row-img">${item.emoji || '🍽️'}</div>`;
    const vegDot = `<span class="veg-dot ${item.veg!==false?'veg':'non'}"></span>`;
    return `
      <div class="menu-row">
        ${imgEl}
        <div class="menu-row-info">
          <div class="menu-row-name">${vegDot}${item.name}</div>
          <div class="menu-row-meta">${item.category} · ${item.description?.substring(0,60)}…</div>
        </div>
        <div class="menu-row-price">₹${item.price}</div>
        <div class="menu-row-actions">
          <button class="action-btn" data-edit="${item.id}">Edit</button>
          <button class="action-btn del" data-del="${item.id}">Delete</button>
        </div>
      </div>`;
  }).join('');

  // ── attach edit / delete listeners after rendering ──
  el.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openEditForm(btn.dataset.edit));
  });
  el.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => deleteDish(btn.dataset.del));
  });
}

function setupMenuForm() {
  document.getElementById('addDishBtn').addEventListener('click', () => {
    clearDishForm();
    document.getElementById('dishFormTitle').textContent = 'Add New Dish';
    document.getElementById('dishFormCard').style.display = 'block';
    document.getElementById('dishFormCard').scrollIntoView({ behavior:'smooth' });
  });

  document.getElementById('closeDishForm').addEventListener('click', hideDishForm);
  document.getElementById('cancelDishBtn').addEventListener('click', hideDishForm);

  document.getElementById('saveDishBtn').addEventListener('click', saveDish);
}

function clearDishForm() {
  document.getElementById('editDishId').value  = '';
  document.getElementById('dishName').value    = '';
  document.getElementById('dishPrice').value   = '';
  document.getElementById('dishDesc').value    = '';
  document.getElementById('dishImage').value   = '';
  document.getElementById('dishCategory').value = 'mains';
  document.getElementById('dishVeg').value      = 'true';
}

function openEditForm(id) {
  const item = allMenu.find(i => String(i.id) === String(id));
  if (!item) return;
  document.getElementById('dishFormTitle').textContent = 'Edit Dish';
  document.getElementById('editDishId').value  = item.id;
  document.getElementById('dishName').value    = item.name;
  document.getElementById('dishPrice').value   = item.price;
  document.getElementById('dishDesc').value    = item.description || '';
  document.getElementById('dishImage').value   = item.image_url || '';
  document.getElementById('dishCategory').value = item.category;
  document.getElementById('dishVeg').value      = String(item.veg !== false);
  document.getElementById('dishFormCard').style.display = 'block';
  document.getElementById('dishFormCard').scrollIntoView({ behavior:'smooth' });
}

function hideDishForm() {
  document.getElementById('dishFormCard').style.display = 'none';
  clearDishForm();
}

async function saveDish() {
  const id    = document.getElementById('editDishId').value;
  const name  = document.getElementById('dishName').value.trim();
  const price = +document.getElementById('dishPrice').value;
  const desc  = document.getElementById('dishDesc').value.trim();
  const image = document.getElementById('dishImage').value.trim();
  const cat   = document.getElementById('dishCategory').value;
  const veg   = document.getElementById('dishVeg').value === 'true';

  if (!name || !price) { showToast('Name and price are required'); return; }

  const payload = { name, price, description: desc, image_url: image || null, category: cat, veg, available: true };

  let error;
  if (id) {
    ({ error } = await db.from('menu_items').update(payload).eq('id', id));
  } else {
    ({ error } = await db.from('menu_items').insert(payload));
  }

  if (error) { showToast('Error saving dish: ' + error.message); return; }

  showToast(id ? 'Dish updated ✓' : 'Dish added ✓');
  hideDishForm();
  loadMenuAdmin();
}

async function deleteDish(id) {
  if (!confirm('Delete this dish? This cannot be undone.')) return;
  const { error } = await db.from('menu_items').delete().eq('id', String(id));
  if (error) { showToast('Error deleting dish'); return; }
  showToast('Dish deleted');
  loadMenuAdmin();
}

// ── RESERVATIONS ──────────────────────────────────────────
async function loadReservations() {
  const { data } = await db.from('reservations').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });
  allReservations = data || [];
  renderReservations();
}

function renderReservations() {
  const el = document.getElementById('reservationsList');
  if (!allReservations.length) { el.innerHTML = '<div class="empty-state">No reservations yet.</div>'; return; }

  el.innerHTML = `
    <table class="data-table">
      <thead><tr>
        <th>Name</th><th>Phone</th><th>Date</th><th>Time</th><th>Guests</th><th>Status</th>
      </tr></thead>
      <tbody>${allReservations.map(r => `
        <tr>
          <td>${r.customer_name || '—'}</td>
          <td>${r.phone || '—'}</td>
          <td>${r.date || '—'}</td>
          <td>${r.time || '—'}</td>
          <td>${r.guests || '—'}</td>
          <td>
            <select class="status-select" data-res-id="${r.id}">
              ${['pending','confirmed','cancelled'].map(s =>
                `<option value="${s}" ${r.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;

  el.querySelectorAll('[data-res-id]').forEach(sel => {
    sel.addEventListener('change', async () => {
      const { error } = await db.from('reservations').update({ status: sel.value }).eq('id', sel.dataset.resId);
      if (error) showToast('Failed to update reservation');
      else showToast(`Reservation marked as ${sel.value}`);
    });
  });
}

// ── TOAST ─────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('adminToast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}
