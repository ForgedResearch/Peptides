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

function imgSrc(p, size) {
  const s = size || (p && p.default_size) || (p && p.sizes && p.sizes[0]);
  return (s && s.image_url) || (p && p.image_url) || 'assets/logo-mark.png';
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
  const card = sel.closest('.product');
  const img = card && card.querySelector('.vial-img');
  if (img) img.src = imgSrc(p, size);
}

function openFeatured(id) {
  const p = products.find(x => productId(x) === id);
  const sel = document.getElementById('feat-size-' + id);
  if (p && sel) {
    activeId = id;
    detailSize = Number(sel.value) || 0;
  }
  openProduct(id, true);
}

function renderFeatured() {
  const box = document.getElementById('featuredGrid');
  if (!box) return;
  const list = featuredList();
  box.innerHTML = list.map(p => {
    const id = productId(p);
    const def = p.default_size || p.sizes[0];
    return (
      '<article class="product" onclick="openProduct(\'' + id + '\')">' +
        '<div class="vial-zoom"><img class="vial-img" src="' + imgSrc(p, def) + '" alt="' + p.name + '"></div>' +
        '<span class="tag">RESEARCH USE ONLY</span>' +
        '<strong>' + p.name + '</strong>' +
        '<div class="card-desc">' + (p.short_desc || '') + '</div>' +
        '<div class="row" style="margin-top:auto">' +
          '<strong>' + fmt(def ? def.base_price : 0) + '</strong>' +
          '<button class="btn" type="button">View</button>' +
        '</div>' +
      '</article>'
    );
  }).join('') || '<p class="muted">No featured products. Set featured to TRUE on the Website tab.</p>';
}

function renderProducts() {
  if (!grid) return;
  const q = (document.getElementById('catalogSearch') || {}).value || '';
  const query = q.trim().toLowerCase();
  const list = products.filter(p => {
    if (filter !== 'all' && catKey(p) !== filter) return false;
    if (!query) return true;
    const sizes = (p.sizes || []).map(s => s.vial_label || '').join(' ');
    const hay = (p.name + ' ' + (p.short_desc || '') + ' ' + (p.category_primary || '') + ' ' + sizes).toLowerCase();
    return hay.indexOf(query) !== -1;
  });
  grid.innerHTML = list.map(p => {
    const id = productId(p);
    return (
      '<article class="product" data-id="' + id + '" onclick="openProduct(\'' + id + '\')">' +
        '<div class="vial-zoom"><img class="vial-img" src="' + imgSrc(p) + '" alt="' + p.name + '"></div>' +
        '<span class="tag">RESEARCH USE ONLY</span>' +
        '<strong>' + p.name + '</strong>' +
        '<div class="card-desc">' + (p.short_desc || '') + '</div>' +
        '<div class="row" style="margin-top:auto">' +
          '<strong>' + fmt(fromPrice(p)) + '</strong>' +
          '<button class="btn" type="button">View</button>' +
        '</div>' +
      '</article>'
    );
  }).join('') || '<p class="muted">No matching products.</p>';
}

const viewAllBtn = document.getElementById('viewAllBtn');
const catalog = document.getElementById('catalog');
const catalogSearch = document.getElementById('catalogSearch');
if (catalogSearch && catalog) {
  catalogSearch.oninput = () => {
    catalog.hidden = false;
    renderProducts();
  };
}
const searchBtn = document.querySelector('.nav-actions .icon-btn[title="Search"]');
if (searchBtn && catalogSearch) {
  searchBtn.onclick = () => {
    catalogSearch.focus();
    catalogSearch.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
}
if (viewAllBtn && catalog) {
  viewAllBtn.onclick = () => {
    catalog.hidden = false;
    catalog.scrollIntoView({ behavior: 'smooth' });
  };
}

document.querySelectorAll('.chip').forEach(chip => {
  chip.onclick = () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filter = chip.dataset.filter;
    renderProducts();
  };
});

function cartOffer() {
  const qty = cart.reduce((a, b) => a + b.qty, 0);
  const names = {};
  cart.forEach(c => { names[c.name] = true; });
  const active = cart.length >= 2;
  const meterQty = cart.reduce((sum, c) => sum + (c.qty <= 4 ? c.qty : 0), 0);
  let percentOff = 0;
  let tier = '1-4';
  if (active) {
    if (meterQty >= 10) { percentOff = 20; tier = '10+'; }
    else if (meterQty >= 5) { percentOff = 10; tier = '5-9'; }
  }
  let note = '';
  if (!cart.length) note = '';
  else if (!active) note = 'Add more products. You need 3 products.';
  else if (tier === '10+') note = 'You got the big discount. 20% off.';
  else if (tier === '5-9') {
    const needProducts = Math.max(0, 3 - Object.keys(names).length);
    const needVials = 10 - meterQty;
    note = needProducts
      ? 'You have 10% off. Add ' + needProducts + ' more product and ' + needVials + ' more vials for 20% off.'
      : 'You have 10% off. Add ' + needVials + ' more vials for 20% off.';
  }
  else note = 'Add ' + (5 - meterQty) + ' more vials for 10% off.';
  return { qty, meterQty, percentOff, tier, note, active, productCount: Object.keys(names).length };
}

