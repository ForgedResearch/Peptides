# Forged Research

Static storefront for GitHub Pages. Dark catalog, locked brand assets, research-use-only checkout gate.

Live local preview:

```bash
cd forged-github
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Publish on GitHub Pages

1. Create a new GitHub repo (example: `forged-research`).
2. Upload this folder as the repo root. `index.html` must sit at the root.
3. Repo → **Settings** → **Pages**.
4. Source: **Deploy from a branch**.
5. Branch: `main` / folder: `/ (root)`.
6. Save. Site URL will be `https://YOURUSER.github.io/forged-research/`.

If the repo name is not the site root, keep asset paths relative (`assets/...`, `css/styles.css`). Do not move `index.html` into a subfolder unless you also enable Pages on that folder.

## What’s included

```
index.html          Home, catalog, cart, legal gate
css/styles.css      Locked palette and layout
js/app.js           Catalog filters and cart
assets/             Logo, vials, mountain hero
```

## Not included yet

- Real payments (add Stripe, Snipcart, or Shopify)
- Product detail pages
- CMS / inventory
- Custom domain

## Brand locks

Palette, vials, logo, and night-mountain hero are locked. Do not introduce extra brand colors. All products remain research use only.
