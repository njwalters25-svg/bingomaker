const assert = require("node:assert/strict");
const test = require("node:test");
const { labelFromFilename, makePictureBoards, makeCallingPages, containedImage, opaqueBounds, headerBorderColor, boardLabels, restorePictureBoards, writePicturePdf, buildPicturePack } = require("../picture-bingo.js");

const pictures = Array.from({ length: 36 }, (_, i) => ({
  id: i + 1, label: `Picture ${i + 1}`, width: 750, height: 500, data: "jpeg",
}));
function randomSource() {
  let seed = 31;
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

test("image trimming keeps white and semitransparent artwork", () => {
  const pixels = new Uint8ClampedArray(6 * 5 * 4);
  assert.equal(opaqueBounds(pixels, 6, 5), null);
  pixels.set([255, 255, 255, 255], (1 * 6 + 2) * 4);
  pixels.set([255, 255, 255, 1], (3 * 6 + 4) * 4);
  assert.deepEqual(opaqueBounds(pixels, 6, 5), [2, 1, 5, 4]);
});

test("filename labels and portrait/landscape images keep their proportions", () => {
  assert.equal(labelFromFilename("snow-man_1.png"), "Snow man 1");
  assert.deepEqual(containedImage(pictures[0], 0, 0, 150, 150), [0, 25, 150, 100]);
  assert.deepEqual(containedImage({ width: 500, height: 750 }, 0, 0, 150, 150), [25, 0, 100, 150]);
});

test("both layouts generate distinct boards with no repeated picture in a board", () => {
  for (const layout of [4, 5]) {
    for (const quantity of [50, 100]) {
      const boards = makePictureBoards(pictures, layout, quantity, randomSource());
      assert.equal(boards.length, quantity);
      assert.equal(new Set(boards.map(board => JSON.stringify(board.map(p => p?.id)))).size, quantity);
      for (const board of boards) {
        assert.equal(board.length, layout * layout);
        if (layout === 5) assert.equal(board[12], null);
        else assert.ok(board.every(Boolean));
        assert.equal(new Set(board).size, board.length);
      }
    }
  }
  assert.deepEqual(makePictureBoards(pictures.slice(0, 23), 5, 50), []);
  assert.deepEqual(makePictureBoards(pictures.slice(0, 15), 4, 50), []);
});

function recorder() {
  const pdf = { images: [], labels: [], rectangles: [], borders: [], sizes: [], lines: [], dashes: [], pageCount: 1 };
  Object.assign(pdf, {
    addImage: (...args) => pdf.images.push(args),
    text: (...args) => { pdf.labels.push(args); pdf.sizes.push(pdf.fontSize); },
    rect: (...args) => pdf.rectangles.push(args),
    line: (...args) => pdf.lines.push(args),
    setLineDashPattern: pattern => pdf.dashes.push(pattern),
    addPage: () => pdf.pageCount++,
    splitTextToSize: value => [value],
    setFont() {}, setTextColor() {}, setDrawColor: (...args) => pdf.borders.push(args), setLineWidth() {}, setFontSize: size => { pdf.fontSize = size; },
  });
  return pdf;
}

test("board PDF draws text separately and reuses 36 image aliases across 100 pages", () => {
  const pages = makePictureBoards(pictures, 5, 100, randomSource());
  const pdf = writePicturePdf(recorder(), { title: "Christmas Bingo", pages, layout: 5 });
  assert.equal(pdf.pageCount, 100);
  assert.equal(pdf.images.length, 2400);
  assert.deepEqual(pdf.dashes, []);
  assert.equal(new Set(pdf.images.map(args => args[6])).size, 36);
  assert.equal(pdf.labels.filter(([label]) => label === "Free").length, 100);
  assert.equal(pdf.labels.filter(([label]) => label === "Space").length, 100);
  assert.ok(pdf.rectangles.every(([, , , , style]) => !style));
  assert.ok(pdf.labels.some(([label]) => label === "Picture 36"));
  for (const [, , x, y, width, height] of pdf.images) {
    assert.ok(x >= 24 && x + width <= 588 && y >= 190 && y + height <= 754);
  }
});

test("header colour ignores white and transparent padding", () => {
  assert.equal(headerBorderColor([255, 255, 255, 255, 230, 60, 40, 255, 0, 0, 255, 0]), "#e63c28");
  assert.equal(headerBorderColor([255, 255, 255, 255]), "#c18f22");
});

test("labels reserve room for the longest entry without making that label smaller", () => {
  const pdf = recorder();
  pdf.splitTextToSize = text => text === "Long title" ? ["Long", "title"] : [text];
  const { size, height } = boardLabels(pdf, [{ id: 1, label: "Short" }, { id: 2, label: "Long title" }], 5);
  assert.equal(size, 13);
  assert.ok(height >= 2 * size * 1.1);
});

test("two-up reuses the same boards and images on half as many pages", () => {
  const pages = makePictureBoards(pictures, 5, 100, randomSource());
  const pdf = writePicturePdf(recorder(), { title: "Christmas Bingo", pages, layout: 5, twoUp: true, border: "#a21c32" });
  assert.equal(pdf.pageCount, 50);
  assert.equal(pdf.images.length, 2400);
  assert.equal(new Set(pdf.images.map(args => args[6])).size, 36);
  assert.equal(pdf.borders.filter(([color]) => color === "#a21c32").length, 100);
  assert.ok(pdf.images.slice(0, 24).every(([, , x, , w]) => x + w < 396));
  assert.ok(pdf.images.slice(24, 48).every(([, , x, y, w, h]) => x > 396 && x + w < 792 && y + h < 612));
  assert.equal(new Set(pdf.sizes.filter((size, i) => /^Picture /.test(pdf.labels[i][0]))).size, 1);
});

test("wide board artwork stays above the grid, shares an alias and is not on calling sheets", () => {
  const header = { width: 900, height: 300, data: "header-jpeg" };
  const pages = makePictureBoards(pictures, 5, 2, randomSource());
  const boards = writePicturePdf(recorder(), { title: "Christmas Bingo", pages, layout: 5, header });
  const artwork = boards.images.filter(args => args[6] === "board-header");
  assert.equal(artwork.length, 2);
  for (const [, , x, y, width, height] of artwork) {
    assert.equal(width / height, 3);
    assert.ok(x >= 24 && x + width <= 588 && y >= 28 && y + height < 190);
  }
  assert.deepEqual(boards.rectangles[0], [16, 16, 580, 760]);
  assert.ok(boards.rectangles.filter(([, y]) => y !== 16).every(([, y, , h]) => y >= 190 && y + h <= 754));
  const calling = writePicturePdf(recorder(), { title: "Christmas Bingo", pages: makeCallingPages(pictures), calling: true, header });
  assert.ok(calling.images.every(args => args[6] !== "board-header"));
});

test("calling sheets include every picture once, with four cut-out slots per page", () => {
  for (const count of [30, 36]) {
    const pages = makeCallingPages(pictures.slice(0, count));
    const pdf = writePicturePdf(recorder(), { title: "Christmas Bingo", pages, calling: true });
    assert.equal(pdf.pageCount, Math.ceil(count / 4));
    assert.equal(pdf.rectangles.length, pdf.pageCount);
    assert.equal(pdf.lines.length, pdf.pageCount * 2);
    assert.deepEqual(pdf.dashes.slice(0, 2), [[3, 2], []]);
    assert.equal(pdf.images.length, count);
    assert.equal(pdf.labels.filter(([label]) => label === "Christmas Bingo").length, count);
    assert.equal(new Set(pdf.images.map(args => args[6])).size, count);
  }
});

test("saved game round-trip keeps the exact board arrangement and shared picture objects", () => {
  const boards = makePictureBoards(pictures, 5, 50, randomSource());
  const saved = JSON.parse(JSON.stringify({
    layout: 5, quantity: 50, pictures,
    boards: boards.map(board => board.map(picture => picture?.id ?? null)),
  }));
  const restored = restorePictureBoards(saved);
  assert.deepEqual(restored, boards);
  assert.equal(restored[0][0], saved.pictures.find(picture => picture.id === restored[0][0].id));
  saved.boards[0][0] = 9999;
  assert.throws(() => restorePictureBoards(saved), /Invalid saved board/);
});

test("download all puts both board formats, calling cards and caller in one folder", async () => {
  const files = new Map();
  const zip = {
    folder(name) {
      assert.equal(name, "Christmas-Bingo-50-boards");
      return { file: (filename, value) => files.set(filename, value) };
    },
    generateAsync: () => "zip",
  };
  const game = { title: "Christmas Bingo", pictures, layout: 5, boards: makePictureBoards(pictures, 5, 50, randomSource()) };
  function MockPdf(options) {
    const pdf = recorder();
    pdf.output = () => ({ pages: pdf.pageCount, options, images: pdf.images.map(image => image[6]) });
    return pdf;
  }
  const archive = await buildPicturePack(zip, MockPdf, game, (title, items) => {
    assert.equal(title, game.title);
    assert.equal(items, pictures);
    return "offline caller";
  });
  assert.equal(archive, "zip");
  assert.equal(files.size, 4);
  const full = files.get("Christmas-Bingo-50-boards-full-page.pdf");
  const twoUp = files.get("Christmas-Bingo-50-boards-2-up.pdf");
  assert.equal(full.pages, 50);
  assert.equal(twoUp.pages, 25);
  assert.deepEqual(twoUp.images, full.images);
  assert.equal(files.get("Christmas-Bingo-calling-cards.pdf").pages, 9);
  assert.equal(files.get("Christmas-Bingo-bingo-caller.html"), "offline caller");
});
