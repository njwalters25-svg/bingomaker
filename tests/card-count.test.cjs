const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

test("custom card quantities accept 400 and clamp invalid values", () => {
  const context = { inputs: { count: { value: "" } } };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf("function getRequestedCardCount()"), source.indexOf("function renderInstructions()")), context);
  for (const [input, expected] of [["400", 400], ["401", 400], ["300", 300], ["0", 1], ["", 1], ["99.5", 99]]) {
    context.inputs.count.value = input;
    assert.equal(context.getRequestedCardCount(), expected);
  }
  assert.ok(!source.includes("Number(inputs.count.value) || 1, 1), 300"));
});

test("400 unique cards retain the free centre and valid songs", () => {
  const context = { centerIndex: 12, Math };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf("function shuffle("), source.indexOf("function setStatus(")), context);
  const songs = Array.from({ length: 75 }, (_, i) => "Song " + i);
  const cards = context.makeUniqueCards(songs, 400);
  assert.equal(cards.length, 400);
  assert.equal(new Set(cards.map(card => card.join("|"))).size, 400);
  for (const card of cards) {
    assert.equal(card.length, 25);
    assert.equal(card[12], "__FREE__");
    assert.equal(new Set(card).size, 25);
    assert.ok(card.every(item => item === "__FREE__" || songs.includes(item)));
  }
});

test("PDF export includes every card on 400 full sheets or 200 paired sheets", () => {
  const cards = Array.from({ length: 400 }, (_, i) => i);
  const node = () => ({ style: { setProperty() {} }, children: [], append(child) { this.children.push(child); } });
  const context = {
    document: { createElement: node }, getCurrentPageSize: () => ({}),
    cardsContainer: { querySelectorAll: () => cards },
    cardsPerPage: { value: "1" }, createPdfSheet: node, cloneForPdf: card => card,
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf("function createPdfExportArea("), source.indexOf("function addPdfExportOverrides(")), context);
  for (const [mode, pages] of [["1", 400], ["2", 200]]) {
    context.cardsPerPage.value = mode;
    const { exportArea } = context.createPdfExportArea({ includeExtras: false });
    assert.equal(exportArea.children.length, pages);
    assert.deepEqual(Array.from(exportArea.children.flatMap(sheet => sheet.children)), cards);
  }
});
