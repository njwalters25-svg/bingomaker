const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const exportSource = source.slice(source.indexOf("async function downloadAllCustomerFiles()"), source.indexOf("async function printExport("));

async function runExport(options = {}) {
  const files = new Map(), calls = [], statuses = [], controls = [{ disabled: false }, { disabled: true }];
  const originalCards = [["saved card"]], originalItems = ["saved song"];
  const c = {
    window: { html2canvas: true, jspdf: { jsPDF: true }, JSZip: true }, console: { error() {} },
    currentCards: originalCards, currentItems: originalItems, generatedSettingsDirty: false,
    inputs: { count: { value: "12" } }, brandSelect: { disabled: false },
    form: { querySelectorAll: () => controls },
    getExportSettingsSnapshot: () => ({ pageSize: "letter", cardsPerPage: "2" }),
    validateReadyToExport: () => options.valid !== false,
    getCurrentBrand: () => ({ id: options.brand || "all-occasions-bingo" }),
    getProductNameForFilename: () => "80s-music-bingo",
    getProductionPdfFilename: (_, type) => `80s Music Bingo ${type}.pdf`,
    setStatus: (message, error) => statuses.push({ message, error }),
    setPdfBusy: busy => { c.busy = busy; },
    restoreExportSettings(settings) { c.restored = settings; assert.equal(c.currentCards, originalCards); },
    downloadBlob: (_, filename) => { c.download = filename; },
    makeUniqueCards(items, count) {
      assert.equal(items, originalItems); assert.equal(count, 300);
      c.generationCalls = (c.generationCalls || 0) + 1;
      return Array.from({ length: options.shortGeneration ? 299 : count }, (_, i) => [`card-${i}`]);
    },
    async createProductionPdfForCount(count, type, cards) {
      assert.equal(c.brandSelect.disabled, true); assert.ok(controls.every(control => control.disabled));
      assert.equal(cards.length, count);
      calls.push({ count, type, cards });
      // Simulate temporary layout changes so failure cleanup is also exercised.
      c.currentCards = cards; c.inputs.count.value = String(count);
      if (options.failRender && calls.length === 4) throw new Error("Render failed");
      return { blob: { size: options.oversized ? 20_000_001 : 1000 }, sizeMb: 0.001, pageCount: count };
    },
  };
  c.JSZip = class {
    folder(folder) { return { file(name, blob) { const key = `${folder}/${name}`; assert.ok(!files.has(key)); files.set(key, blob); } }; }
    async generateAsync(settings) {
      assert.equal(settings.compression, "STORE");
      if (options.failZip) throw new Error("Packaging failed");
      return "zip-blob";
    }
  };
  if (options.dependencies === false) c.window.JSZip = undefined;
  vm.createContext(c); vm.runInContext(exportSource, c);
  await c.downloadAllCustomerFiles();
  assert.equal(c.currentItems, originalItems);
  assert.equal(c.currentCards, originalCards);
  assert.equal(c.inputs.count.value, "12");
  assert.equal(c.generatedSettingsDirty, false);
  assert.equal(c.brandSelect.disabled, false);
  assert.deepEqual(controls.map(control => control.disabled), [false, true]);
  return { c, files, calls, statuses };
}

test("downloads all four quantities and three existing PDF types, with no folder picker or cloud writes", async () => {
  for (const brand of ["all-occasions-bingo", "all-occasions-printables"]) {
    const { c, calls, files, statuses } = await runExport({ brand });
    assert.equal(c.download, `80s-music-bingo-${brand}-customer-files.zip`);
    assert.equal(c.generationCalls, 1); assert.equal(c.busy, false);
    assert.equal(files.size, 12);
    assert.deepEqual(calls.map(({ count, type }) => `${count}:${type}`),
      [50, 100, 200, 300].flatMap(count => ["cards-full", "cards-two-up", "extras"].map(type => `${count}:${type}`)));
    for (const count of [50, 100, 200, 300]) {
      for (const type of ["full", "twoUp", "instructions"]) assert.ok(files.has(`${count} Cards/80s Music Bingo ${type}.pdf`));
      const batch = calls.filter(call => call.count === count);
      assert.equal(batch[0].cards, batch[1].cards); assert.equal(batch[1].cards, batch[2].cards);
    }
    assert.equal(calls[0].cards[0], calls[9].cards[0]);
    assert.match(statuses.at(-1).message, /Downloaded all customer files/);
    assert.ok(!/showDirectoryPicker|fetch\(|writeBlobToDirectory/.test(exportSource));
  }
});
test("invalid game and missing libraries do not start an export", async () => {
  for (const options of [{ valid: false }, { dependencies: false }]) {
    const { c, files, calls } = await runExport(options);
    assert.equal(c.download, undefined); assert.equal(files.size, 0); assert.equal(calls.length, 0);
  }
});
test("rendering, ZIP packaging and uniqueness failures restore the editor and download nothing partial", async () => {
  for (const options of [{ failRender: true }, { failZip: true }, { shortGeneration: true }]) {
    const { c, statuses } = await runExport(options);
    assert.equal(c.download, undefined); assert.equal(c.busy, false);
    assert.equal(c.restored.cardsPerPage, "2");
    assert.equal(statuses.at(-1).error, true); assert.match(statuses.at(-1).message, /No partial ZIP/);
  }
});
test("oversized Etsy files are flagged without discarding the local download", async () => {
  const { c, statuses } = await runExport({ oversized: true });
  assert.ok(c.download); assert.equal(statuses.at(-1).error, true);
  assert.match(statuses.at(-1).message, /exceed 20 MB/);
});
test("new download control is connected alongside the unchanged folder and individual export controls", () => {
  assert.match(html, /id="customerFilesButton"[^>]*>Download all customer files/);
  assert.match(source, /customerFilesButton\.addEventListener\("click", downloadAllCustomerFiles\)/);
  assert.match(source, /productionFolderButton\.addEventListener\("click", exportProductionFolders\)/);
});
