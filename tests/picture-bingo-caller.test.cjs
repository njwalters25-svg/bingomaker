const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const { buildOfflineCaller } = require("../picture-bingo-caller.js");

const pictures = ["Snowman", "Mince Pie", "Star", "Bell"].map(label => ({
  label, data: "data:image/jpeg;base64,AA==",
}));

test("caller embeds the game without external scripts or requests and escapes markup", () => {
  const title = '</script><script>alert("test")</script>';
  const html = buildOfflineCaller(title, pictures);
  assert.ok(!html.includes(title));
  assert.match(html, /default-src 'none'; img-src data:/);
  assert.doesNotMatch(html, /<(?:script|link)[^>]*(?:src|href)=/);
  const json = html.match(/<script id="game-data" type="application\/json">(.*?)<\/script>/s)[1];
  assert.deepEqual(JSON.parse(json), { title, pictures });
});

test("caller draws every picture exactly once and restarts with a fresh history", () => {
  const header = { data: "data:image/jpeg;base64,AQ==" };
  const html = buildOfflineCaller("Christmas Bingo", pictures, header);
  const nodes = new Map();
  function node() {
    return {
      children: [],
      addEventListener(event, action) { this[event] = action; },
      append(...items) { this.children.push(...items); },
      replaceChildren() { this.children = []; },
      removeAttribute(name) { delete this[name]; },
      focus() {},
    };
  }
  const byId = id => {
    if (!nodes.has(id)) nodes.set(id, node());
    return nodes.get(id);
  };
  byId("game-data").textContent = html.match(/<script id="game-data" type="application\/json">(.*?)<\/script>/s)[1];
  const script = html.match(/<script>(.*?)<\/script>/s)[1];
  vm.runInNewContext(script, { document: { getElementById: byId, createElement: node }, window: { confirm: () => false } });
  assert.equal(byId("game-name").textContent, "Christmas Bingo");
  assert.equal(byId("game-name").hidden, true);
  assert.equal(byId("game-header").hidden, false);
  assert.equal(byId("game-header").src, header.data);
  assert.equal(byId("game-header").alt, "Christmas Bingo");
  assert.equal(byId("called-picture").hidden, true);
  const calls = new Set();
  byId("next-call").click();
  calls.add(byId("called-label").textContent);
  byId("restart").click();
  assert.equal(byId("call-history").children.length, 1);
  for (let i = 1; i < pictures.length; i++) {
    byId("next-call").click();
    calls.add(byId("called-label").textContent);
  }
  assert.deepEqual(calls, new Set(pictures.map(p => p.label)));
  assert.equal(byId("next-call").disabled, true);
  assert.match(byId("call-count").textContent, /All pictures called/);
  byId("restart").click();
  assert.equal(byId("call-history").children.length, 0);
  assert.equal(byId("call-count").textContent, "0 of 4 called");
  assert.equal(byId("next-call").disabled, false);
});
