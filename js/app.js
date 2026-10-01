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
  return { unitPrice, savings, percentOff, tier };
}

function catKey(p) {
  const c = String(p.category_primary || '').toLowerCase();
  if (c.includes('metabol')) return 'metabolic';
  if (c.includes('recover')) return 'recovery';
  if (c.includes('immune') || c.includes('gut')) return 'immune';
  return '';
}

function productId(p) {
  return p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

const grid = document.getElementById('productGrid');
let products = [];
let cart = [];
let filter = 'all';
let activeId = null;
let detailSize = 0;
const qtyState = {};

function currentProduct() {
  return products.find(p => productId(p) === activeId);
}
function currentSize(p) {
  if (!p || !p.sizes || !p.sizes.length) return null;
  if (productId(p) === activeId) return p.sizes[detailSize] || p.sizes[0];
  return p.default_size || p.sizes[0];
}
function currentQty(id) { return qtyState[id] || 1; }
function fromPrice(p) {
  const s = p.default_size || (p.sizes && p.sizes[0]);
  return s ? s.base_price : 0;
}
function imgSrc(p) {
  return p.image_url || (p.default_size && p.default_size.image_url) || 'assets/logo-mark.png';
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
    const save = p.percentOff ? ' <span class="save">(save ' + fmt(p.savings) + ')</span>' : '';
    return '<div class="vrow' + (selected === t.key ? ' active' : '') + '"><span>' + t.label + '</span><span>' + fmt(p.unitPrice) + ' each' + save + '</span></div>';
  }).join('');
}

function featuredList() {
  return products
    .filter(p => p.featured)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .slice(0, 4);
}

function updateFeaturedPrice(id) {
  const p = products.find(x => productId(x) === id);
  const sel = document.getElementById('feat-size-' + id);
  const priceEl = document.getElementById('feat-price-' + id);
  if (!p || !sel || !priceEl) return;
  const size = p.sizes[Number(sel.value)] || p.default_size;
  priceEl.textContent = fmt(size.base_price);
}

function openFeatured(id) {
  const p = products.find(x => productId(x) === id);
  const sel = document.getElementById('feat-size-' + id);
  if (p && sel) {
    activeId = id;
    detailSize = Number(sel.value) || 0;
  }
  openProduct(id);
}

function renderFeatured() {
  const box = document.getElementById('featuredGrid');
  if (!box) return;
  const list = featuredList();
  box.innerHTML = list.map(p => {
    const id = productId(p);
    const def = p.default_size || p.sizes[0];
    const options = (p.sizes || []).map((s, i) => {
      const sel = def && s.sku === def.sku ? ' selected' : '';
      const oos = s.in_stock ? '' : ' (Out of stock)';
      return '<option value="' + i + '"' + sel + '>' + s.vial_label + oos + '</option>';
    }).join('');
    return (
      '<article class="product">' +
        '<img class="vial-img" src="' + imgSrc(p) + '" alt="' + p.name + '">' +
        '<span class="tag">RESEARCH USE ONLY</span>' +
        '<strong>' + p.name + '</strong>' +
        '<div class="card-desc">' + (p.short_desc || '') + '</div>' +
        '<select class="size-select" id="feat-size-' + id + '" onchange="updateFeaturedPrice(\'' + id + '\')">' + options + '</select>' +
        '<div class="row" style="margin-top:auto">' +
          '<strong id="feat-price-' + id + '">' + fmt(def ? def.base_price : 0) + '</strong>' +
          '<button class="btn" type="button" onclick="openFeatured(\'' + id + '\')">View</button>' +
        '</div>' +
      '</article>'
    );
  }).join('') || '<p class="muted">No featured products. Set featured to TRUE on the Website tab.</p>';
}

