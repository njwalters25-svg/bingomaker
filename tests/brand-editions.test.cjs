const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const control = (value = "") => ({ value });
const context = {
  structuredClone,
  defaultBrand: { id: "all-occasions-printables" },
  brands: { "all-occasions-printables": {}, "all-occasions-bingo": {} },
  brandSelect: control("all-occasions-printables"),
  inputs: Object.fromEntries(["productName", "count", "items", "freeText", "spotifyFullUrl", "spotifyPreviewUrl", "youtubePlaylistUrl", "footerText"].map(key => [key, control()])),
  brandEditions: {}, activeEditionBrandId: "all-occasions-printables", editionRevision: 0,
  currentItems: [], currentCards: [], generatedSettingsDirty: false,
  freeImageData: "", freeImageAspectRatio: 1, headerImageData: "", markerImageData: "",
  spotifyFullQrData: "", spotifyPreviewQrData: "", youtubePlaylistQrData: "",
  selectedFreePreset: "text", isRestoringSettings: false,
  document: {}, pageSize: control("letter"), cardsPerPage: control("2"),
  primaryColor: control(), highlightColor: control(),
  headerImageInput: control(), markerImageInput: control(), freeImageInput: control(),
  spotifyFullQrInput: control(), spotifyPreviewQrInput: control(), youtubePlaylistQrInput: control(),
  generationCalls: 0,
};
for (const name of ["updateCardCountPresets", "applyBrandConfiguration", "updateFreePresetSelection", "applyCurrentColors", "updateDesignSettings", "updateListHelp", "renderCurrentOutput", "renderHelpfulChecks", "setStatus"]) {
  context[name] = () => {};
}
context.getCurrentBrand = () => ({ id: context.brandSelect.value });
context.getRequestedCardCount = () => Number(context.inputs.count.value);
context.getHelpfulChecks = () => [];
context.generateCards = () => { context.generationCalls += 1; };
context.saveSettings = () => { context.lastSaved = context.getSettingsSnapshot(); };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf("function getEditionSettings()"), source.indexOf("function saveSettings()")), context);

const legacy = {
  productName: "80s Music Bingo", count: "100", items: "Shared songs",
  currentItems: ["Song A"], currentCards: [["Song A", "__FREE__"]],
  generatedSettingsDirty: true,
  headerImageData: "printables-header", markerImageData: "printables-marker",
  spotifyFullUrl: "https://example.com/printables", spotifyPreviewUrl: "https://example.com/clips",
  youtubePlaylistUrl: "https://example.com/youtube", spotifyFullQrData: "legacy-qr",
  freeImageData: "printables-centre", freeImageAspectRatio: 2,
  primaryColor: "#123456", highlightColor: "#abcdef", footerText: "Printables footer",
};
context.applySettingsSnapshot(legacy);
assert.equal(context.activeEditionBrandId, "all-occasions-printables");
assert.equal(context.headerImageData, legacy.headerImageData);
const cards = context.currentCards;
context.brandSelect.value = "all-occasions-bingo";
context.switchBrandEdition();
assert.equal(context.headerImageData, "");
assert.equal(context.inputs.spotifyFullUrl.value, "");
assert.equal(context.spotifyFullQrData, "");
assert.equal(context.freeImageData, "");
assert.equal(context.currentCards, cards);
assert.equal(context.inputs.items.value, "Shared songs");
assert.equal(context.generatedSettingsDirty, true);
context.headerImageData = "bingo-header";
context.markerImageData = "bingo-marker";
context.inputs.spotifyFullUrl.value = "https://example.com/bingo";
context.inputs.youtubePlaylistUrl.value = "";
context.primaryColor.value = "#654321";
context.inputs.footerText.value = "Bingo footer";
context.brandSelect.value = "all-occasions-printables";
context.switchBrandEdition();
assert.equal(context.headerImageData, legacy.headerImageData);
assert.equal(context.markerImageData, legacy.markerImageData);
assert.equal(context.inputs.youtubePlaylistUrl.value, legacy.youtubePlaylistUrl);
assert.equal(context.freeImageAspectRatio, 2);
assert.equal(context.primaryColor.value, legacy.primaryColor);
assert.equal(context.inputs.footerText.value, legacy.footerText);
const saved = JSON.parse(JSON.stringify(context.getSettingsSnapshot()));
assert.equal(saved.headerImageData, legacy.headerImageData);
assert.equal(saved.editions["all-occasions-bingo"].headerImageData, "bingo-header");
context.headerImageData = "unsaved change";
assert.equal(saved.editions["all-occasions-printables"].headerImageData, legacy.headerImageData);
context.applySettingsSnapshot(saved);
context.brandSelect.value = "all-occasions-bingo";
context.switchBrandEdition();
assert.equal(context.headerImageData, "bingo-header");
assert.equal(context.markerImageData, "bingo-marker");
assert.equal(context.inputs.spotifyFullUrl.value, "https://example.com/bingo");
assert.equal(context.inputs.youtubePlaylistUrl.value, "");
assert.equal(context.primaryColor.value, "#654321");
assert.equal(context.generationCalls, 0);
context.applySettingsSnapshot({ ...legacy, brandId: "all-occasions-bingo" });
assert.equal(context.headerImageData, legacy.headerImageData);
context.brandSelect.value = "all-occasions-printables";
context.switchBrandEdition();
assert.equal(context.headerImageData, "");
context.applySettingsSnapshot(legacy);
context.brandSelect.value = "all-occasions-bingo";
context.switchBrandEdition();
assert.equal(context.headerImageData, "");
console.log("PASS: legacy migration, brand isolation, save/reload, optional YouTube, shared cards, and loading another game.");
