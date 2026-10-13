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
const appSource = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
vm.runInContext(appSource.slice(appSource.indexOf('function normalizeEtsyListingUrl('), appSource.indexOf('function getSettingsSnapshot(')), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../playlist-publisher.js'), 'utf8'), context);
context.inputs.etsyListingUrl = { value: '' };
context.inputs.catalogueVisible = { checked: false };
assert.equal(context.normalizeEtsyListingUrl(' 4594024039 '), 'https://alloccasionsbingo.etsy.com/listing/4594024039');
assert.equal(context.normalizeEtsyListingUrl('https://www.etsy.com/listing/123?ref=test'), 'https://www.etsy.com/listing/123?ref=test');
context.inputs.etsyListingUrl.value = '4594024039';
assert.equal(context.getCatalogueSettings().etsy, 'https://alloccasionsbingo.etsy.com/listing/4594024039');
context.inputs.etsyListingUrl.value = '';
assert(context.isEtsyListingUrl('https://www.etsy.com/uk/listing/123456789/test'));
assert(context.isEtsyListingUrl('https://alloccasionsbingo.etsy.com/listing/4594024039'));
assert.equal(context.isEtsyListingUrl('https://alloccasionsbingo.etsy.com.evil.example/listing/4594024039'), false);
for (const url of ['https://etsy.com.evil.example/listing/123', 'javascript:alert(1)', 'https://www.etsy.com/shop/test', 'https://user@www.etsy.com/listing/123']) assert.equal(context.isEtsyListingUrl(url), false);
context.inputs.catalogueVisible.checked = true;
context.beginPlaylistPublication(); assert.equal(context.opened, undefined);
context.inputs.catalogueVisible.checked = false;
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
assert.equal(new URL(context.opened).searchParams.get('visible'), '0');
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
context.selectedCloudGameId = game;
context.inputs.etsyListingUrl.value = 'https://www.etsy.com/listing/123456789/test';
context.inputs.catalogueVisible.checked = true;
context.beginPlaylistPublication();
assert.equal(new URL(context.opened).searchParams.get('visible'), '1');
context.inputs.catalogueVisible.checked = false;
listeners.message(event);
assert.equal(context.events, 1);
(async () => {
  const sent = [];
  popup.postMessage = (...args) => sent.push(args);
  context.headerImageData = '';
  context.beginPlaylistPublication();
  assert.equal(new URL(context.opened).searchParams.get('artwork'), 'header');
  const request = {...event, data:{type:'aob-header-request',game,nonce:data.nonce}};
  await listeners.message({...request, origin:'https://evil.example'});
  await listeners.message({...request, source:{}});
  assert.equal(sent.length, 0);
  await listeners.message(request);
  assert.equal(sent[0][0].header, '');
  assert.equal(sent[0][1], 'https://alloccasionsbingo.com');
  const draws = [];
  context.Image = class { naturalWidth = 1800; naturalHeight = 600; async decode() {} };
  const canvas = { getContext:()=>({fillRect:(...args)=>draws.push(args),drawImage:(...args)=>draws.push(args)}),toDataURL:()=> 'data:image/jpeg;base64,YQ==' };
  context.document.createElement = () => canvas;
  assert.equal(await context.makeCatalogueHeader('image-source'), 'data:image/jpeg;base64,YQ==');
  assert.equal(canvas.width, 900); assert.equal(canvas.height, 300);
  assert.equal(draws.length, 2);
  canvas.toDataURL = () => 'x'.repeat(500001);
  await assert.rejects(context.makeCatalogueHeader('image-source'), /too large/);
  context.beginPlaylistPublication(); context.headerImageData = 'changed-header';
  const before = context.events;
  await listeners.message(event);
  assert.equal(context.events, before);
  console.log('PASS: publishing guards, header transfer origin/source/nonce, proportional resize, size limit, stale-header protection and existing preview updates.');
})().catch(error => {console.error(error);process.exitCode=1;});
