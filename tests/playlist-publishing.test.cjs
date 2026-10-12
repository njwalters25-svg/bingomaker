const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const listeners = {};
const popup = {};
const context = {
  URL, URLSearchParams, Event,
  crypto: {randomUUID: () => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'},
  selectedCloudGameId: '11111111-1111-1111-1111-111111111111', editionRevision: 1,
  brand: 'all-occasions-bingo', title: '80s Music Bingo',
  location: {origin: 'null'},
  inputs: {spotifyFullUrl: {value: 'https://open.spotify.com/playlist/3q2S3GW2PxyJMJ5oDSEyv1?si=test'}, spotifyPreviewUrl: {value: 'old', dispatchEvent: () => { context.events++; }}},
  events: 0,
  document: {querySelector: () => ({addEventListener: () => {}})},
  window: {open: url => {context.opened = url; return popup;}, addEventListener: (type, handler) => { listeners[type] = handler; }},
  setStatus: message => {context.status = message;},
};
context.getCurrentBrand = () => ({id: context.brand});
context.getProductName = () => context.title;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../playlist-publisher.js'), 'utf8'), context);
const id = '3q2S3GW2PxyJMJ5oDSEyv1';
assert.equal(context.getPublishingPlaylistId(`https://open.spotify.com/playlist/${id}`), id);
for (const url of [`http://open.spotify.com/playlist/${id}`, `https://evil.example/playlist/${id}`, `https://user@open.spotify.com/playlist/${id}`, `https://open.spotify.com/track/${id}`, 'javascript:alert(1)']) assert.equal(context.getPublishingPlaylistId(url), null);
context.brand = 'all-occasions-printables';
context.beginPlaylistPublication(); assert.equal(context.opened, undefined);
context.brand = 'all-occasions-bingo';
const game = context.selectedCloudGameId;
context.selectedCloudGameId = ''; context.beginPlaylistPublication(); assert.equal(context.opened, undefined);
context.selectedCloudGameId = game; context.beginPlaylistPublication();
assert.equal(new URL(context.opened).searchParams.get('playlist'), id);
assert.equal(new URL(context.opened).searchParams.get('origin'), 'null');
const data = {type: 'aob-playlist-published', game, nonce: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', url: `https://alloccasionsbingo.com/play/game-${game}/`};
const event = {origin: 'https://alloccasionsbingo.com', source: popup, data};
listeners.message({...event, origin:'https://evil.example'});
listeners.message({...event, source:{}});
listeners.message({...event, data:{...data, nonce:'wrong'}});
listeners.message({...event, data:{...data, url:'https://evil.example/'}});
assert.equal(context.events, 0);
context.editionRevision++; listeners.message(event);
assert.equal(context.inputs.spotifyPreviewUrl.value, 'old');
context.beginPlaylistPublication(); listeners.message(event);
assert.equal(context.inputs.spotifyPreviewUrl.value, data.url); assert.equal(context.events, 1);
listeners.message(event); assert.equal(context.events, 1);
context.beginPlaylistPublication(); context.selectedCloudGameId = '22222222-2222-2222-2222-222222222222'; listeners.message(event);
assert.equal(context.events, 1);
console.log('PASS: Spotify validation, brand/save guards, authenticated-origin/source/nonce checks, stale-game protection, one preview update.');
