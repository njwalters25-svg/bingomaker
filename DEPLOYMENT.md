# Deployment Notes

## Recommended First Launch

1. Create the subdomain `bingomaker.alloccasionsprintables.com`.
2. Upload the app files to that folder.
3. In cPanel, use Directory Privacy / Password Protect Directory for the app folder if you want a simple password gate.
4. Use the app internally to generate PDFs for Etsy listings.

## GitHub + cPanel

If using GitHub with cPanel Git Version Control:

1. Create the GitHub repository `njwalters25-svg/bingomaker`.
2. Push this folder to that repository.
3. In cPanel, open Git Version Control.
4. Clone the repository into a non-public repo folder.
5. Deploy the files into your public app folder.

cPanel deployments usually use a `.cpanel.yml` file. The exact deploy path depends on your cPanel username and desired folder, so use the example below and replace the path.

```yaml
---
deployment:
  tasks:
    - export DEPLOYPATH=/home/simpxlow/bingomaker.alloccasionsprintables.com/
    - /bin/cp index.html $DEPLOYPATH
    - /bin/cp styles.css $DEPLOYPATH
    - /bin/cp app.js $DEPLOYPATH
    - /bin/cp robots.txt $DEPLOYPATH
```

## Access Control Choices

Best simple setup:

- One shared password.
- Keep the URL and password private.
- Re-apply Directory Privacy after the first deploy if the deploy overwrote cPanel's generated `.htaccess`.

More controlled later:

- Add a small backend for access codes.
- Keep old codes valid for existing buyers.
- Only do this if the product sells enough to justify the admin and development.
