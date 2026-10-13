const playlistPublishingOrigin = "https://alloccasionsbingo.com";
let pendingPlaylistPublication = null;

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
  url.search = new URLSearchParams({game: selectedCloudGameId, title, playlist: playlistId, nonce, origin: location.origin, ...catalogue});
  const popup = window.open(url.href, "_blank");
  if (!popup) {
    setStatus("Allow the publishing tab to open, then try again.", true);
    return;
  }
  pendingPlaylistPublication = {popup, nonce, game: selectedCloudGameId, title, playlistId, catalogue, revision: editionRevision};
  setStatus("Confirm Publish in the secure publishing tab. Your preview link will update afterward.");
}

function receivePlaylistPublication(event) {
  const pending = pendingPlaylistPublication;
  if (!pending || event.origin !== playlistPublishingOrigin || event.source !== pending.popup) return;
  const data = event.data;
  if (!data || data.type !== "aob-playlist-published" || data.nonce !== pending.nonce || data.game !== pending.game) return;
  let url;
  try { url = new URL(data.url); } catch { return; }
  if (url.origin !== playlistPublishingOrigin || url.username || url.password || url.search || url.hash || !/^\/play\/[a-z0-9-]+\/$/.test(url.pathname)) return;
  pendingPlaylistPublication = null;
  if (selectedCloudGameId !== pending.game || editionRevision !== pending.revision || getCurrentBrand().id !== "all-occasions-bingo" || getProductName() !== pending.title || getPublishingPlaylistId(inputs.spotifyFullUrl.value.trim()) !== pending.playlistId || JSON.stringify(getCatalogueSettings()) !== JSON.stringify(pending.catalogue)) {
    setStatus(`Published ${pending.title}, but the open game changed. Its preview link was not replaced: ${url.href}`, true);
    return;
  }
  inputs.spotifyPreviewUrl.value = url.href;
  inputs.spotifyPreviewUrl.dispatchEvent(new Event("input", {bubbles: true}));
  setStatus("Playlist page and catalogue settings published; click Save current game to keep these settings in Supabase.");
}

document.querySelector("#publishPlaylistButton")?.addEventListener("click", beginPlaylistPublication);
window.addEventListener("message", receivePlaylistPublication);