function quoteLine(c, offer) {
  const base = money(c.basePrice || c.unitPrice);
  const own = getVolumePrice(base, c.qty);
  let percent = 0;
  let kind = 'panel';
  if (c.qty >= 5) {
    percent = own.percentOff;
    kind = 'panel';
  } else if (offer.active) {
    percent = offer.percentOff;
    kind = 'cart';
  }
  const unit = money(base - money(base * (percent / 100)));
  return {
    base,
    percent,
    unit,
    kind,
    line: money(unit * c.qty),
    lineSave: money((base - unit) * c.qty)
  };
}

function addToCartFromDetail() {
  const item = currentProduct();
  const size = currentSize(item);
  if (!item || !size) return;
  if (!size.in_stock) {
    alert('That size is out of stock.');
    return;
  }
  const qty = currentQty(activeId);
  cart.push({
    id: size.sku + '-' + Date.now(),
    name: item.name,
    size: size.vial_label,
    qty,
    basePrice: money(size.base_price),
    unitPrice: money(size.base_price)
  });
  syncCart();
  openCart();
}

function syncCart() {
  const countEl = document.getElementById('cartCount');
  const subEl = document.getElementById('subtotal');
  const totalEl = document.getElementById('orderTotal');
  const extraRow = document.getElementById('extraRow');
  const extraEl = document.getElementById('extraSavings');
  const saveRow = document.getElementById('totalSaveRow');
  const saveEl = document.getElementById('totalSavings');
  const listEl = document.getElementById('cartItems');
  const offer = cartOffer();
  let charged = 0;
  let lineSaved = 0;
  const lines = cart.map((c, i) => {
    const q = quoteLine(c, offer);
    c.unitPrice = q.unit;
    charged += q.line;
    lineSaved += q.lineSave;
    const kindLabel = q.kind === 'cart' ? 'cart' : 'panel';
    const saveHtml = q.lineSave > 0 ? '<span class="save">(' + kindLabel + ' savings ' + fmt(q.lineSave) + ')</span>' : '<span></span>';
    return '<div class="cart-line">' +
      '<div class="row"><strong>' + c.name + '</strong><strong class="cart-line-price">' + fmt(q.line) + '</strong></div>' +
      '<div class="row"><span class="muted">' + c.size + '</span>' + saveHtml + '</div>' +
      '<div class="cart-controls">' +
      '<button type="button" data-act="minus" data-i="' + i + '" aria-label="Decrease">−</button>' +
      '<span>' + c.qty + '</span>' +
      '<button type="button" data-act="plus" data-i="' + i + '" aria-label="Increase">+</button>' +
      '<button type="button" class="cart-x" data-act="remove" data-i="' + i + '" aria-label="Remove">×</button>' +
      '</div></div>';
  });
  charged = money(charged);
  lineSaved = money(lineSaved);
  const extra = charged >= 1501 ? money(charged * 0.30) : 0;
  const due = money(charged - extra);
  const allSaved = money(lineSaved + extra);
  if (countEl) countEl.textContent = offer.qty;
  if (subEl) subEl.textContent = fmt(charged);
  if (totalEl) totalEl.textContent = fmt(due);
  if (extraRow) extraRow.hidden = !extra;
  if (extraEl) extraEl.textContent = fmt(extra);
  if (saveRow) saveRow.hidden = !allSaved;
  if (saveEl) saveEl.textContent = fmt(allSaved);
  if (listEl) {
    if (!cart.length) {
      listEl.innerHTML = '<p class="muted">Your cart is empty.</p>';
    } else {
      listEl.innerHTML = lines.join('') + (offer.note ? '<p class="muted cart-note">' + offer.note + '</p>' : '') +
        '<p class="muted cart-note">Orders over $1,500 get an extra 30% off.</p>';
    }
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

const cartList = document.getElementById('cartItems');
if (cartList) cartList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const i = Number(btn.dataset.i);
  if (!cart[i]) return;
  if (btn.dataset.act === 'plus') cart[i].qty += 1;
  if (btn.dataset.act === 'minus') cart[i].qty = Math.max(1, cart[i].qty - 1);
  if (btn.dataset.act === 'remove') cart.splice(i, 1);
  syncCart();
});

function openProduct(id, keepSize) {
  const p = products.find(x => productId(x) === id);
  if (!p || !document.getElementById('productModal')) return;
  if (!keepSize) {
    activeId = id;
    const def = p.default_size || p.sizes[0];
    detailSize = Math.max(0, p.sizes.findIndex(s => s.sku === (def && def.sku)));
  } else {
    activeId = id;
  }
  if (!qtyState[id]) qtyState[id] = 1;
  document.getElementById('pmTitle').textContent = p.name;
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
  const img = document.getElementById('pmImg');
  if (img) img.src = imgSrc(p, size);
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
openGate();
