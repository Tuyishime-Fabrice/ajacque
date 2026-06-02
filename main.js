/* ═══════════════════════════════════════════════════════════
   AJACQUE FUNERAL SERVICES — main.js
═══════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────
let cart = [];
let currentProduct = null;
let slideIndex = 0;

// ── Supabase Config ──────────────────────────────────────
const SUPABASE_URL    = 'https://fxcwywpapoqbanzyubqo.supabase.co';
const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4Y3d5d3BhcG9xYmFuenl1YnFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MjgyODUsImV4cCI6MjA5NDQwNDI4NX0.3DooQKXD0epe-B5dSM_1Jm18Gzrd-UgzyGiEUo4lw54';

// Thin fetch wrapper — no SDK needed
async function sbFetch(path, opts = {}) {
  const res = await fetch(SUPABASE_URL + path, {
    ...opts,
    headers: {
      'apikey':        SUPABASE_ANON,
      'Authorization': 'Bearer ' + SUPABASE_ANON,
      'Content-Type':  'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    console.error('Supabase error', res.status, await res.text());
    return [];
  }
  return res.json();
}

// Fetch all products from Supabase, newest first
async function getProducts() {
  const rows = await sbFetch('/rest/v1/products?select=*&order=created_at.desc');
  return Array.isArray(rows) ? rows : [];
}

// Keep MSG_KEY for contact messages (still localStorage for now)
const MSG_KEY = 'ajacque_messages';

// ── Mobile Menu ──────────────────────────────────────────
function toggleMobileMenu() {
  const menu   = document.getElementById('mobile-menu');
  const toggle = document.getElementById('nav-toggle');
  if (!menu) return;
  const open = menu.classList.toggle('open');
  if (toggle) toggle.classList.toggle('active', open);
}

function closeMobileMenu() {
  const menu   = document.getElementById('mobile-menu');
  const toggle = document.getElementById('nav-toggle');
  if (menu)   menu.classList.remove('open');
  if (toggle) toggle.classList.remove('active');
}

// Navigate from the mobile menu, then close it
function navGo(id) {
  closeMobileMenu();
  showPage(id);
}

// ── Page Router ──────────────────────────────────────────
async function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) {
    page.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // Update nav active state
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const navEl = document.getElementById('nav-' + id);
  if (navEl) navEl.classList.add('active');

  // Render content on demand
  if (id === 'shop')   await renderShop();
  if (id === 'home')   await renderFeatured();
  triggerReveal();
}

// ── Animated Headline Word ───────────────────────────────
const words = ['dignity', 'grace', 'respect', 'peace', 'honour'];
let wordIndex = 0;

function changeWord() {
  const el = document.getElementById('animated-word');
  if (!el) return;
  el.classList.add('fade-out');
  setTimeout(() => {
    wordIndex = (wordIndex + 1) % words.length;
    el.textContent = words[wordIndex];
    el.classList.remove('fade-out');
    el.classList.add('fade-in');
    setTimeout(() => el.classList.remove('fade-in'), 400);
  }, 400);
}
setInterval(changeWord, 3200);

// ── Scroll Reveal ────────────────────────────────────────
function triggerReveal() {
  setTimeout(() => {
    const els = document.querySelectorAll('.reveal:not(.visible)');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => observer.observe(el));
  }, 50);
}

// ── Featured Products (Home) ─────────────────────────────
async function renderFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px 0;font-family:'Cormorant Garamond',serif;font-size:20px;font-style:italic;color:var(--gray);">Loading collection…</div>`;

  const products = await getProducts();

  if (!products.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:48px 0;">
        <p style="font-family:'Cormorant Garamond',serif; font-size:22px; font-style:italic; color:var(--gray);">
          Our collection is being curated — check back soon.
        </p>
      </div>`;
    return;
  }

  const featured = products;
  _productCache = products;
  grid.innerHTML = featured.map((p, i) => productCardHTML(p, i)).join('');
}

// ── Shop Page ────────────────────────────────────────────
async function renderShop(filter = '') {
  const grid  = document.getElementById('product-grid');
  const empty = document.getElementById('shop-empty');
  const count = document.getElementById('shop-count');
  if (!grid) return;

  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 0;font-family:'Cormorant Garamond',serif;font-size:20px;font-style:italic;color:var(--gray);">Loading…</div>`;

  let products = await getProducts();

  if (filter) {
    products = products.filter(p =>
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      (p.desc || p.description || '').toLowerCase().includes(filter.toLowerCase())
    );
  }

  const sort = document.getElementById('shop-sort');
  if (sort) {
    if (sort.value === 'name') {
      products = [...products].sort((a,b) => a.name.localeCompare(b.name));
    } else if (sort.value === 'newest') {
      products = [...products]; // already ordered newest first from DB
    }
  }

  if (count) count.textContent = products.length + ' product' + (products.length !== 1 ? 's' : '');

  if (!products.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  _productCache = products;
  grid.innerHTML = products.map((p, i) => productCardHTML(p, i)).join('');
}

// ── Product Card HTML ────────────────────────────────────
function productCardHTML(p, i) {
  // Support both old (imgs/desc) and Supabase (images/description) field names
  const imgList = p.images || p.imgs || [];
  const desc    = p.description || p.desc || 'Crafted with premium materials and meticulous care.';
  const thumb   = imgList[0]
    ? `<img src="${imgList[0]}" alt="${p.name}" loading="lazy">`
    : `<div class="pc-no-img" style="height:200px;display:flex;align-items:center;justify-content:center;font-size:40px;color:var(--cream4);">⚰</div>`;

  return `
    <div class="product-card reveal" onclick="openModalById('${p.id}')">
      <div class="pc-img">
        ${thumb}
        <div class="pc-badge">In Stock</div>
      </div>
      <div class="pc-body">
        <div class="pc-name">${p.name}</div>
        <div class="pc-price">${p.price}</div>
        <div class="pc-desc">${desc}</div>
        <div class="pc-footer">
          <span class="pc-view">View Details →</span>
          <button class="pc-cart-mini" onclick="event.stopPropagation();quickAdd('${p.id}')" title="Add to cart">+</button>
        </div>
      </div>
    </div>`;
}

// ── Product Modal ────────────────────────────────────────
// Cache of all products loaded for current view (set by render functions)
let _productCache = [];

async function openModalById(id) {
  // Try cache first; fallback to fresh fetch
  let p = _productCache.find(x => String(x.id) === String(id));
  if (!p) {
    const rows = await sbFetch(`/rest/v1/products?id=eq.${id}&select=*`);
    p = rows[0];
  }
  if (!p) return;
  _openModal(p);
}

function _openModal(p) {
  currentProduct = p;
  slideIndex = 0;

  const imgList = p.images || p.imgs || [];
  const desc    = p.description || p.desc || 'No description provided.';

  document.getElementById('modal-name').textContent  = p.name;
  document.getElementById('modal-price').textContent = p.price;
  document.getElementById('modal-desc').textContent  = desc;

  const wa    = (p.whatsapp || p.wa || '250788871345').replace(/\D/g,'');
  const waMsg = encodeURIComponent(`Hello Ajacque Funeral Services,\n\nI am interested in: ${p.name} (${p.price})\n\nPlease assist.`);
  document.getElementById('modal-wa').href   = `https://wa.me/${wa}?text=${waMsg}`;
  document.getElementById('modal-call').href = `tel:${p.phone || p.tel || '+250788871345'}`;

  const slides = document.getElementById('modal-slides');
  const imgs   = imgList.filter(Boolean);

  if (!imgs.length) {
    slides.innerHTML = `<div class="slide active"><div class="slide-no-img">⚰</div></div>`;
  } else {
    slides.innerHTML = imgs.map((src, idx) => `
      <div class="slide ${idx === 0 ? 'active' : ''}">
        <img src="${src}" alt="${p.name} ${idx+1}">
      </div>`).join('');

    if (imgs.length > 1) {
      slides.innerHTML += `
        <button class="slide-prev" onclick="moveSlide(-1)">&#8249;</button>
        <button class="slide-next" onclick="moveSlide(1)">&#8250;</button>
        <div class="slide-arrows">
          ${imgs.map((_,idx) => `<button class="slide-dot ${idx===0?'active':''}" onclick="goSlide(${idx})"></button>`).join('')}
        </div>`;
    }
  }

  slides.innerHTML += `<button class="modal-close" onclick="closeModalDirect()">&#10005;</button>`;

  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function moveSlide(dir) {
  const slides = document.querySelectorAll('#modal-slides .slide');
  const dots   = document.querySelectorAll('#modal-slides .slide-dot');
  slides[slideIndex].classList.remove('active');
  if (dots[slideIndex]) dots[slideIndex].classList.remove('active');
  slideIndex = (slideIndex + dir + slides.length) % slides.length;
  slides[slideIndex].classList.add('active');
  if (dots[slideIndex]) dots[slideIndex].classList.add('active');
}

function goSlide(i) {
  const slides = document.querySelectorAll('#modal-slides .slide');
  const dots   = document.querySelectorAll('#modal-slides .slide-dot');
  slides[slideIndex].classList.remove('active');
  if (dots[slideIndex]) dots[slideIndex].classList.remove('active');
  slideIndex = i;
  slides[slideIndex].classList.add('active');
  if (dots[slideIndex]) dots[slideIndex].classList.add('active');
}

function closeModal(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModalDirect();
}

function closeModalDirect() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── Cart ─────────────────────────────────────────────────
function addToCartFromModal() {
  if (!currentProduct) return;
  cart.push({ ...currentProduct });
  updateCartCount();
  closeModalDirect();
  openCart();
}

async function quickAdd(id) {
  let p = _productCache.find(x => String(x.id) === String(id));
  if (!p) {
    const rows = await sbFetch(`/rest/v1/products?id=eq.${id}&select=*`);
    p = rows[0];
  }
  if (p) {
    cart.push({ ...p });
    updateCartCount();
    openCart();
  }
}

function updateCartCount() {
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = cart.length;
  });
}

function openCart() {
  renderCart();
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const foot      = document.getElementById('cart-foot');
  if (!container || !foot) return;

  if (!cart.length) {
    container.innerHTML = `<div class="cart-empty-msg"><p>Your cart is empty.</p></div>`;
    foot.style.display = 'none';
    return;
  }

  container.innerHTML = cart.map((p, i) => {
    const imgList = p.images || p.imgs || [];
    const thumb = imgList[0]
      ? `<img class="cart-item-img" src="${imgList[0]}" alt="${p.name}">`
      : `<div class="cart-item-img-empty">⚰</div>`;
    return `
      <div class="cart-item">
        ${thumb}
        <div style="flex:1; min-width:0;">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">${p.price}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${i})">&#10005;</button>
      </div>`;
  }).join('');

  foot.style.display = 'block';
  document.getElementById('cart-total-val').textContent =
    cart.length + ' item' + (cart.length !== 1 ? 's' : '') + ' — contact for total';
}

function removeFromCart(i) {
  cart.splice(i, 1);
  updateCartCount();
  renderCart();
}

function cartCheckout() {
  if (!cart.length) return;
  const lines = cart.map(p => `• ${p.name} (${p.price})`).join('\n');
  const msg   = encodeURIComponent(`Hello Ajacque Funeral Services,\n\nI would like to order:\n${lines}\n\nPlease assist.`);
  const wa    = ((cart[0].whatsapp || cart[0].wa || '250788871345')).replace(/\D/g, '');
  window.open(`https://wa.me/${wa}?text=${msg}`, '_blank');
}

// ── Contact Form ─────────────────────────────────────────
function submitContact() {
  const name    = document.getElementById('c-name')?.value?.trim() || '';
  const phone   = document.getElementById('c-phone')?.value?.trim() || '';
  const email   = document.getElementById('c-email')?.value?.trim() || '';
  const message = document.getElementById('c-message')?.value?.trim() || '';

  if (!name || !message) {
    alert('Please fill in your name and message.');
    return;
  }

  // Store to localStorage
  const msgs = JSON.parse(localStorage.getItem(MSG_KEY) || '[]');
  msgs.push({ name, phone, email, message, date: new Date().toISOString() });
  localStorage.setItem(MSG_KEY, JSON.stringify(msgs));

  const success = document.getElementById('c-success');
  if (success) success.style.display = 'block';

  // Clear fields
  ['c-name','c-phone','c-email','c-message'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ── FAQ Accordion ────────────────────────────────────────
function toggleFaq(el) {
  const item = el.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  // Close all
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  // Open clicked if it was closed
  if (!isOpen) item.classList.add('open');
}

// ── Year ─────────────────────────────────────────────────
document.querySelectorAll('.yr').forEach(el => {
  el.textContent = new Date().getFullYear();
});

// ── Shop Search/Sort ─────────────────────────────────────
function shopSearch(val) { renderShop(val); }
function shopSort()      { renderShop(document.getElementById('shop-search')?.value || ''); }

// ── Init ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  showPage('home');
  updateCartCount();
  triggerReveal();
});
