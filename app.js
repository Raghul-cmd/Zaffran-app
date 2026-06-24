/* ─────────────────────────────────────────────────────────────────
   app.js  –  Zaffran Restaurant App
   Depends on: config.js (CONFIG), @supabase/supabase-js, Razorpay SDK
   ───────────────────────────────────────────────────────────────── */

'use strict';

// ── 1. SUPABASE CLIENT ────────────────────────────────────────────
const { createClient } = window.supabase;
const db = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// ── 2. STATIC FALLBACK MENU (used if Supabase not connected) ──────
const FALLBACK_MENU = [
  { id:1, name:'Gilafi Seekh Kebab',  category:'starters', price:380, description:'Hand-pounded lamb mince, green chilli, fresh coriander, grilled over charcoal.', emoji:'🥩', veg:false },
  { id:2, name:'Paneer Tikka',        category:'starters', price:320, description:'Thick-cut cottage cheese marinated in hung curd, ajwain and smoked paprika.', emoji:'🧀', veg:true },
  { id:3, name:'Crispy Vegetable Samosa', category:'starters', price:180, description:'Three per plate. Spiced potato-pea filling, mint-tamarind chutney.', emoji:'🫓', veg:true },
  { id:4, name:'Dal Makhani',         category:'mains',    price:360, description:'Slow-cooked overnight. Whole black lentils, tomato, butter, cream.', emoji:'🍲', veg:true },
  { id:5, name:'Rogan Josh',          category:'mains',    price:520, description:'Kashmiri-style lamb in aromatic red gravy. Slow-cooked for four hours.', emoji:'🍛', veg:false },
  { id:6, name:'Butter Chicken',      category:'mains',    price:480, description:'The original. Tandoor-roasted chicken in a velvety tomato-cream sauce.', emoji:'🍗', veg:false },
  { id:7, name:'Saag Paneer',         category:'mains',    price:340, description:'Mustard greens, spinach, fresh cottage cheese, ginger, whole spices.', emoji:'🌿', veg:true },
  { id:8, name:'Prawn Masala',        category:'mains',    price:620, description:'Jumbo prawns in a coastal-style coconut tomato curry. Malabar pepper finish.', emoji:'🦐', veg:false },
  { id:9, name:'Garlic Naan',         category:'breads',   price:80,  description:'Stone-fired. Brushed with cultured butter and roasted garlic.', emoji:'🫓', veg:true },
  { id:10,name:'Laccha Paratha',      category:'breads',   price:90,  description:'Layered, flaky whole-wheat bread from the tandoor.', emoji:'🫓', veg:true },
  { id:11,name:'Peshwari Naan',       category:'breads',   price:110, description:'Sweet bread filled with almond, coconut and sultana paste.', emoji:'🫓', veg:true },
  { id:12,name:'Gulab Jamun',         category:'desserts', price:160, description:'Three pieces. Cardamom-scented rose syrup. Served warm.', emoji:'🍮', veg:true },
  { id:13,name:'Kulfi Falooda',       category:'desserts', price:200, description:'Pistachio kulfi, rose milk, basil seeds, vermicelli.', emoji:'🍨', veg:true },
  { id:14,name:'Saffron Phirni',      category:'desserts', price:180, description:'Slow-set ground rice pudding with Kashmiri saffron.', emoji:'🍮', veg:true },
  { id:15,name:'Mango Lassi',         category:'drinks',   price:140, description:'Alphonso mango, whole-milk yogurt, pinch of cardamom.', emoji:'🥭', veg:true },
  { id:16,name:'Masala Chai',         category:'drinks',   price:80,  description:'The real kind. Loose-leaf Assam, whole spices, full-fat milk.', emoji:'☕', veg:true },
  { id:17,name:'Rose Sharbat',        category:'drinks',   price:120, description:'House-made rose cordial with cold milk and sabja seeds.', emoji:'🌹', veg:true },
];

// ── 3. STATE ──────────────────────────────────────────────────────
let menuItems = [];
let cart      = {};    // { itemId: { item, qty } }
let activeCategory = 'all';

// ── 4. DOM REFS ───────────────────────────────────────────────────
const menuGrid   = document.getElementById('menuGrid');
const cartBtn    = document.getElementById('cartBtn');
const cartCount  = document.getElementById('cartCount');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay= document.getElementById('cartOverlay');
const cartClose  = document.getElementById('cartClose');
const cartItemsEl= document.getElementById('cartItems');
const cartFooter = document.getElementById('cartFooter');
const navbar     = document.getElementById('navbar');
const toast      = document.getElementById('toast');