function renderProducts() {
  if (!grid) return;
  const list = products.filter(p => filter === 'all' || catKey(p) === filter);
  grid.innerHTML = list.map(p => {
    const id = productId(p);
    return (
      '<article class="product" data-id="' + id + '" onclick="openProduct(\'' + id + '\')">' +
        '<img class="vial-img" src="' + imgSrc(p) + '" alt="' + p.name + '">' +
        '<span class="tag">RESEARCH USE ONLY</span>' +
        '<strong>' + p.name + '</strong>' +
        '<div class="card-desc">' + (p.short_desc || '') + '</div>' +
        '<div class="row" style="margin-top:auto">' +
          '<strong>' + fmt(fromPrice(p)) + '</strong>' +
          '<button class="btn" type="button">View</button>' +
        '</div>' +
      '</article>'
    );
  }).join('') || '<p class="muted">No products in this category.</p>';
}

document.querySelectorAll('.chip').forEach(chip => {
  chip.onclick = () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filter = chip.dataset.filter;
    renderProducts();
  };
});

function addToCartFromDetail() {
  const item = currentProduct();
  const size = currentSize(item);
  if (!item || !size) return;
  if (!size.in_stock) {
    alert('That size is out of stock.');
    return;
  }
  const qty = currentQty(activeId);
  const priced = getVolumePrice(size.base_price, qty);
  cart.push({
    id: size.sku + '-' + Date.now(),
    name: item.name,
    size: size.vial_label,
    qty,
    unitPrice: priced.unitPrice
  });
  syncCart();
  openCart();
}

function syncCart() {
  const countEl = document.getElementById('cartCount');
  const subEl = document.getElementById('subtotal');
  const listEl = document.getElementById('cartItems');
  const count = cart.reduce((a, b) => a + b.qty, 0);
  if (countEl) countEl.textContent = count;
  if (subEl) subEl.textContent = fmt(cart.reduce((a, b) => a + b.unitPrice * b.qty, 0));
  if (listEl) {
    listEl.innerHTML = cart.length ? cart.map(c =>
      '<div class="cart-line"><div><strong>' + c.name + '</strong><div class="muted">' + c.size + ' · ' + c.qty + ' × ' + fmt(c.unitPrice) + '</div></div><strong>' + fmt(c.unitPrice * c.qty) + '</strong></div>'
    ).join('') : '<p class="muted">Your cart is empty.</p>';
  }
}

const drawer = document.getElementById('drawer');
const drawerBg = document.getElementById('drawerBg');
const checkoutModal = document.getElementById('modal');
function openCart() { if (drawer) drawer.classList.add('open'); if (drawerBg) drawerBg.classList.add('open'); }
function closeCart() { if (drawer) drawer.classList.remove('open'); if (drawerBg) drawerBg.classList.remove('open'); }
if (document.getElementById('cartBtn')) document.getElementById('cartBtn').onclick = openCart;
if (document.getElementById('closeCart')) document.getElementById('closeCart').onclick = closeCart;
if (drawerBg) drawerBg.onclick = closeCart;
if (document.getElementById('checkoutBtn')) {
  document.getElementById('checkoutBtn').onclick = () => {
    if (!cart.length) return;
    if (checkoutModal) checkoutModal.classList.add('open');
  };
}
if (document.getElementById('agreeBtn')) {
  document.getElementById('agreeBtn').onclick = () => {
    if (!document.getElementById('agree') || !document.getElementById('agree').checked) {
      alert('Please confirm research-use-only before continuing.');
      return;
    }
    if (checkoutModal) checkoutModal.classList.remove('open');
    alert('Demo checkout. Connect a payment provider before taking live orders.');
    cart = [];
    syncCart();
    closeCart();
  };
}

const BAC_BASE = 20.99;
let bacQty = 1;
function refreshBac() {
  const p = getVolumePrice(BAC_BASE, bacQty);
  const qel = document.getElementById('bacQty');
  const pel = document.getElementById('bacPrice');
  if (qel) qel.textContent = bacQty;
  if (pel) pel.textContent = fmt(p.unitPrice * bacQty);
}
if (document.getElementById('bacMinus')) document.getElementById('bacMinus').onclick = () => { bacQty = Math.max(1, bacQty - 1); refreshBac(); };
if (document.getElementById('bacPlus')) document.getElementById('bacPlus').onclick = () => { bacQty += 1; refreshBac(); };
if (document.getElementById('bacAdd')) {
  document.getElementById('bacAdd').onclick = () => {
    const p = getVolumePrice(BAC_BASE, bacQty);
    cart.push({ id: 'bac-' + Date.now(), name: 'Bacteriostatic Water', size: '10 ml', qty: bacQty, unitPrice: p.unitPrice });
    bacQty = 1;
    refreshBac();
    syncCart();
  };
}

