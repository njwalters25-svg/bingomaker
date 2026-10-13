const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const helpers = source.slice(source.indexOf('function selectHeaderColors('), source.indexOf('headerImageInput.addEventListener("change"'));
const pixels = (...groups) => groups.flatMap(([rgb, count, alpha = 255]) => Array.from({ length: count }, () => [...rgb, alpha]).flat());
let load;
let updates = 0;
let saves = 0;
const file = {};
const context = {
  console, editionRevision: 1, headerImageData: 'new-header', headerImageInput: { files: [file] },
  primaryColor: { value: '#111111' }, highlightColor: { value: '#222222' },
  updateCustomColors() { updates++; }, saveSettings() { saves++; },
  Image: class { naturalWidth = 1000; naturalHeight = 250; addEventListener(event, callback) { if (event === 'load') load = callback; } },
  document: { createElement: () => ({ getContext: () => ({ drawImage() {}, getImageData: () => ({ data: pixels([[255, 0, 128], 50], [[0, 200, 220], 40]) }) }) }) },
};
vm.createContext(context);
vm.runInContext(helpers, context);
assert.deepEqual(Array.from(context.selectHeaderColors(pixels([[255, 255, 255], 1000], [[0, 0, 0], 1000], [[255, 0, 128], 50], [[0, 200, 220], 40], [[0, 255, 0], 1000, 0]))), ['#ff0080', '#00c8dc']);
assert.equal(context.selectHeaderColors(pixels([[255, 255, 255], 20], [[0, 0, 0], 20])), null);
assert.deepEqual(Array.from(context.selectHeaderColors(pixels([[170, 170, 170], 20]))), ['#aaaaaa', '#aaaaaa']);
context.suggestHeaderColors('new-header', file, 1, ['#111111', '#222222']);
load();
assert.equal(context.primaryColor.value, '#ff0080');
assert.equal(context.highlightColor.value, '#00c8dc');
assert.equal(updates, 1); assert.equal(saves, 1);
context.suggestHeaderColors('new-header', file, 1, ['#ff0080', '#00c8dc']);
context.primaryColor.value = '#123456'; load();
assert.equal(context.primaryColor.value, '#123456'); assert.equal(updates, 1);
context.suggestHeaderColors('new-header', file, 1, ['#123456', '#00c8dc']);
context.editionRevision = 2; load(); assert.equal(updates, 1);
context.editionRevision = 1;
context.suggestHeaderColors('new-header', file, 1, ['#123456', '#00c8dc']);
context.headerImageInput.files = [{}]; load(); assert.equal(updates, 1);
console.log('PASS: header palette, background filtering, neutral/empty images, manual tweaks and stale-upload/edition protection.');
