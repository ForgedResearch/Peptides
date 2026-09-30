function money(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
function fmt(n) { return '$' + money(n).toFixed(2); }

function getVolumePrice(basePrice, qty) {
  const base = money(basePrice);
  const q = Math.max(1, parseInt(qty, 10) || 1);
  let percentOff = 0;
  let tier = '1-4';
  if (q >= 10) { percentOff = 20; tier = '10+'; }
  else if (q >= 5) { percentOff = 10; tier = '5-9'; }
  const savings = money(base * (percentOff / 100));
  const unitPrice = money(base - savings);
  return { unitPrice, savings, percentOff, tier, base };
}

const products = [
  {
    id: 'glp3r',
    name: 'GLP-3R',
    cat: 'metabolic',
    desc: 'Triple receptor research peptide (GLP-1, GIP, and glucagon). Synthetic 39-amino-acid acylated sequence. Supplied as lyophilized powder for laboratory research only.',
    rating: '4.8 (32)',
    img: 'assets/vial-glp3r.png',
    sizes: [
      { label: '20 mg', price: 107.99 },
      { label: '60 mg', price: 215.99 }
    ]
  },
  {
    id: 'bpc-blend',
    name: 'BPC-157 / TB-500 Blend',
    cat: 'recovery',
    desc: 'Two-peptide research material combining BPC-157 and TB-500. Supplied as lyophilized powder for laboratory research only.',
    rating: '4.7 (21)',
    img: 'assets/vial-bpc-blend.png',
    sizes: [{ label: '20 mg', price: 53.99 }]
  },
  {
    id: 'kpv',
    name: 'KPV',
    cat: 'immune',
    desc: 'Synthetic tripeptide (Lys-Pro-Val), the C-terminal fragment of α-MSH. Supplied as lyophilized powder for laboratory research only.',
    rating: '4.6 (18)',
    img: 'assets/vial-kpv.png',
    sizes: [{ label: '10 mg', price: 32.99 }]
  },
  {
    id: 'bpc157',
    name: 'BPC-157',
    cat: 'recovery',
    desc: 'Synthetic 15-amino-acid peptide fragment related to a human gastric juice protein. Supplied as lyophilized powder for laboratory research only.',
    rating: '4.8 (29)',
    img: 'assets/vial-bpc157.png',
    sizes: [
      { label: '10 mg', price: 32.99 },
      { label: '20 mg', price: 41.99 }
    ]
  }
];

const qtyState = {};
const grid = document.getElementById('productGrid');
let cart = [];
let filter = 'all';

let activeId = null;
let detailSize = 0;

function currentSize(p) {
  if (p.id === activeId) return p.sizes[detailSize] || p.sizes[0];
  return p.sizes[0];
}

function currentQty(id) {
  return qtyState[id] || 1;
}

function volumeRows(base, qty) {
  const tiers = [
    { key: '1-4', label: 'Qty: 1 - 4', sample: 1 },
    { key: '5-9', label: 'Qty: 5 - 9', sample: 5 },
    { key: '10+', label: 'Qty: 10+', sample: 10 }
  ];
  const selected = getVolumePrice(base, qty).tier;
  return tiers.map(t => {
    const p = getVolumePrice(base, t.sample);
    const save = p.percentOff ? ` <span class="save">(save ${fmt(p.savings)})</span>` : '';
    return `<div class="vrow${selected === t.key ? ' active' : ''}"><span>${t.label}</span><span>${fmt(p.unitPrice)} each${save}</span></div>`;
  }).join('');
}

function fromPrice(p) {
  return Math.min(...p.sizes.map(s => s.price));
}

function renderProducts() {
  grid.innerHTML = products.filter(p => filter === 'all' || p.cat === filter).map(p => {
    if (!qtyState[p.id]) qtyState[p.id] = 1;
    return `
      <article class="product" data-id="${p.id}">
        <img class="vial-img" src="${p.img}" alt="${p.name}" />
        <span class="tag">RESEARCH USE ONLY</span>
        <strong>${p.name}</strong>
        <div class="card-desc">${p.desc}</div>
        <div class="row" style="margin-top:auto">
          <strong>${fmt(fromPrice(p))}</strong>
          <button class="btn" type="button" onclick="openProduct('${p.id}')">View</button>
        </div>
      </article>
    `;
  }).join('');
}

function refreshCard(id) {
  const p = products.find(x => x.id === id);
  const size = currentSize(p);
  const qty = currentQty(id);
  const vol = document.getElementById('vol-' + id);
  const qel = document.getElementById('qty-' + id);
  const lel = document.getElementById('line-' + id);
  if (vol) vol.innerHTML = volumeRows(size.price, qty);
  if (qel) qel.textContent = qty;
  if (lel) lel.textContent = fmt(getVolumePrice(size.price, qty).unitPrice * qty);
}

function onSize(id) { refreshCard(id); }

function changeProductQty(id, d) {
  qtyState[id] = Math.max(1, currentQty(id) + d);
  refreshCard(id);
}

document.querySelectorAll('.chip').forEach(chip => {
  chip.onclick = () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filter = chip.dataset.filter;
    renderProducts();
  };
});