// ── 5. INIT ───────────────────────────────────────────────────────
(async function init() {
  setupNav();
  setupCategoryTabs();
  setupCartUI();
  setupReservationForm();
  await loadMenu();
})();

// ── 6. NAV SCROLL ─────────────────────────────────────────────────
function setupNav() {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });
}

// ── 7. LOAD MENU ──────────────────────────────────────────────────
async function loadMenu() {
  menuGrid.innerHTML = '<p class="menu-loading">Loading menu…</p>';
  try {
    const { data, error } = await db.from('menu_items').select('*').order('category');
    if (error) throw error;
    menuItems = (data && data.length) ? data : FALLBACK_MENU;
  } catch {
    // Supabase not configured → use built-in menu
    menuItems = FALLBACK_MENU;
  }
  renderMenu();
}

// ── 8. RENDER MENU ────────────────────────────────────────────────
function renderMenu() {
  const filtered = activeCategory === 'all'
    ? menuItems
    : menuItems.filter(i => i.category === activeCategory);

  if (!filtered.length) {
    menuGrid.innerHTML = '<p class="menu-loading">Nothing here yet.</p>';
    return;
  }

  menuGrid.innerHTML = filtered.map(item => {
    const inCart = cart[item.id]?.qty > 0;
    const vegEl = item.veg !== false
      ? `<span class="menu-card-veg veg" title="Vegetarian">▲</span>`
      : `<span class="menu-card-veg non-veg" title="Non-vegetarian">▼</span>`;
    const imgEl = item.image_url
      ? `<img class="menu-card-img" src="${item.image_url}" alt="${item.name}" loading="lazy" />`
      : `<div class="menu-card-img-placeholder">${item.emoji || '🍽️'}</div>`;
    return `
      <div class="menu-card" data-id="${item.id}">
        ${imgEl}
        <div class="menu-card-body">
          <p class="menu-card-cat">${item.category}</p>
          <h3 class="menu-card-name">${item.name}</h3>
          <p class="menu-card-desc">${item.description}</p>
          <div class="menu-card-footer">
            <span class="menu-card-price">${vegEl}₹${item.price}</span>
            <button class="add-to-cart ${inCart ? 'in-cart' : ''}"
              data-id="${item.id}">
              ${inCart ? '✓ Added' : '+ Add'}
            </button>
          </div>
        </div>
      </div>`;
  }).join('');

  // Attach add-to-cart listeners
  menuGrid.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => addToCart(+btn.dataset.id));
  });
}

// ── 9. CATEGORY TABS ──────────────────────────────────────────────
function setupCategoryTabs() {
  document.getElementById('categoryTabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeCategory = tab.dataset.cat;
    renderMenu();
  });
}

// ── 10. CART ──────────────────────────────────────────────────────
function addToCart(id) {
  const item = menuItems.find(i => i.id === id);
  if (!item) return;
  if (cart[id]) {
    cart[id].qty++;
  } else {
    cart[id] = { item, qty: 1 };
  }
  updateCartUI();
  renderMenu();
  showToast(`${item.name} added to order`);
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty += delta;
  if (cart[id].qty <= 0) delete cart[id];
  updateCartUI();
  renderMenu();
}

