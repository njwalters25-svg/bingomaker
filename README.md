# Bingo Maker

Private static browser app for creating printable bingo products for All Occasions Printables.

## Files

- `index.html` - app markup
- `styles.css` - screen and print styling
- `app.js` - card generation and controls
- `.htaccess` - fallback directory-listing protection for manual uploads
- `robots.txt` and the `noindex` meta tag - discourages search indexing

## Hosting

This app does not need a database or build step. It is configured for cPanel Git Version Control deployment to:

`bingomaker.alloccasionsprintables.com`

The deploy path is set in `.cpanel.yml`:

`/home/simpxlow/bingomaker.alloccasionsprintables.com/`

## Access

This is intended as an internal production tool. Use cPanel Directory Privacy / Password Protect Directory on the hosted folder if the subdomain should not be accessible to anyone with the URL.

The cPanel deployment intentionally does not copy `.htaccess`, because cPanel Directory Privacy writes its own `.htaccess` file into the live folder.

## Free Square Images

Reusable centre-square images live in `public/free-square/`.

To add one:

1. Add the image file to `public/free-square/`.
2. Add an entry to `public/free-square/manifest.json` with an `id`, `label`, and `src`.
3. Commit, push, and deploy from cPanel.
