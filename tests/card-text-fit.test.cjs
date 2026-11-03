const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const fit = source.slice(source.indexOf("function fitSquareText("), source.indexOf("function fitAllSquareText("));
const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");

test("readable layouts constrain the grid instead of letting text enlarge the card", () => {
  assert.match(css, /grid-template-rows: 270px minmax\(0, 1fr\) 34px/);
  assert.match(css, /grid-template-rows: 168px minmax\(0, 1fr\) 24px/);
  const twoUpGrid = css.slice(css.lastIndexOf('body[data-cards-per-page="2"] .bingo-grid {', css.indexOf('@media (max-width: 1020px)')));
  assert.match(twoUpGrid, /grid-template-rows: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /body\[data-cards-per-page="2"\] \.square \{\s*aspect-ratio: auto;/);
});

function run({ mode = "2", scale = 1, fitsAt = 11, image = false, music = true, scroll = false, longArtist = false, longTitle = false } = {}) {
  const square = {
    style: {}, clientHeight: 80, clientWidth: 80, offsetHeight: 80,
    querySelector: () => image,
    classList: { contains: () => music },
    getBoundingClientRect: () => ({ top: 0, bottom: 80 * scale, height: 80 * scale }),
  };
  const size = () => Number.parseFloat(square.style.fontSize) || 12.333;
  Object.defineProperties(square, {
    scrollHeight: { get: () => scroll && size() > fitsAt ? 90 : 80 },
    scrollWidth: { get: () => 80 },
  });
  square.children = [{ getBoundingClientRect: () => ({
    top: (!longArtist && !longTitle && size() > fitsAt ? -2 : 6) * scale,
    bottom: 70 * scale,
  }) }];
  if (longArtist || longTitle) {
    const artist = { style: {}, clientWidth: 80, get scrollWidth() {
      return longArtist && (Number.parseFloat(this.style.fontSize) || size()) > fitsAt ? 90 : 80;
    }, getBoundingClientRect: () => ({
      top: 35 * scale,
      bottom: ((Number.parseFloat(artist.style.fontSize) || size()) + (longTitle ? size() : 0) > fitsAt ? 85 : 70) * scale,
    }) };
    square.children.push(artist);
  }
  const context = {
    cardsPerPage: { value: mode },
    getComputedStyle: () => ({ fontSize: "12.333px", borderTopWidth: "2px", borderBottomWidth: "2px", paddingTop: "4px", paddingBottom: "4px" }),
  };
  vm.createContext(context);
  vm.runInContext(fit, context);
  context.fitSquareText(square);
  if (longArtist || longTitle) return { title: square.style.fontSize, artist: square.children[1].style.fontSize };
  return square.style.fontSize;
}

test("a long artist shrinks without shrinking a short title", () => {
  for (const mode of ["1", "2"]) {
    const result = run({ mode, longArtist: true, fitsAt: 8.5 });
    assert.equal(result.title, "");
    assert.ok(Number.parseFloat(result.artist) <= 8.5);
  }
});

test("a long title shares the height reduction with its artist", () => {
  const result = run({ longTitle: true, fitsAt: 20 });
  const title = Number.parseFloat(result.title);
  const artist = Number.parseFloat(result.artist);
  assert.ok(title < 12.333);
  assert.ok(artist >= title * 0.8);
  assert.ok(title + artist <= 20);
});

test("short two-up entries keep the larger starting size", () => {
  assert.equal(run({ fitsAt: 13 }), "");
});
test("centred title overflow is fitted even when scrollHeight reports no overflow", () => {
  assert.ok(Number.parseFloat(run()) <= 11);
});
test("scaled preview and unscaled export fit consistently", () => {
  assert.equal(run({ scale: 0.5 }), run());
});
test("extreme text never steps below the existing minimum", () => {
  assert.equal(run({ fitsAt: 0, scroll: true }), "5.8px");
});
test("full-size music text also fits centred overflow", () => {
  assert.ok(Number.parseFloat(run({ mode: "1" })) <= 11);
  assert.equal(run({ mode: "1", fitsAt: 0, scroll: true }), "8px");
});
test("non-music text and image free squares are unaffected by the centred check", () => {
  assert.equal(run({ mode: "1", music: false }), "");
  assert.equal(run({ image: true }), undefined);
});
