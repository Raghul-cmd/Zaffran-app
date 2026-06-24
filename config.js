// ─────────────────────────────────────────────────────────────────
//  config.js  –  Replace ALL placeholder values before deploying
// ─────────────────────────────────────────────────────────────────

const CONFIG = {
  // ── Supabase ────────────────────────────────────────────────────
  // Find these in: Supabase Dashboard → Project → Settings → API
  SUPABASE_URL:    'https://ywhavoktfrzrjqslijok.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3aGF2b2t0ZnJ6cmpxc2xpam9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTA3MjAsImV4cCI6MjA5Nzg2NjcyMH0.lV3JfQkQq5oeOY04hu9XTIc7JtMexbB99Tlt5YYwC4s',

  // ── Razorpay ────────────────────────────────────────────────────
  // Find this in: Razorpay Dashboard → Settings → API Keys
  // Use TEST key (rzp_test_...) while developing
  RAZORPAY_KEY_ID: 'rzp_test_T5QUkATQYjB7Cc',

  // ── Restaurant info (shown in Razorpay checkout) ────────────────
  RESTAURANT_NAME: 'Zaffran Modern Kitchen',
  RESTAURANT_COLOR: '#c4541a',   // ember
};
