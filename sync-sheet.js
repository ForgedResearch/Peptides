// Reads the published Website CSV and writes data/products.json
// Run locally: SHEET_CSV_URL="https://..." node scripts/sync-sheet.js

const fs = require('fs');
const path = require('path');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

function truthy(v) {
  return String(v || '').trim().toLowerCase() === 'true';
}

function toNumber(v, fallback) {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function groupProducts(table) {
  const headers = table[0].map(h => String(h).trim());
  const rows = table.slice(1).map(line => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = line[i] == null ? '' : String(line[i]).trim(); });
    return obj;
  }).filter(r => String(r.status || '').trim() === 'active');

  const byName = new Map();
  for (const row of rows) {
    const name = row.name;
    if (!name) continue;
    if (!byName.has(name)) {
      byName.set(name, {
        name,
        featured: false,
        category_primary: row.category_primary || '',
        categories: String(row.categories || '').split(',').map(s => s.trim()).filter(Boolean),
        short_desc: row.short_desc || '',
        long_desc: row.long_desc || '',
        sort_order: toNumber(row.sort_order, 9999),
        image_url: row.image_url || '',
        sizes: []
      });
    }
    const p = byName.get(name);
    if (truthy(row.featured)) p.featured = true;
    const so = toNumber(row.sort_order, 9999);
    if (so < p.sort_order) p.sort_order = so;
    if (!p.short_desc && row.short_desc) p.short_desc = row.short_desc;
    if (!p.long_desc && row.long_desc) p.long_desc = row.long_desc;
    if (!p.image_url && row.image_url) p.image_url = row.image_url;
    p.sizes.push({
      sku: row.sku || '',
      vial_label: row.vial_label || '',
      vial_mg: toNumber(row.vial_mg, 0),
      base_price: toNumber(row.base_price, 0),
      in_stock: truthy(row.in_stock),
      slug: row.slug || '',
      image_url: row.image_url || ''
    });
  }

  const products = [...byName.values()].map(p => {
    p.sizes.sort((a, b) => a.vial_mg - b.vial_mg);
    const inStock = p.sizes.filter(s => s.in_stock);
    const pool = inStock.length ? inStock : p.sizes;
    p.default_size = [...pool].sort((a, b) => a.vial_mg - b.vial_mg)[0] || p.sizes[0];
    p.slug = (p.default_size && p.default_size.slug)
      ? p.default_size.slug
      : p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return p;
  });

  products.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  return products;
}

async function main() {
  const url = process.env.SHEET_CSV_URL;
  if (!url) {
    throw new Error('Missing SHEET_CSV_URL secret');
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('CSV download failed: ' + res.status + ' ' + res.statusText);
  }
  const csv = await res.text();
  if (csv.trim().startsWith('<')) {
    throw new Error('CSV URL returned HTML, not a spreadsheet. Publish the Website tab as CSV.');
  }
  const products = groupProducts(parseCsv(csv));
  const outDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const payload = {
    updated: new Date().toISOString(),
    products
  };
  fs.writeFileSync(path.join(outDir, 'products.json'), JSON.stringify(payload, null, 2) + '\n');
  console.log('Wrote data/products.json with', products.length, 'products');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
