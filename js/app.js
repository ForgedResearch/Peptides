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
    desc: 'Triple receptor research peptide (GLP-1, GIP, and glucagon). Synthetic 39-amino-acid acylated sequence, supplied as lyophilized powder for laboratory use only.',
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
    desc: 'Lyophilized two-peptide research material combining BPC-157 and TB-500. Supplied as a dry powder for laboratory use only.',
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

function currentSize(p) {
  const sel = document.getElementById('size-' + p.id);
  const idx = sel ? Number(sel.value) : 0;
  return p.sizes[idx] || p.sizes[0];
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

function renderProducts() {
  grid.innerHTML = products.filter(p => filter === 'all' || p.cat === filter).map(p => {
    if (!qtyState[p.id]) qtyState[p.id] = 1;
    const size = currentSize(p);
    const qty = currentQty(p.id);
    const sizeOpts = p.sizes.map((s, i) => `<option value="${i}">${s.label} — ${fmt(s.price)}</option>`).join('');
    return `
      <article class="product" data-id="${p.id}">
        <img class="vial-img" src="${p.img}" alt="${p.name}" />
        <span class="tag">RESEARCH USE ONLY</span>
        <strong>${p.name}</strong>
        <div class="muted">${p.desc}</div>
        <div class="stars">★★★★★ ${p.rating}</div>
        <select class="size-select" id="size-${p.id}" onchange="onSize('${p.id}')">${sizeOpts}</select>
        <div class="volume">
          <h3>Volume Discounts</h3>
          <div id="vol-${p.id}">${volumeRows(size.price, qty)}</div>
        </div>
        <div class="qty-row">
          <span class="muted">Quantity:</span>
          <div class="stepper">
            <button type="button" onclick="changeProductQty('${p.id}',-1)">−</button>
            <span id="qty-${p.id}">${qty}</span>
            <button type="button" onclick="changeProductQty('${p.id}',1)">+</button>
          </div>
        </div>
        <div class="row" style="margin-top:10px">
          <strong id="line-${p.id}">${fmt(getVolumePrice(size.price, qty).unitPrice * qty)}</strong>
          <button class="btn" type="button" onclick="addToCart('${p.id}')">Add</button>
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

renderProducts();
syncCart();
