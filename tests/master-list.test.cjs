const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

test("separate master list leaves card items unchanged and preserves commas", () => {
  const cardItems = Array.from({ length: 75 }, (_, i) => `Song ${i} - Film`);
  const context = {
    currentItems: cardItems, currentCards: [cardItems.slice(0, 24)],
    inputs: { masterItems: { value: "" } }, generatedSettingsDirty: false,
    getProductionChecklistMissingItems: () => [], setStatus: () => {},
  };
  vm.createContext(context);
  for (const [start, end] of [["parseItems", "shuffle"], ["validateReadyToExport", "updateDesignSettings"]]) {
    vm.runInContext(source.slice(source.indexOf(`function ${start}(`), source.indexOf(`function ${end}(`)), context);
  }
  assert.equal(context.getMasterListItems(), cardItems);
  context.inputs.masterItems.value = "Song - Artist, Jr.";
  assert.deepEqual(Array.from(context.getMasterListItems()), ["Song - Artist, Jr."]);
  assert.equal(context.validateReadyToExport("extras"), false);
  assert.equal(context.validateReadyToExport("cards-full"), true);
  context.inputs.masterItems.value = Array.from({ length: 75 }, (_, i) => `Song ${i} - Artist`).join("\n");
  assert.equal(context.validateReadyToExport("current"), true);
  assert.equal(context.getMasterListItems()[0], "Song 0 - Artist");
  assert.equal(context.currentItems[0], "Song 0 - Film");
});
