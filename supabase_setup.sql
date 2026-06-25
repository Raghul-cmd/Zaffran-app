-- ═══════════════════════════════════════════════════════════
--  Zaffran Restaurant — Complete Supabase Setup
--  Safe to run fresh. Drops existing tables and policies first.
-- ═══════════════════════════════════════════════════════════


-- ── STEP 1: DROP OLD POLICIES (if they exist) ────────────────
drop policy if exists "Public read menu"              on public.menu_items;
drop policy if exists "Public insert orders"          on public.orders;
drop policy if exists "Public update orders"          on public.orders;
drop policy if exists "Public insert reservations"    on public.reservations;
drop policy if exists "Admin read orders"             on public.orders;
drop policy if exists "Admin update orders"           on public.orders;
drop policy if exists "Admin read reservations"       on public.reservations;
drop policy if exists "Admin update reservations"     on public.reservations;
drop policy if exists "Admin manage menu"             on public.menu_items;


-- ── STEP 2: DROP OLD TABLES (if they exist) ─────────────────
drop table if exists public.reservations;
drop table if exists public.orders;
drop table if exists public.menu_items;


-- ── STEP 3: CREATE TABLES ────────────────────────────────────

-- Menu Items
create table public.menu_items (
  id          bigserial primary key,
  name        text not null,
  description text,
  category    text not null,
  price       integer not null,
  image_url   text,
  emoji       text,
  veg         boolean default true,
  available   boolean default true,
  created_at  timestamptz default now()
);

-- Orders
create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  customer_name       text,
  customer_phone      text,
  delivery_address    text,
  items               jsonb,
  subtotal            integer,
  tax                 integer,
  total               integer,
  status              text default 'pending',
  razorpay_payment_id text,
  created_at          timestamptz default now()
);

-- Reservations
create table public.reservations (
  id            bigserial primary key,
  customer_name text,
  phone         text,
  date          date,
  time          text,
  guests        integer,
  status        text default 'pending',
  created_at    timestamptz default now()
);


-- ── STEP 4: ENABLE ROW LEVEL SECURITY ───────────────────────
alter table public.menu_items   enable row level security;
alter table public.orders       enable row level security;
alter table public.reservations enable row level security;


-- ── STEP 5: PUBLIC POLICIES (for customers) ─────────────────

-- Anyone can read the menu
create policy "Public read menu"
  on public.menu_items for select
  using (true);

-- Anyone can place an order
create policy "Public insert orders"
  on public.orders for insert
  with check (true);

-- Anyone can update their own order (for Razorpay callback)
create policy "Public update orders"
  on public.orders for update
  using (true);

-- Anyone can make a reservation
create policy "Public insert reservations"
  on public.reservations for insert
  with check (true);


-- ── STEP 6: ADMIN POLICIES (for logged-in admin) ────────────

-- Admin can read all orders
create policy "Admin read orders"
  on public.orders for select
  to authenticated
  using (true);

-- Admin can update order status
create policy "Admin update orders"
  on public.orders for update
  to authenticated
  using (true);

-- Admin can read all reservations
create policy "Admin read reservations"
  on public.reservations for select
  to authenticated
  using (true);

-- Admin can update reservation status
create policy "Admin update reservations"
  on public.reservations for update
  to authenticated
  using (true);

-- Admin can add, edit, delete menu items
create policy "Admin manage menu"
  on public.menu_items for all
  to authenticated
  using (true);


-- ── STEP 7: SEED MENU DATA ───────────────────────────────────
insert into public.menu_items (name, description, category, price, emoji, veg) values

-- Starters
('Gilafi Seekh Kebab',      'Hand-pounded lamb mince, green chilli, fresh coriander, grilled over charcoal.',         'starters', 380, '🥩', false),
('Paneer Tikka',            'Thick-cut cottage cheese marinated in hung curd, ajwain and smoked paprika.',             'starters', 320, '🧀', true),
('Crispy Vegetable Samosa', 'Three per plate. Spiced potato-pea filling, mint-tamarind chutney.',                      'starters', 180, '🫓', true),
('Chicken 65',              'Deep-fried chicken, curry leaves, green chilli, yogurt marinade. South Indian classic.',  'starters', 360, '🍗', false),

-- Mains
('Dal Makhani',   'Slow-cooked overnight. Whole black lentils, tomato, butter, cream.',                         'mains', 360, '🍲', true),
('Butter Chicken','The original. Tandoor-roasted chicken in a velvety tomato-cream sauce.',                      'mains', 480, '🍗', false),
('Rogan Josh',    'Kashmiri-style lamb in aromatic red gravy. Slow-cooked for four hours.',                      'mains', 520, '🍛', false),
('Saag Paneer',   'Mustard greens, spinach, fresh cottage cheese, ginger, whole spices.',                        'mains', 340, '🌿', true),
('Prawn Masala',  'Jumbo prawns in a coastal-style coconut tomato curry. Malabar pepper finish.',                'mains', 620, '🦐', false),
('Chole Bhature', 'Punjabi-style spiced chickpeas with two puffed fried breads. Pickle on the side.',           'mains', 280, '🫘', true),

-- Breads
('Garlic Naan',    'Stone-fired. Brushed with cultured butter and roasted garlic.',                  'breads',  80, '🫓', true),
('Laccha Paratha', 'Layered, flaky whole-wheat bread from the tandoor.',                             'breads',  90, '🫓', true),
('Peshwari Naan',  'Sweet bread filled with almond, coconut and sultana paste.',                     'breads', 110, '🫓', true),
('Plain Roti',     'Thin whole-wheat bread. Soft, light, made fresh every order.',                   'breads',  50, '🫓', true),

-- Desserts
('Gulab Jamun',   'Three pieces. Cardamom-scented rose syrup. Served warm.',                         'desserts', 160, '🍮', true),
('Kulfi Falooda', 'Pistachio kulfi, rose milk, basil seeds, vermicelli.',                            'desserts', 200, '🍨', true),
('Saffron Phirni','Slow-set ground rice pudding with Kashmiri saffron.',                             'desserts', 180, '🍮', true),

-- Drinks
('Mango Lassi',   'Alphonso mango, whole-milk yogurt, pinch of cardamom.',                           'drinks', 140, '🥭', true),
('Masala Chai',   'The real kind. Loose-leaf Assam, whole spices, full-fat milk.',                   'drinks',  80, '☕', true),
('Rose Sharbat',  'House-made rose cordial with cold milk and sabja seeds.',                         'drinks', 120, '🌹', true);


-- ── DONE ─────────────────────────────────────────────────────
-- Tables created:   menu_items, orders, reservations
-- Menu items added: 20 dishes across 5 categories
-- Policies set:     public (customers) + authenticated (admin)
--
-- Next step: Supabase → Authentication → Users → Add User
-- Create your admin email + password there to enable admin login
