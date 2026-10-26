# Customer files: one local download

Generate the game as normal, choose its shop/brand and paper size, then click
**Download all customer files**. Keep the tab open while its progress message
counts through 12 PDFs. The browser downloads one ZIP to its normal download
location (usually Downloads; a browser configured to ask will show its Save dialog).

The ZIP is named `<game>-<brand>-customer-files.zip` and contains:

```text
50 Cards/
  <Game> Bingo Cards.pdf
  <Game> Bingo Cards 2 to a page.pdf
  <Game> Instructions.pdf
100 Cards/
  (the same three filenames)
200 Cards/
  (the same three filenames)
300 Cards/
  (the same three filenames)
```

The instructions PDF includes the existing instructions and extra pages (songlist,
markers, before-you-start and thank-you pages). It is generated separately for
each quantity and uses the selected brand's existing templates. The ZIP does not
include listing images or upload to Google Drive. A later sorting script can
unpack its four quantity folders and move the PDFs into the game folders.

The existing production-folder and individual print/export options are unchanged.
This download uses the existing production PDF sizing/quality settings, generates
one 300-card pool and uses its first 50/100/200 cards for the smaller packs. Both
formats for a quantity contain the same cards. Your open game, saved card set,
card count and layout are restored afterwards. Paper-size rules are the same as
the existing exporter (extras and 2-up use Letter when 5x7 is selected).

Skipping Drive/folder writes removes that part of the old workflow. PDF rendering
still takes time and the tab/Mac must remain awake until the download starts.
Already-compressed PDFs are stored without extra ZIP compression. Any individual
PDF larger than 20,000,000 bytes is named in the final warning; keep the download,
but split that file before uploading it to Etsy. A rendering/packaging failure
does not download a partial ZIP.
