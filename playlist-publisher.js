const playlistPublishingOrigin = "https://alloccasionsbingo.com";
let pendingPlaylistPublication = null;

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
  const url = new URL("/publisher/", playlistPublishingOrigin);
  url.search = new URLSearchParams({game: selectedCloudGameId, title, playlist: playlistId, nonce, origin: location.origin});
  const popup = window.open(url.href, "_blank");
  if (!popup) {
    setStatus("Allow the publishing tab to open, then try again.", true);
    return;
  }
  pendingPlaylistPublication = {popup, nonce, game: selectedCloudGameId, title, playlistId, revision: editionRevision};
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
  if (selectedCloudGameId !== pending.game || editionRevision !== pending.revision || getCurrentBrand().id !== "all-occasions-bingo" || getProductName() !== pending.title || getPublishingPlaylistId(inputs.spotifyFullUrl.value.trim()) !== pending.playlistId) {
    setStatus(`Published ${pending.title}, but the open game changed. Its preview link was not replaced: ${url.href}`, true);
    return;
  }
  inputs.spotifyPreviewUrl.value = url.href;
  inputs.spotifyPreviewUrl.dispatchEvent(new Event("input", {bubbles: true}));
  setStatus("Playlist page published. Preview link and QR updated; click Save game to keep the link in Supabase.");
}

document.querySelector("#publishPlaylistButton")?.addEventListener("click", beginPlaylistPublication);
window.addEventListener("message", receivePlaylistPublication);
