# Bingo Maker

Private static browser app for creating printable bingo products for All Occasions Printables.

## Files

- `index.html` - app markup
- `styles.css` - screen and print styling
- `app.js` - card generation and controls
- `.htaccess` - prevents directory listing on Apache/cPanel hosting
- `robots.txt` and the `noindex` meta tag - discourages search indexing

## Hosting

This app does not need a database or build step. It is configured for cPanel Git Version Control deployment to:

`bingomaker.alloccasionsprintables.com`

The deploy path is set in `.cpanel.yml`:

`/home/simpxlow/bingomaker.alloccasionsprintables.com/`

## Access

This is intended as an internal production tool. Use cPanel Directory Privacy / Password Protect Directory on the hosted folder if the subdomain should not be accessible to anyone with the URL.