function updateCartUI() {
  const entries  = Object.values(cart);
  const totalQty = entries.reduce((s, e) => s + e.qty, 0);
  cartCount.textContent = totalQty;

  if (!entries.length) {
    cartItemsEl.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    cartFooter.style.display = 'none';
    return;
  }

  cartItemsEl.innerHTML = entries.map(({ item, qty }) => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${item.price} × ${qty} = ₹${item.price * qty}</div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
        <span class="qty-val">${qty}</span>
        <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
      </div>
    </div>`).join('');

  cartItemsEl.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => changeQty(+btn.dataset.id, +btn.dataset.delta));
  });

  const subtotal = entries.reduce((s, { item, qty }) => s + item.price * qty, 0);
  const tax      = Math.round(subtotal * 0.05);
  const total    = subtotal + tax;

  document.getElementById('cartSubtotal').textContent = `₹${subtotal}`;
  document.getElementById('cartTax').textContent      = `₹${tax}`;
  document.getElementById('cartTotal').textContent    = `₹${total}`;
  cartFooter.style.display = 'block';
}

// ── 11. CART DRAWER TOGGLE ────────────────────────────────────────
function setupCartUI() {
  cartBtn.addEventListener('click', openCart);
  cartClose.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);
  document.getElementById('checkoutBtn').addEventListener('click', startCheckout);
}
function openCart()  { cartDrawer.classList.add('open'); cartOverlay.classList.add('open'); }
function closeCart() { cartDrawer.classList.remove('open'); cartOverlay.classList.remove('open'); }

// ── 12. RAZORPAY CHECKOUT ─────────────────────────────────────────
async function startCheckout() {
  const entries = Object.values(cart);
  if (!entries.length) return showToast('Your cart is empty');

  const name  = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const addr  = document.getElementById('deliveryAddr').value.trim();

  if (!name)  return showToast('Please enter your name');
  if (!phone) return showToast('Please enter your phone number');
  if (!addr)  return showToast('Please enter a delivery address');

  const subtotal = entries.reduce((s, { item, qty }) => s + item.price * qty, 0);
  const tax      = Math.round(subtotal * 0.05);
  const total    = subtotal + tax;

  // Save order to Supabase first
  let orderId = `ORD-${Date.now()}`;
  try {
    const { data, error } = await db.from('orders').insert({
      customer_name:  name,
      customer_phone: phone,
      delivery_address: addr,
      items: entries.map(({ item, qty }) => ({ id: item.id, name: item.name, qty, price: item.price })),
      subtotal,
      tax,
      total,
      status: 'pending',
    }).select().single();
    if (!error && data) orderId = data.id;
  } catch { /* Supabase not configured — continue with local ID */ }

  // Open Razorpay
  const options = {
    key:         CONFIG.RAZORPAY_KEY_ID,
    amount:      total * 100,   // paise
    currency:    'INR',
    name:        CONFIG.RESTAURANT_NAME,
    description: `Order #${orderId}`,
    prefill: {
      name:    name,
      contact: phone,
    },
    theme: { color: CONFIG.RESTAURANT_COLOR },
    handler: async function (response) {
      // Payment success — update order in Supabase
      try {
        await db.from('orders').update({
          razorpay_payment_id: response.razorpay_payment_id,
          status: 'paid',
        }).eq('id', orderId);
      } catch { /* ignore if Supabase not configured */ }

      cart = {};
      updateCartUI();
      renderMenu();
      closeCart();
      showToast('🎉 Order placed! We\'ll start cooking right away.');
    },
    modal: {
      ondismiss: () => showToast('Payment cancelled. Your cart is still saved.'),
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}

// ── 13. RESERVATION FORM ──────────────────────────────────────────
function setupReservationForm() {
  // Set min date to today
  const dateInput = document.getElementById('resDate');
  dateInput.min = new Date().toISOString().split('T')[0];

  document.getElementById('reserveBtn').addEventListener('click', async () => {
    const name   = document.getElementById('resName').value.trim();
    const phone  = document.getElementById('resPhone').value.trim();
    const date   = document.getElementById('resDate').value;
    const time   = document.getElementById('resTime').value;
    const guests = document.getElementById('resGuests').value;
    const msg    = document.getElementById('resMsg');

    if (!name || !phone || !date) {
      msg.style.color = '#e05555';
      msg.textContent = 'Please fill in name, phone and date.';
      return;
    }

    const btn = document.getElementById('reserveBtn');
    btn.textContent = 'Confirming…';
    btn.disabled    = true;

    try {
      const { error } = await db.from('reservations').insert({
        customer_name: name, phone, date, time, guests: +guests || guests,
      });
      if (error) throw error;
      msg.style.color = '#7ac96f';
      msg.textContent = `✓ Reserved for ${name} on ${date} at ${time} for ${guests} guest${guests > 1 ? 's' : ''}.`;
      ['resName','resPhone','resDate'].forEach(id => document.getElementById(id).value = '');
    } catch {
      // Supabase not configured — show confirmation anyway (demo mode)
      msg.style.color = '#7ac96f';
      msg.textContent = `✓ Reservation request received! We'll confirm via WhatsApp soon.`;
    }

    btn.textContent = 'Confirm Reservation';
    btn.disabled    = false;
  });
}

// ── 14. TOAST ─────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