function openProduct(id) {
  const p = products.find(x => productId(x) === id);
  if (!p || !document.getElementById('productModal')) return;
  activeId = id;
  const def = p.default_size || p.sizes[0];
  detailSize = Math.max(0, p.sizes.findIndex(s => s.sku === (def && def.sku)));
  if (!qtyState[id]) qtyState[id] = 1;
  document.getElementById('pmTitle').textContent = p.name;
  document.getElementById('pmImg').src = imgSrc(p);
  document.getElementById('pmImg').alt = p.name;
  document.getElementById('pmDesc').textContent = p.long_desc || p.short_desc || '';
  document.getElementById('pmSize').innerHTML = p.sizes.map((s, i) => {
    const oos = s.in_stock ? '' : ' (Out of stock)';
    return '<option value="' + i + '">' + s.vial_label + ' — ' + fmt(s.base_price) + oos + '</option>';
  }).join('');
  document.getElementById('pmSize').value = String(detailSize);
  document.getElementById('pmSize').onchange = () => {
    detailSize = Number(document.getElementById('pmSize').value);
    refreshDetail();
  };
  refreshDetail();
  document.getElementById('productModal').classList.add('open');
}
function closeProduct() {
  const el = document.getElementById('productModal');
  if (el) el.classList.remove('open');
}
function refreshDetail() {
  const p = currentProduct();
  const size = currentSize(p);
  if (!p || !size) return;
  const qty = currentQty(activeId);
  const line = getVolumePrice(size.base_price, qty).unitPrice * qty;
  document.getElementById('pmVol').innerHTML = volumeRows(size.base_price, qty);
  document.getElementById('pmQty').textContent = qty;
  document.getElementById('pmLine').textContent = fmt(line);
  const add = document.getElementById('pmAdd');
  if (add) add.disabled = !size.in_stock;
}
function changeProductQty(id, d) {
  if (!id) return;
  qtyState[id] = Math.max(1, currentQty(id) + d);
  refreshDetail();
}
if (document.getElementById('pmClose')) document.getElementById('pmClose').onclick = closeProduct;
if (document.getElementById('productModal')) {
  document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target.id === 'productModal') closeProduct();
  });
}
if (document.getElementById('pmMinus')) document.getElementById('pmMinus').onclick = () => changeProductQty(activeId, -1);
if (document.getElementById('pmPlus')) document.getElementById('pmPlus').onclick = () => changeProductQty(activeId, 1);
if (document.getElementById('pmAdd')) document.getElementById('pmAdd').onclick = () => { addToCartFromDetail(); closeProduct(); };

const gateModal = document.getElementById('gateModal');
function openGate() {
  if (!gateModal) return;
  if (sessionStorage.getItem('forgedGate') === '1') return;
  gateModal.classList.add('open');
}
function closeGate() { if (gateModal) gateModal.classList.remove('open'); }
if (document.getElementById('gateAgree')) {
  document.getElementById('gateAgree').onclick = () => {
    sessionStorage.setItem('forgedGate', '1');
    closeGate();
  };
}
if (document.getElementById('gateDecline')) {
  document.getElementById('gateDecline').onclick = () => {
    window.location.href = 'https://www.google.com';
  };
}

fetch('data/products.json')
  .then(r => {
    if (!r.ok) throw new Error('Missing data/products.json');
    return r.json();
  })
  .then(data => {
    products = data.products || [];
    renderFeatured();
    renderProducts();
  })
  .catch(err => {
    console.error(err);
    if (grid) grid.innerHTML = '<p class="muted">Catalog is updating. Run the Sync sheet Action, then refresh.</p>';
  });

syncCart();
refreshBac();
openGate();