function addToCart(id) {
  const item = products.find(p => p.id === id);
  const size = currentSize(item);
  const qty = currentQty(id);
  const priced = getVolumePrice(size.price, qty);
  const cartId = id + '-' + size.label.replace(/\s+/g, '') + '-q' + qty;
  cart.push({
    id: cartId,
    name: item.name,
    size: size.label,
    qty,
    unitPrice: priced.unitPrice,
    price: priced.unitPrice,
    savings: priced.savings,
    tier: priced.tier
  });
  syncCart();
  openCart();
}

function changeQty(id, d) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += d;
  if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
  else {
    const priced = getVolumePrice(item.unitPrice / ((item.tier === '10+') ? 0.8 : item.tier === '5-9' ? 0.9 : 1), item.qty);
  }
  syncCart();
}

function lineBase(c) {
  // recover base from stored unit at add-time is messy; store base on add
  return c.base || c.price;
}

function syncCart() {
  const count = cart.reduce((a, b) => a + b.qty, 0);
  document.getElementById('cartCount').textContent = count;
  const sub = cart.reduce((a, b) => a + b.unitPrice * b.qty, 0);
  document.getElementById('subtotal').textContent = fmt(sub);
  document.getElementById('cartItems').innerHTML = cart.length ? cart.map(c => `
    <div class="cart-line">
      <div>
        <strong>${c.name}</strong>
        <div class="muted">${c.size} · ${c.qty} × ${fmt(c.unitPrice)}</div>
      </div>
      <strong>${fmt(c.unitPrice * c.qty)}</strong>
    </div>
  `).join('') : '<p class="muted">Your cart is empty.</p>';
}

const drawer = document.getElementById('drawer');
const drawerBg = document.getElementById('drawerBg');
const modal = document.getElementById('modal');
function openCart() { drawer.classList.add('open'); drawerBg.classList.add('open'); }
function closeCart() { drawer.classList.remove('open'); drawerBg.classList.remove('open'); }
document.getElementById('cartBtn').onclick = openCart;
document.getElementById('closeCart').onclick = closeCart;
drawerBg.onclick = closeCart;
document.getElementById('checkoutBtn').onclick = () => {
  if (!cart.length) return;
  modal.classList.add('open');
};
document.getElementById('agreeBtn').onclick = () => {
  if (!document.getElementById('agree').checked) {
    alert('Please confirm research-use-only before continuing.');
    return;
  }
  modal.classList.remove('open');
  alert('Demo checkout. Connect Stripe, Shopify, or Snipcart before taking live orders.');
  cart = [];
  syncCart();
  closeCart();
};

const BAC_BASE = 20.99;
let bacQty = 1;

function refreshBac() {
  const p = getVolumePrice(BAC_BASE, bacQty);
  const qel = document.getElementById('bacQty');
  const pel = document.getElementById('bacPrice');
  if (qel) qel.textContent = bacQty;
  if (pel) pel.textContent = fmt(p.unitPrice * bacQty);
}

