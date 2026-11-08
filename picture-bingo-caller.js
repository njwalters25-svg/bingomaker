"use strict";

function runOfflineCaller() {
  const game = JSON.parse(document.getElementById("game-data").textContent);
  const byId = id => document.getElementById(id);
  const next = byId("next-call");
  const restart = byId("restart");
  const picture = byId("called-picture");
  const label = byId("called-label");
  const count = byId("call-count");
  const history = byId("call-history");
  let deck = [];
  let called = 0;

  document.title = game.title + " | Bingo Caller";
  byId("game-name").textContent = game.title;
  if (game.header) {
    const artwork = byId("game-header");
    artwork.src = game.header;
    artwork.alt = game.title;
    artwork.hidden = false;
    byId("game-name").hidden = true;
  }
  function reset() {
    deck = [...game.pictures];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    called = 0;
    picture.hidden = true;
    picture.removeAttribute("src");
    label.textContent = "Ready to play";
    count.textContent = "0 of " + deck.length + " called";
    history.replaceChildren();
    next.disabled = !deck.length;
    restart.disabled = true;
  }

  next.addEventListener("click", () => {
    const item = deck.pop();
    if (!item) return;
    called++;
    picture.src = item.data;
    picture.hidden = false;
    label.textContent = item.label;
    count.textContent = called + " of " + game.pictures.length + " called" + (deck.length ? "" : " · All pictures called");
    const row = document.createElement("li");
    const thumbnail = document.createElement("img");
    thumbnail.src = item.data;
    thumbnail.alt = "";
    thumbnail.loading = "lazy";
    const text = document.createElement("span");
    text.textContent = item.label;
    row.append(thumbnail, text);
    history.append(row);
    next.disabled = !deck.length;
    restart.disabled = false;
    if (!deck.length) restart.focus();
  });
  restart.addEventListener("click", () => {
    if (!deck.length || window.confirm("Start a new round and clear the call history?")) {
      reset();
      next.focus();
    }
  });
  reset();
}

function buildOfflineCaller(title, pictures, header = null) {
  // Keep game text inert even if a title or label contains HTML or a script end tag.
  const data = JSON.stringify({ title, pictures: pictures.map(({ label, data }) => ({ label, data })), ...(header?.data ? { header: header.data } : {}) })
    .replaceAll("<", "\\u003c");
  return '<!doctype html>\n' + `<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
  <title>Picture Bingo Caller</title>
  <style>
    :root { color-scheme: light; font: 16px/1.4 system-ui, sans-serif; color: #19272a; background: #f3f7f6; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    header { padding: 20px max(18px, calc((100% - 1120px) / 2)); background: #fff; border-bottom: 1px solid #cedbd9; }
    h1, h2, p { margin: 0; overflow-wrap: anywhere; }
    h1 { font-size: 25px; }
    h2 { font-size: 18px; }
    #game-header { display: block; width: min(100%, 720px); height: auto; max-height: 150px; object-fit: contain; margin-inline: auto; }
    main { max-width: 1160px; margin: auto; padding: 20px; display: grid; grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr); gap: 24px; }
    .stage { background: white; border: 1px solid #cedbd9; min-height: 360px; padding: 16px; display: grid; grid-template-rows: minmax(220px, 1fr) auto; place-items: center; gap: 10px; }
    #called-picture { width: 100%; height: min(46vh, 440px); min-height: 220px; object-fit: contain; }
    #called-label { grid-row: 2; text-align: center; font-size: 30px; font-weight: 750; }
    #call-count { margin-top: 12px; color: #415a5c; }
    .controls { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
    button { font: inherit; font-weight: 650; color: #203437; background: #fff; border: 1px solid #a6b9b8; border-radius: 5px; padding: 11px 16px; cursor: pointer; }
    #next-call { color: white; background: #006461; border-color: #006461; }
    button:disabled { opacity: .48; cursor: default; }
    :focus-visible { outline: 3px solid #b95319; outline-offset: 3px; }
    ol { margin: 12px 0 0; padding-left: 32px; max-height: 60vh; overflow: auto; }
    li { padding: 6px 4px; border-bottom: 1px solid #cedbd9; overflow-wrap: anywhere; }
    li img { width: 38px; height: 38px; object-fit: contain; vertical-align: middle; margin-right: 8px; background: white; }
    [hidden] { display: none !important; }
    @media (max-width: 700px) {
      main { grid-template-columns: 1fr; padding: 14px; }
      .stage { min-height: 270px; grid-template-rows: minmax(170px, 1fr) auto; }
      #called-picture { height: min(34vh, 320px); min-height: 170px; }
      #called-label { font-size: 24px; }
      #game-header { max-height: 110px; }
      ol { max-height: none; }
    }
  </style>
</head>
<body>
  <header>
    <h1 id="game-name">Picture Bingo</h1>
    <img id="game-header" alt="" hidden>
  </header>
  <main>
    <section aria-label="Bingo caller">
      <div class="stage">
        <img id="called-picture" alt="" hidden>
        <p id="called-label" aria-live="polite">Ready to play</p>
      </div>
      <p id="call-count" role="status"></p>
      <div class="controls">
        <button type="button" id="next-call">Next call</button>
        <button type="button" id="restart" disabled>Restart</button>
      </div>
    </section>
    <section aria-labelledby="history-heading">
      <h2 id="history-heading">Call history</h2>
      <ol id="call-history"></ol>
    </section>
  </main>
  <script id="game-data" type="application/json">${data}</script>
  <script>(${runOfflineCaller.toString()})();</script>
</body>
</html>`;
}

if (typeof module !== "undefined") module.exports = { buildOfflineCaller };
