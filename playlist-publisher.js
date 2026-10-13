const playlistPublishingOrigin = "https://alloccasionsbingo.com";
let pendingPlaylistPublication = null;

async function makeCatalogueHeader(source) {
  if (!source) return "";
  const image = new Image();
  image.src = source;
  await image.decode();
  const scale = Math.min(900 / image.naturalWidth, 600 / image.naturalHeight, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL("image/jpeg", 0.9);
  if (data.length > 500000) throw new Error("Catalogue header is too large to publish.");
  return data;
}

function getCatalogueSettings() {
  return { etsy: normalizeEtsyListingUrl(inputs.etsyListingUrl?.value || ""), visible: inputs.catalogueVisible?.checked === true ? "1" : "0" };
}

function isEtsyListingUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["etsy.com", "www.etsy.com", "alloccasionsbingo.etsy.com"].includes(url.hostname) && !url.username && !url.password && !url.port &&
      /^\/(?:[a-z]{2}\/)?listing\/\d+(?:\/.*)?$/.test(url.pathname);
  } catch { return false; }
}

function getPublishingPlaylistId(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "open.spotify.com" || url.username || url.password || url.port) return null;
    return /^\/playlist\/([A-Za-z0-9]{22})\/?$/.exec(url.pathname)?.[1] || null;
  } catch { return null; }
}

function beginPlaylistPublication() {
  if (getCurrentBrand().id !== "all-occasions-bingo") {
    setStatus("Choose All Occasions Bingo to publish a playlist page.", true);
    return;
  }
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(selectedCloudGameId)) {
    setStatus("Save this game to Supabase first, then publish its playlist page.", true);
    return;
  }
  const title = getProductName();
  const playlistId = getPublishingPlaylistId(inputs.spotifyFullUrl.value.trim());
  if (!title || title.length > 160 || !playlistId) {
    setStatus("Enter a game title (up to 160 characters) and a valid Spotify playlist link.", true);
    return;
  }
  const nonce = crypto.randomUUID();
  const catalogue = getCatalogueSettings();
  if ((catalogue.etsy && !isEtsyListingUrl(catalogue.etsy)) || (catalogue.visible === "1" && !catalogue.etsy)) {
    setStatus("Add a valid Etsy listing URL before showing this game in the catalogue.", true);
    return;
  }
  const url = new URL("/publisher/", playlistPublishingOrigin);
  url.search = new URLSearchParams({game: selectedCloudGameId, title, playlist: playlistId, nonce, origin: location.origin, artwork: "header", ...catalogue});
  const popup = window.open(url.href, "_blank");
  if (!popup) {
    setStatus("Allow the publishing tab to open, then try again.", true);
    return;
  }
  pendingPlaylistPublication = {popup, nonce, game: selectedCloudGameId, title, playlistId, catalogue, headerSource: typeof headerImageData === "string" ? headerImageData : "", revision: editionRevision};
  setStatus("Confirm Publish in the secure publishing tab. Your preview link will update afterward.");
}

async function receivePlaylistPublication(event) {
  const pending = pendingPlaylistPublication;
  if (!pending || event.origin !== playlistPublishingOrigin || event.source !== pending.popup) return;
  const data = event.data;
  if (!data || data.nonce !== pending.nonce || data.game !== pending.game) return;
  if (data.type === "aob-header-request") {
    try {
      const header = await makeCatalogueHeader(pending.headerSource);
      if (pendingPlaylistPublication !== pending) return;
      pending.popup.postMessage({type: "aob-header-ready", game: pending.game, nonce: pending.nonce, header}, playlistPublishingOrigin);
    } catch (error) { setStatus(error.message || "Could not prepare the catalogue header. Reopen publishing and try again.", true); }
    return;
  }
  if (data.type !== "aob-playlist-published") return;
  let url;
  try { url = new URL(data.url); } catch { return; }
  if (url.origin !== playlistPublishingOrigin || url.username || url.password || url.search || url.hash || !/^\/play\/[a-z0-9-]+\/$/.test(url.pathname)) return;
  pendingPlaylistPublication = null;
  if (selectedCloudGameId !== pending.game || editionRevision !== pending.revision || getCurrentBrand().id !== "all-occasions-bingo" || getProductName() !== pending.title || getPublishingPlaylistId(inputs.spotifyFullUrl.value.trim()) !== pending.playlistId || JSON.stringify(getCatalogueSettings()) !== JSON.stringify(pending.catalogue) || (typeof headerImageData === "string" ? headerImageData : "") !== pending.headerSource) {
    setStatus(`Published ${pending.title}, but the open game changed. Its preview link was not replaced: ${url.href}`, true);
    return;
  }
  inputs.spotifyPreviewUrl.value = url.href;
  inputs.spotifyPreviewUrl.dispatchEvent(new Event("input", {bubbles: true}));
  setStatus("Playlist page and catalogue settings published; click Save current game to keep these settings in Supabase.");
}

document.querySelector("#publishPlaylistButton")?.addEventListener("click", beginPlaylistPublication);
window.addEventListener("message", receivePlaylistPublication);
