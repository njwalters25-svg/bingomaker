const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const exportSource = source.slice(source.indexOf("async function exportPngSamplePack()"), source.indexOf("async function createPdfBlobFromCurrentLayout("));

async function runExport(brandId, cardCount = 20, fail = false) {
  const files = new Map();
  const cards = Array.from({ length: cardCount }, (_, index) => ({ index }));
  const counts = [];
  const context = {
    window: { html2canvas: true, JSZip: true },
    console: { error() {} },
    cardsPerPage: { value: "2" }, brandSelect: { disabled: false },
    markerImageData: "marker-source", currentItems: ["Song A"],
    cardsContainer: { querySelectorAll: () => cards },
    validateReadyToExport: () => true,
    getProductNameForFilename: () => "test-game",
    getCurrentBrand: () => ({ id: brandId }),
    getSpotifyPreviewQrData: () => "preview-qr-source",
    dataUrlToBlob: data => data,
    getCurrentPageSize: () => ({ cardWidth: 816, cardHeight: 1056, sheetWidth: 816, sheetHeight: 1056 }),
    cloneForPdf: card => card,
    createTwoUpSampleSheet: (elements, startIndex) => elements.slice(startIndex, startIndex + 2),
    renderMarkers: () => ["large-markers", "small-markers"],
    renderMasterList: () => ["songlist"],
    renderInstructionsForCount: count => { counts.push(count); return count; },
    setStatus: message => { context.status = message; },
    setPdfBusy: busy => { context.busy = busy; },
    updateDesignSettings() {}, renderCurrentOutput() {},
    downloadBlob: (blob, filename) => { context.download = filename; },
  };
  context.JSZip = class {
    file(filename, blob) { assert(!files.has(filename)); files.set(filename, blob); }
    async generateAsync() { return "zip-blob"; }
  };
  context.withTemporaryCardLayout = async (layout, callback) => {
    const previous = context.cardsPerPage.value;
    context.cardsPerPage.value = layout;
    try { return await callback(); } finally { context.cardsPerPage.value = previous; }
  };
  context.addElementPngToZip = async (zip, filename, element) => {
    assert.equal(context.brandSelect.disabled, true);
    if (fail) throw new Error("Rendering failed");
    zip.file(filename, element);
  };
  vm.createContext(context);
  vm.runInContext(exportSource, context);
  await context.exportPngSamplePack();
  assert.equal(context.cardsPerPage.value, "2");
  assert.equal(context.brandSelect.disabled, false);
  assert.equal(context.busy, false);
  if (fail) {
    assert.equal(context.download, undefined);
    assert.match(context.status, /could not be created/);
    return;
  }
  assert.equal(context.download, `test-game-${brandId}-png-sample-pack.zip`);
  assert.deepEqual(counts, [100, 200, 300]);
  const expected = [
    "assets/preview-qr.png", "assets/bingo-marker.png",
    ...Array.from({ length: Math.min(cardCount, 20) }, (_, i) => `full-size-cards/card-${String(i + 1).padStart(2, "0")}.png`),
    ...Array.from({ length: Math.min(2, Math.ceil(cardCount / 2)) }, (_, i) => `two-up-cards/two-up-${String(i + 1).padStart(2, "0")}.png`),
    "extras/bingo-markers-large.png", "extras/bingo-markers-small.png",
    "extras/complete-songlist-01.png",
    ...[100, 200, 300].map(count => `instructions/instructions-${count}-cards.png`),
  ];
  assert.deepEqual([...files.keys()], expected);
  assert.equal(files.get("assets/bingo-marker.png"), "marker-source");
  assert.equal(files.get("assets/preview-qr.png"), "preview-qr-source");
}

(async () => {
  await runExport("all-occasions-printables");
  await runExport("all-occasions-bingo");
  await runExport("all-occasions-bingo", 3);
  await runExport("all-occasions-bingo", 20, true);
  console.log("PASS: PNG archive paths for both brands, smaller sample sets, package counts, assets, and failure cleanup.");
})().catch(error => { console.error(error); process.exitCode = 1; });
