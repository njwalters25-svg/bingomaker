const assert = require("node:assert/strict");
const test = require("node:test");
const { buildPicturePngPack, buildPictureListingPack, pictureListingPages } = require("../picture-bingo-png.js");

test("the listing ZIP exports the promo as the ninth JPG and feeds the ordered slides to the MP4 recorder", async () => {
  const jobs = [], names = [], labels = [];
  const imageSources = [];
  const originalFetch = global.fetch;
  let calls = 0, closed = 0;
  const context = new Proxy({ fillText: text => labels.push(text) }, { get: (obj, key) => obj[key] ?? (() => {}) });
  const canvas = {
    getContext: () => context,
    toBlob(callback, type) {
      assert.equal(type, "image/jpeg");
      assert.equal(this.width, 2000);
      assert.equal(this.height, 2000);
      callback(new Blob(["jpg"], { type }));
    },
  };
  try {
    global.document = { createElement: () => canvas };
    global.Image = class { width = 2000; height = 2000; async decode() { imageSources.push(this.src); } };
    global.createImageBitmap = async () => ({ width: 500, height: 700, close() { closed++; } });
    global.location = { protocol: "https:" };
    global.fetch = async url => {
      assert.equal(url, "picture-listing-save-50.jpg");
      return new Response("original promo", { headers: { "content-type": "image/jpeg" } });
    };
    const game = { boards: Array.from({ length: 100 }, (_, id) => [id]), pictures: Array.from({ length: 36 }, (_, id) => id) };
    const zip = { file(name, bytes) {
      names.push(name);
      if (name === "09-save-50.jpg") assert.equal(Buffer.from(bytes).toString(), "original promo");
    }, generateAsync: () => "jpg-zip" };
    const result = await buildPictureListingPack(zip, game, "background.jpg", job => {
      jobs.push(job);
      return new ArrayBuffer(0);
    }, () => { calls++; return new ArrayBuffer(0); }, undefined, async slides => {
      assert.equal(slides.length, 9);
      assert.equal(Buffer.from(slides.at(-1)).toString(), "original promo");
      return new Blob(["video"], { type: "video/mp4" });
    });
    assert.equal(result, "jpg-zip");
    assert.deepEqual(names, [...pictureListingPages(100).map(([name]) => name + ".jpg"), "09-save-50.jpg", "listing-video.mp4"]);
    assert.deepEqual(imageSources, ["background.jpg", "picture-listing-desk.jpg"]);
    assert.equal(calls, 1);
    assert.equal(closed, 13);
    assert.deepEqual(jobs.filter(job => job.calling).map(job => job.pages[0]), [[0, 1, 2, 3], [4, 5, 6, 7]]);
    assert.deepEqual(jobs.filter(job => job.guidePage).map(job => job.guidePage), [1, 2, 3]);
    assert.deepEqual(jobs.filter(job => "boardStart" in job).map(job => job.boardStart), [0, 1, 2, 3, 4, 5]);
    assert.ok(labels.includes("100 boards, two per page"));
    assert.ok(labels.includes("100 UNIQUE BINGO BOARDS"));
    assert.ok(labels.includes("36 FUN"));
  } finally {
    delete global.document;
    delete global.Image;
    delete global.createImageBitmap;
    delete global.location;
    global.fetch = originalFetch;
  }
});

test("Etsy PNG ZIP includes 20 boards, two paired sheets, all calling sheets and the caller", async () => {
  const files = new Map();
  const progress = [];
  const jobs = [];
  const game = {
    boards: Array.from({ length: 50 }, (_, id) => [id]),
    pictures: Array.from({ length: 36 }, (_, id) => ({ id })),
  };
  const zip = { file: (name, value) => files.set(name, value), generateAsync: () => "png-zip" };
  const result = await buildPicturePngPack(zip, game, job => {
    jobs.push(job);
    return "sheet png";
  }, () => "caller png", (index, total) => progress.push([index, total]));
  assert.equal(result, "png-zip");
  assert.equal(files.size, 36);
  assert.deepEqual([...files.keys()].filter(name => name.startsWith("instructions/")), [
    "instructions/how-to-play.png", "instructions/markers-full-page.png", "instructions/markers-two-up.png",
  ]);
  assert.deepEqual(jobs.filter(job => job.guidePage).map(job => job.guidePage), [1, 2, 3]);
  assert.equal(JSON.parse(files.get("listing-data.json")).boardCount, 50);
  assert.equal(JSON.parse(files.get("listing-data.json")).pictureCount, 36);
  assert.equal([...files.keys()].filter(name => name.startsWith("full-page/")).length, 20);
  assert.equal([...files.keys()].filter(name => name.startsWith("two-up/")).length, 2);
  assert.equal([...files.keys()].filter(name => name.startsWith("calling-cards/")).length, 9);
  assert.equal(files.get("offline-caller.png"), "caller png");
  assert.deepEqual(jobs.filter(job => job.twoUp).map(job => job.pages), [[[0], [1]], [[2], [3]]]);
  assert.deepEqual(jobs.filter(job => job.calling).flatMap(job => job.pages.flat()), game.pictures);
  assert.deepEqual(progress.at(-1), [35, 35]);
});

test("a failed caller screenshot does not produce a partial download", async () => {
  let generated = false;
  const zip = { file() {}, generateAsync() { generated = true; } };
  await assert.rejects(
    buildPicturePngPack(zip, { boards: [], pictures: [] }, () => {}, () => { throw new Error("Capture failed"); }),
    /Capture failed/,
  );
  assert.equal(generated, false);
});
