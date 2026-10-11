const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, "..");
const out = process.env.QA_OUTPUT_DIR || "/tmp/bingo-pack-qa";
fs.mkdirSync(out, { recursive: true });
const baselineApp = execFileSync("git", ["show", "main:app.js"], { cwd: root, encoding: "utf8" });
const baselineCss = execFileSync("git", ["show", "main:styles.css"], { cwd: root, encoding: "utf8" });
const header = `data:image/png;base64,${fs.readFileSync(path.join(root, "public/thank-you/banner.png")).toString("base64")}`;

async function openPage(browser, baseline = false) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.route("**/*", route => {
    const url = route.request().url();
    if (url.includes("qrcode.min.js")) return route.fulfill({ path: process.env.QR_LIBRARY || "/tmp/bingo-pack-qrcode.js", contentType: "text/javascript" });
    if (/^https?:/.test(url)) return route.abort();
    if (baseline && /\/app\.js\?/.test(url)) return route.fulfill({ body: baselineApp, contentType: "text/javascript" });
    if (baseline && /\/styles\.css\?/.test(url)) return route.fulfill({ body: baselineCss, contentType: "text/css" });
    return route.continue();
  });
  await page.goto(pathToFileURL(path.join(root, "index.html")).href);
  await page.evaluate(header => {
    inputs.productName.value = "90s R&B Music Bingo";
    inputs.count.value = "100";
    inputs.items.value = Array.from({ length: 75 }, (_, i) => `Song ${String(i + 1).padStart(2, "0")} - Artist`).join("\n");
    headerImageData = header;
    markerImageData = header;
    inputs.spotifyFullUrl.value = "https://open.spotify.com/playlist/1234567890abcdefghijkl";
    inputs.spotifyPreviewUrl.value = "https://alloccasionsbingo.com/90s-rnb-music-bingo";
  }, header);
  return page;
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || "chrome" });
  try {
    const page = await openPage(browser);
    const baseline = await openPage(browser, true);
    const printables = p => p.evaluate(() => ({
      instructions: renderInstructions().outerHTML,
      songlist: renderMasterList(parseItems(inputs.items.value)).map(p => p.outerHTML),
      markers: renderMarkers().map(p => p.outerHTML),
    }));
    assert.deepEqual(await printables(page), await printables(baseline), "Printables HTML is unchanged");
    const originalMarkerBounds = await baseline.evaluate(() => {
      extrasContainer.replaceChildren(...renderMarkers().map(createExtraFrame));
      return [...document.querySelectorAll(".markers-grid")].map(grid => ({ width: grid.clientWidth, height: grid.clientHeight }));
    });
    await page.evaluate(() => { brandSelect.value = "all-occasions-bingo"; });
    for (const youtube of [false, true]) {
      await page.evaluate(youtube => {
        inputs.youtubePlaylistUrl.value = youtube ? "https://www.youtube.com/playlist?list=PLabcdefghijklmnop" : "";
        renderExtras(parseItems(inputs.items.value));
      }, youtube);
      await page.evaluate(() => waitForPrintableImages(extrasContainer));
      const result = await page.evaluate(() => {
        const instructions = extrasContainer.querySelector(".instructions-page");
        const list = extrasContainer.querySelector(".master-list");
        return {
          instructionsHeight: instructions.scrollHeight, clientHeight: instructions.clientHeight,
          footerTop: instructions.querySelector("footer").offsetTop,
          playlistUrls: [...instructions.querySelectorAll(".playlist-card a")].map(a => a.href),
          qrSizes: [...instructions.querySelectorAll(".playlist-qr")].map(q => q.clientWidth),
          qrSources: [...instructions.querySelectorAll(".playlist-qr img")].map(q => q.src),
          songlistHeight: list.scrollHeight, songlistAvailable: list.clientHeight,
          markerCounts: [...extrasContainer.querySelectorAll(".markers-grid")].map(g => g.children.length),
          markerBounds: [...extrasContainer.querySelectorAll(".markers-grid")].map(g => ({ width: g.clientWidth, height: g.clientHeight })),
        };
      });
      assert(result.instructionsHeight <= result.clientHeight + 1, JSON.stringify(result));
      assert(result.footerTop < result.clientHeight - 20, "Instructions footer fits");
      assert(result.songlistHeight <= result.songlistAvailable + 1, "Songlist fits");
      assert.deepEqual(result.markerCounts, [42, 99]);
      assert.deepEqual(result.markerBounds, originalMarkerBounds, "Marker grid dimensions unchanged");
      assert.equal(result.playlistUrls.length, youtube ? 3 : 2);
      assert(result.playlistUrls.includes("https://alloccasionsbingo.com/90s-rnb-music-bingo"));
      assert(result.qrSizes.every(size => size >= 96));
      assert(result.qrSources.every(src => src.startsWith("data:image/png;base64,")));
      await page.locator(".instructions-page").screenshot({ path: path.join(out, `instructions-${youtube ? "youtube" : "spotify"}.png`) });
      await page.emulateMedia({ media: "print" });
      await page.evaluate(() => { document.body.dataset.printExport = "extras"; });
      await page.pdf({ path: path.join(out, `pack-${youtube ? "youtube" : "spotify"}.pdf`), printBackground: true, preferCSSPageSize: true });
      await page.emulateMedia({ media: "screen" });
    }
    const longResult = await page.evaluate(() => {
      const items = Array.from({ length: 150 }, (_, i) => `Song ${String(i + 1).padStart(3, "0")} - ${"A very long song name and featured artist ".repeat(5)}`);
      inputs.items.value = items.join("\n");
      const pages = renderMasterList(items);
      extrasContainer.replaceChildren(...pages.map(createExtraFrame));
      return {
        pages: pages.length,
        rows: pages.flatMap(p => [...p.querySelectorAll(".master-text")].map(row => row.textContent)),
        overflow: pages.some(p => { const list = p.querySelector(".master-list"); return list.scrollHeight > list.clientHeight + 1; }),
      };
    });
    assert.equal(longResult.rows.length, 150);
    assert.equal(new Set(longResult.rows).size, 150);
    assert(longResult.pages > 1);
    assert.equal(longResult.overflow, false);
    await page.locator(".master-list-page").first().screenshot({ path: path.join(out, "long-songlist.png") });
    console.log(`PASS: Printables regression, instructions with/without YouTube, QR dimensions/destinations, marker sizes, 150 long titles (${longResult.pages} pages). PDF previews: ${out}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