document.getElementById('bacMinus').onclick = () => {
  bacQty = Math.max(1, bacQty - 1);
  refreshBac();
};
document.getElementById('bacPlus').onclick = () => {
  bacQty += 1;
  refreshBac();
};
document.getElementById('bacAdd').onclick = () => {
  const p = getVolumePrice(BAC_BASE, bacQty);
  cart.push({
    id: 'bac-' + Date.now(),
    name: 'Bacteriostatic Water',
    size: '10 mg',
    qty: bacQty,
    unitPrice: p.unitPrice,
    price: p.unitPrice,
    savings: p.savings,
    tier: p.tier
  });
  bacQty = 1;
  refreshBac();
  syncCart();
};


function openProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  activeId = id;
  detailSize = 0;
  if (!qtyState[id]) qtyState[id] = 1;
  document.getElementById('pmTitle').textContent = p.name;
  document.getElementById('pmImg').src = p.img;
  document.getElementById('pmImg').alt = p.name;
  document.getElementById('pmDesc').textContent = p.desc;
  document.getElementById('pmSize').innerHTML = p.sizes.map((s, i) =>
    `<option value="${i}">${s.label} — ${fmt(s.price)}</option>`
  ).join('');
  document.getElementById('pmSize').onchange = () => {
    detailSize = Number(document.getElementById('pmSize').value);
    refreshDetail();
  };
  refreshDetail();
  document.getElementById('productModal').classList.add('open');
}
function closeProduct() {
  document.getElementById('productModal').classList.remove('open');
}
function refreshDetail() {
  if (!activeId) return;
  const p = products.find(x => x.id === activeId);
  const size = currentSize(p);
  const qty = currentQty(activeId);
  document.getElementById('pmVol').innerHTML = volumeRows(size.price, qty);
  document.getElementById('pmQty').textContent = qty;
  document.getElementById('pmLine').textContent = fmt(getVolumePrice(size.price, qty).unitPrice * qty);
}
function changeProductQty(id, d) {
  qtyState[id] = Math.max(1, currentQty(id) + d);
  refreshDetail();
}

document.getElementById('pmClose').onclick = closeProduct;
document.getElementById('productModal').addEventListener('click', (e) => {
  if (e.target.id === 'productModal') closeProduct();
});
document.getElementById('pmMinus').onclick = () => changeProductQty(activeId, -1);
document.getElementById('pmPlus').onclick = () => changeProductQty(activeId, 1);
document.getElementById('pmAdd').onclick = () => {
  if (!activeId) return;
  addToCart(activeId);
  closeProduct();
};

renderProducts();
syncCart();
refreshBac();

const signupModal = document.getElementById('signupModal');
function openSignup() {
  if (!signupModal) return;
  if (localStorage.getItem('forgedSignedUp') === '1') return;
  signupModal.classList.add('open');
}
function closeSignup() {
  if (signupModal) signupModal.classList.remove('open');
}
document.getElementById('signupLater').onclick = closeSignup;
document.getElementById('signupForm').onsubmit = (e) => {
  e.preventDefault();
  const email = document.getElementById('signupEmail').value.trim();
  if (!email) return;
  localStorage.setItem('forgedSignedUp', '1');
  localStorage.setItem('forgedEmail', email);
  closeSignup();
};
// signup after gate only
setTimeout(openSignup, 10 * 60 * 1000);


const gateModal = document.getElementById('gateModal');
function openGate() {
  if (!gateModal) return;
  if (sessionStorage.getItem('forgedGate') === '1') return;
  gateModal.classList.add('open');
}
function closeGate() {
  if (gateModal) gateModal.classList.remove('open');
}
if (document.getElementById('gateAgree')) {
  document.getElementById('gateAgree').onclick = () => {
    sessionStorage.setItem('forgedGate', '1');
    closeGate();
    setTimeout(openSignup, 1200);
  };
}
if (document.getElementById('gateDecline')) {
  document.getElementById('gateDecline').onclick = () => {
    window.location.href = 'https://www.google.com';
  };
}
openGate();
if (sessionStorage.getItem('forgedGate') === '1') {
  setTimeout(openSignup, 1200);
}
