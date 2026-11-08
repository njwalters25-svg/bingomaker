const assert = require("node:assert/strict");
const test = require("node:test");
const { buildPicturePngPack } = require("../picture-bingo-png.js");

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
  assert.equal(files.size, 32);
  assert.equal([...files.keys()].filter(name => name.startsWith("full-page/")).length, 20);
  assert.equal([...files.keys()].filter(name => name.startsWith("two-up/")).length, 2);
  assert.equal([...files.keys()].filter(name => name.startsWith("calling-cards/")).length, 9);
  assert.equal(files.get("offline-caller.png"), "caller png");
  assert.deepEqual(jobs.filter(job => job.twoUp).map(job => job.pages), [[[0], [1]], [[2], [3]]]);
  assert.deepEqual(jobs.filter(job => job.calling).flatMap(job => job.pages.flat()), game.pictures);
  assert.deepEqual(progress.at(-1), [32, 32]);
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
