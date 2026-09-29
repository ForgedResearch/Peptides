const products = [
  { id: 'reta', name: 'Retatrutide', cat: 'metabolic', desc: 'GLP-1 / GIP / Glucagon receptor agonist', price: 199, size: '10 mg', rating: '4.8 (32)', img: 'assets/vial-reta.png' },
  { id: 'bpc', name: 'BPC-157 / TB-500', cat: 'recovery', desc: 'Tissue & recovery research blend', price: 99, size: '5 mg / 5 mg', rating: '4.7 (21)', img: 'assets/vial-bpc.png' },
  { id: 'kpv', name: 'KPV', cat: 'immune', desc: 'Immune & inflammation research', price: 69, size: '5 mg', rating: '4.6 (18)', img: 'assets/vial-kpv.png' },
  { id: 'tesa', name: 'Tesamorelin', cat: 'metabolic', desc: 'GHRH analog', price: 99, size: '5 mg', rating: '4.7 (26)', img: 'assets/vial-tesa.png' }
];

const grid = document.getElementById('productGrid');
let cart = [];
let filter = 'all';

function renderProducts() {
  grid.innerHTML = products.filter(p => filter === 'all' || p.cat === filter).map(p => `
    <article class="product">
      <img class="vial-img" src="${p.img}" alt="${p.name}" />
      <span class="tag">RESEARCH USE ONLY</span>
      <strong>${p.name}</strong>
      <div class="muted">${p.desc}</div>
      <div class="stars">★★★★★ ${p.rating}</div>
      <div class="row">
        <div>
          <div class="muted">${p.size}</div>
          <strong>$${p.price}</strong>
        </div>
        <button class="btn" type="button" onclick="addToCart('${p.id}')">Add</button>
      </div>
    </article>
  `).join('');
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
  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ ...item, qty: 1 });
  syncCart();
  openCart();
}

function changeQty(id, d) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += d;
  if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
  syncCart();
}

function syncCart() {
  const count = cart.reduce((a, b) => a + b.qty, 0);
  document.getElementById('cartCount').textContent = count;
  const sub = cart.reduce((a, b) => a + b.price * b.qty, 0);
  document.getElementById('subtotal').textContent = '$' + sub;
  document.getElementById('cartItems').innerHTML = cart.length ? cart.map(c => `
    <div class="cart-line">
      <div>
        <strong>${c.name}</strong>
        <div class="muted">${c.size}</div>
        <div class="qty">
          <button type="button" onclick="changeQty('${c.id}',-1)">−</button>
          <span>${c.qty}</span>
          <button type="button" onclick="changeQty('${c.id}',1)">+</button>
        </div>
      </div>
      <strong>$${c.price * c.qty}</strong>
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
