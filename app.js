const form = document.querySelector("#bingoForm");
const cardsContainer = document.querySelector("#cards");
const extrasContainer = document.querySelector("#extras");
const cardTemplate = document.querySelector("#cardTemplate");
const instructionsTemplate = document.querySelector("#instructionsTemplate");
const tipsTemplate = document.querySelector("#tipsTemplate");
const masterListTemplate = document.querySelector("#masterListTemplate");
const markersTemplate = document.querySelector("#markersTemplate");
const thankYouTemplate = document.querySelector("#thankYouTemplate");
const statusMessage = document.querySelector("#statusMessage");
const cardTotal = document.querySelector("#cardTotal");
const listHelp = document.querySelector("#listHelp");
const qualityWarnings = document.querySelector("#qualityWarnings");
const headerImageInput = document.querySelector("#headerImage");
const markerImageInput = document.querySelector("#markerImage");
const freeImageInput = document.querySelector("#freeImage");
const spotifyFullQrInput = document.querySelector("#spotifyFullQr");
const spotifyPreviewQrInput = document.querySelector("#spotifyPreviewQr");
const freePresetGrid = document.querySelector("#freePresetGrid");
const printFullSizeButton = document.querySelector("#printFullSizeButton");
const printTwoUpButton = document.querySelector("#printTwoUpButton");
const printExtrasButton = document.querySelector("#printExtrasButton");
const pngSamplePackButton = document.querySelector("#pngSamplePackButton");
const resetButton = document.querySelector("#resetButton");
const savedGameSelect = document.querySelector("#savedGameSelect");
const saveGameButton = document.querySelector("#saveGameButton");
const loadSavedGameButton = document.querySelector("#loadSavedGameButton");
const newCloudGameButton = document.querySelector("#newCloudGameButton");
const deleteSavedGameButton = document.querySelector("#deleteSavedGameButton");
const pageSize = document.querySelector("#pageSize");
const cardsPerPage = document.querySelector("#cardsPerPage");
const printPageStyle = document.querySelector("#printPageStyle");
const primaryColor = document.querySelector("#primaryColor");
const highlightColor = document.querySelector("#highlightColor");

let freeImageData = "";
let freeImageAspectRatio = 1;
let selectedFreePreset = "text";
let headerImageData = "";
let markerImageData = "";
let spotifyFullQrData = "";
let spotifyPreviewQrData = "";
let isRestoringSettings = false;
let currentCards = [];
let currentItems = [];
let generatedSettingsDirty = false;
let savedGames = [];
let selectedCloudGameId = "";

const storageKey = "allOccasionsBingoMakerSettings";
const supabaseUrl = "https://idlihjucxernlbwkndca.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkbGloanVjeGVybmxid2tuZGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTc0NDAsImV4cCI6MjA5NjIzMzQ0MH0.dlbkCbpin2GhnJQgZurgUa0KZqeZx7P3pDukd1ZMFYk";
const supabaseClient = window.supabase?.createClient(supabaseUrl, supabaseAnonKey) || null;
const pdfExportScale = 1.35;
const pdfJpegQuality = 0.84;
const etsyMaxFileSizeMb = 20;
const pngExportScale = 1.5;

function getControl(primarySelector, fallbackSelector = null) {
  return document.querySelector(primarySelector) || (fallbackSelector ? document.querySelector(fallbackSelector) : null);
}

const inputs = {
  productName: getControl("#productName", "#occasionInput"),
  count: document.querySelector("#cardCount"),
  items: document.querySelector("#itemList"),
  freeText: document.querySelector("#freeText"),
  spotifyFullUrl: document.querySelector("#spotifyFullUrl"),
  spotifyPreviewUrl: document.querySelector("#spotifyPreviewUrl"),
  footerText: document.querySelector("#footerText"),
};

const centerIndex = 12;
const freePresetBasePath = "public/free-square/";
let freePresetImages = {};
const pageDimensions = {
  letter: [816, 1056],
  a4: [794, 1123],
};

function parseItems(value) {
  const separator = value.includes("\n") ? /\n/ : /,/;
  return [...new Set(
    value
      .split(separator)
      .map((item) => item.trim())
      .filter(Boolean)
  )];
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function makeCardItems(items) {
  const chosenItems = shuffle(items).slice(0, 24);
  chosenItems.splice(centerIndex, 0, "__FREE__");
  return chosenItems;
}

function getCardSignature(cardItems) {
  return cardItems.join("|");
}

function makeUniqueCards(items, count) {
  const cards = [];
  const signatures = new Set();
  let attempts = 0;

  while (cards.length < count && attempts < count * 80) {
    const cardItems = makeCardItems(items);
    const signature = getCardSignature(cardItems);
    if (!signatures.has(signature)) {
      signatures.add(signature);
      cards.push(cardItems);
    }
    attempts += 1;
  }

  return cards;
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function getProductName() {
  return inputs.productName?.value?.trim() || "";
}

function getSettingsSnapshot() {
  return {
    productName: inputs.productName?.value || "",
    count: inputs.count.value,
    items: inputs.items.value,
    currentItems,
    currentCards,
    generatedSettingsDirty,
    freeText: inputs.freeText.value,
    freeImageData,
    freeImageAspectRatio,
    headerImageData,
    markerImageData,
    spotifyFullUrl: inputs.spotifyFullUrl.value,
    spotifyPreviewUrl: inputs.spotifyPreviewUrl.value,
    spotifyFullQrData,
    spotifyPreviewQrData,
    freePreset: selectedFreePreset,
    footerText: inputs.footerText.value,
    pageSize: pageSize.value,
    cardsPerPage: cardsPerPage.value,
    primaryColor: primaryColor.value,
    highlightColor: highlightColor.value,
  };
}

function applySettingsSnapshot(savedSettings) {
  if (!savedSettings) {
    return;
  }

  isRestoringSettings = true;
  if (inputs.productName) {
    inputs.productName.value = savedSettings.productName ?? savedSettings.occasion ?? "";
  }
  inputs.count.value = savedSettings.count || "100";
  inputs.items.value = savedSettings.items ?? "";
  currentItems = Array.isArray(savedSettings.currentItems) ? savedSettings.currentItems : [];
  currentCards = Array.isArray(savedSettings.currentCards) ? savedSettings.currentCards : [];
  generatedSettingsDirty = Boolean(savedSettings.generatedSettingsDirty);
  inputs.freeText.value = savedSettings.freeText || "FREE";
  freeImageData = savedSettings.freeImageData || "";
  freeImageAspectRatio = Number(savedSettings.freeImageAspectRatio) || 1;
  headerImageData = savedSettings.headerImageData || "";
  markerImageData = savedSettings.markerImageData || "";
  inputs.spotifyFullUrl.value = savedSettings.spotifyFullUrl || "";
  inputs.spotifyPreviewUrl.value = savedSettings.spotifyPreviewUrl || "";
  spotifyFullQrData = savedSettings.spotifyFullQrData || "";
  spotifyPreviewQrData = savedSettings.spotifyPreviewQrData || "";
  selectedFreePreset = savedSettings.freeImageData ? "custom" : (savedSettings.freePreset === "custom" ? "text" : (savedSettings.freePreset || "text"));
  inputs.footerText.value = savedSettings.footerText ?? "";
  pageSize.value = savedSettings.pageSize || "letter";
  cardsPerPage.value = savedSettings.cardsPerPage || "2";
  primaryColor.value = savedSettings.primaryColor || "#e33c2f";
  highlightColor.value = savedSettings.highlightColor || "#137b80";
  headerImageInput.value = "";
  markerImageInput.value = "";
  if (freeImageInput) {
    freeImageInput.value = "";
  }
  spotifyFullQrInput.value = "";
  spotifyPreviewQrInput.value = "";
  updateFreePresetSelection();
  isRestoringSettings = false;

  applyCurrentColors();
  updateDesignSettings();
  updateListHelp();
  if (currentCards.length > 0 && currentItems.length > 0) {
    renderCurrentOutput();
    renderHelpfulChecks(getHelpfulChecks(currentItems, getRequestedCardCount()));
    setStatus(`Loaded ${currentCards.length} saved card${currentCards.length === 1 ? "" : "s"}.`);
  } else {
    generateCards();
  }
}

function saveSettings() {
  if (isRestoringSettings) {
    return;
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(getSettingsSnapshot()));
  } catch {
    // If browser storage is unavailable, the generator should still work normally.
  }
}

function restoreSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(storageKey));
    if (!savedSettings) {
      return;
    }

    applySettingsSnapshot(savedSettings);
  } catch {
    localStorage.removeItem(storageKey);
  } finally {
    isRestoringSettings = false;
  }
}

function resetSettings() {
  localStorage.removeItem(storageKey);
  selectedCloudGameId = "";
  if (savedGameSelect) {
    savedGameSelect.value = "";
  }
  isRestoringSettings = true;

  if (inputs.productName) {
    inputs.productName.value = "";
  }
  inputs.count.value = "100";
  inputs.items.value = "";
  inputs.freeText.value = "FREE";
  inputs.spotifyFullUrl.value = "";
  inputs.spotifyPreviewUrl.value = "";
  selectedFreePreset = "text";
  inputs.footerText.value = "";
  pageSize.value = "letter";
  cardsPerPage.value = "2";
  primaryColor.value = "#e33c2f";
  highlightColor.value = "#137b80";
  currentCards = [];
  currentItems = [];
  generatedSettingsDirty = false;
  freeImageData = "";
  freeImageAspectRatio = 1;
  headerImageData = "";
  markerImageData = "";
  spotifyFullQrData = "";
  spotifyPreviewQrData = "";
  if (freeImageInput) {
    freeImageInput.value = "";
  }
  spotifyFullQrInput.value = "";
  spotifyPreviewQrInput.value = "";
  updateFreePresetSelection();
  headerImageInput.value = "";
  markerImageInput.value = "";
  isRestoringSettings = false;

  applyCurrentColors();
  updateDesignSettings();
  updateListHelp();
  generateCards();
  setStatus("Saved settings cleared. Paste a list to start again.");
}

function setCloudButtonsBusy(isBusy) {
  [saveGameButton, loadSavedGameButton, newCloudGameButton, deleteSavedGameButton].forEach((button) => {
    if (button) {
      button.disabled = isBusy;
    }
  });
}

function renderSavedGameOptions() {
  if (!savedGameSelect) {
    return;
  }

  savedGameSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = savedGames.length ? "Choose a saved game" : "No saved games yet";
  savedGameSelect.append(placeholder);

  savedGames.forEach((game) => {
    const option = document.createElement("option");
    option.value = game.id;
    option.textContent = game.name || "Untitled bingo";
    savedGameSelect.append(option);
  });

  savedGameSelect.value = selectedCloudGameId;
}

async function loadSavedGames() {
  if (!supabaseClient) {
    setStatus("Supabase could not load. Check the internet connection and refresh.", true);
    return;
  }

  setCloudButtonsBusy(true);
  const { data, error } = await supabaseClient
    .from("bingo_games")
    .select("id, name, updated_at")
    .order("name", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });
  setCloudButtonsBusy(false);

  if (error) {
    console.error(error);
    setStatus(`Saved games could not load: ${error.message}`, true);
    return;
  }

  savedGames = data || [];
  renderSavedGameOptions();
}

async function saveCloudGame({ asNew = false } = {}) {
  if (!supabaseClient) {
    setStatus("Supabase could not load. Check the internet connection and refresh.", true);
    return;
  }

  const name = getProductName() || "Untitled Bingo";
  const payload = {
    name,
    data: getSettingsSnapshot(),
    updated_at: new Date().toISOString(),
  };

  setCloudButtonsBusy(true);
  const query = asNew || !selectedCloudGameId
    ? supabaseClient.from("bingo_games").insert(payload).select("id").single()
    : supabaseClient.from("bingo_games").update(payload).eq("id", selectedCloudGameId).select("id").single();
  const { data, error } = await query;
  setCloudButtonsBusy(false);

  if (error) {
    console.error(error);
    setStatus(`Game could not be saved: ${error.message}`, true);
    return;
  }

  selectedCloudGameId = data.id;
  await loadSavedGames();
  setStatus(`Saved "${name}" to Supabase.`);
}

async function loadSelectedCloudGame() {
  if (!supabaseClient || !savedGameSelect?.value) {
    setStatus("Choose a saved game to load.", true);
    return;
  }

  setCloudButtonsBusy(true);
  const { data, error } = await supabaseClient
    .from("bingo_games")
    .select("id, name, data")
    .eq("id", savedGameSelect.value)
    .single();
  setCloudButtonsBusy(false);

  if (error) {
    console.error(error);
    setStatus(`Game could not be loaded: ${error.message}`, true);
    return;
  }

  selectedCloudGameId = data.id;
  applySettingsSnapshot(data.data);
  saveSettings();
  renderSavedGameOptions();
  setStatus(`Loaded "${data.name || "Untitled bingo"}".`);
}

async function deleteSelectedCloudGame() {
  if (!supabaseClient || !savedGameSelect?.value) {
    setStatus("Choose a saved game to delete.", true);
    return;
  }

  const game = savedGames.find((savedGame) => savedGame.id === savedGameSelect.value);
  const confirmed = window.confirm(`Delete "${game?.name || "this saved game"}" from Supabase?`);
  if (!confirmed) {
    return;
  }

  setCloudButtonsBusy(true);
  const { error } = await supabaseClient
    .from("bingo_games")
    .delete()
    .eq("id", savedGameSelect.value);
  setCloudButtonsBusy(false);

  if (error) {
    console.error(error);
    setStatus(`Game could not be deleted: ${error.message}`, true);
    return;
  }

  selectedCloudGameId = "";
  await loadSavedGames();
  setStatus("Saved game deleted.");
}

function updateListHelp() {
  const itemCount = parseItems(inputs.items.value).length;
  if (itemCount === 0) {
    listHelp.textContent = "Paste one item per line. Commas also work, but one per line is easiest to check.";
  } else if (itemCount < 24) {
    listHelp.textContent = `${itemCount} unique item${itemCount === 1 ? "" : "s"} added. Add at least 24 for a full card with one free square.`;
  } else if (itemCount < 50) {
    listHelp.textContent = `${itemCount} unique items added. This works, but 50-75 gives better variety across multiple cards.`;
  } else {
    listHelp.textContent = `${itemCount} unique items added. Great list size. Around 75 is ideal when generating lots of cards.`;
  }
}

function getHelpfulChecks(items, requestedCount) {
  if (items.length < 24) {
    return [];
  }

  const checks = [];
  const longestItem = items.reduce((longest, item) => item.length > longest.length ? item : longest, "");
  const hasVeryLongWord = items.some((item) => item.split(/\s+/).some((word) => word.length > 16));
  const freeLabel = inputs.freeText.value.trim();

  if (items.length < 50) {
    checks.push("For better variety across lots of cards, 50-75 items works better than a short list.");
  }

  if (items.length !== 75) {
    checks.push(`This list has ${items.length} unique song${items.length === 1 ? "" : "s"}. For your Etsy packs, it should be exactly 75. Check for duplicates or missing songs.`);
  }

  if (requestedCount > 30 && items.length < 60) {
    checks.push("You are making quite a few cards from this list. Add more items if you want the cards to feel more different.");
  }

  if (longestItem.length > 52) {
    checks.push("Some items are very long and may print smaller. Shorten long titles or remove extra featuring details if needed.");
  } else if (hasVeryLongWord) {
    checks.push("Some long words or artist names may need extra space. Check the preview before printing.");
  }

  if (cardsPerPage.value === "2" && freeLabel.length > 16 && !getFreeImageSrc()) {
    checks.push("The free square is much smaller in 2-per-page mode, so short free-square text will print best.");
  }

  return checks;
}

function renderHelpfulChecks(checks) {
  qualityWarnings.replaceChildren();
  checks.forEach((check) => {
    const item = document.createElement("li");
    item.textContent = check;
    qualityWarnings.append(item);
  });
}

function getProductionChecklistMissingItems() {
  const missing = [];

  if (!headerImageData) {
    missing.push("header image");
  }
  if (!markerImageData) {
    missing.push("bingo marker image");
  }
  if (!inputs.spotifyFullUrl.value.trim()) {
    missing.push("full Spotify playlist link");
  }
  if (!inputs.spotifyPreviewUrl.value.trim()) {
    missing.push("embedded preview playlist link");
  }
  if (!spotifyFullQrData) {
    missing.push("full playlist QR code");
  }
  if (!spotifyPreviewQrData) {
    missing.push("preview playlist QR code");
  }

  return missing;
}

function validateReadyToExport(exportType) {
  if (generatedSettingsDirty) {
    setStatus("Your song list or card count changed. Click Generate cards before printing or saving PDFs.", true);
    return false;
  }

  if ((exportType === "cards-full" || exportType === "cards-two-up" || exportType === "current") && currentCards.length === 0) {
    setStatus("Click Generate cards before printing or saving PDFs.", true);
    return false;
  }

  if (currentItems.length !== 75) {
    setStatus(`This game has ${currentItems.length || parseItems(inputs.items.value).length} unique song${currentItems.length === 1 ? "" : "s"}. You need exactly 75 before exporting. Check for duplicates, then click Generate cards.`, true);
    return false;
  }

  const missingItems = getProductionChecklistMissingItems();
  if (missingItems.length > 0) {
    setStatus(`Add these before exporting: ${missingItems.join(", ")}.`, true);
    return false;
  }

  return true;
}

function updateDesignSettings() {
  document.body.dataset.page = pageSize.value;
  document.body.dataset.cardsPerPage = cardsPerPage.value;
  const printSizes = {
    letter: {
      1: "8.5in 11in",
      2: "11in 8.5in",
    },
    a4: {
      1: "210mm 297mm",
      2: "297mm 210mm",
    },
  };
  printPageStyle.textContent = `@page { size: ${printSizes[pageSize.value][cardsPerPage.value]}; margin: 0; }`;
  updatePreviewScale();
  fitAllSquareText();
}

function updateCustomColors() {
  applyCurrentColors();
}

function applyCurrentColors() {
  const colorTargets = [document.documentElement, document.body];
  colorTargets.forEach((target) => {
    target.style.setProperty("--accent", primaryColor.value);
    target.style.setProperty("--accent-2", highlightColor.value);
    target.style.setProperty("--title-color", primaryColor.value);
    target.style.setProperty("--occasion-color", highlightColor.value);
  });
}

function resetTextFitClasses(square) {
  square.classList.remove("text-tight", "text-medium", "text-long", "text-xlong");
  square.style.fontSize = "";
}

function getFreeImageSrc() {
  if (selectedFreePreset === "custom" && freeImageData) {
    return freeImageData;
  }

  return freePresetImages[selectedFreePreset] || "";
}

function createFreePresetOption(preset) {
  const label = document.createElement("label");
  label.className = "free-preset-option";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = "freePreset";
  input.value = preset.id;

  const image = document.createElement("img");
  image.src = preset.src;
  image.alt = "";

  label.append(input, image, preset.label);
  return label;
}

async function loadFreePresetManifest() {
  try {
    const response = await fetch(`${freePresetBasePath}manifest.json?v=20260503-free-presets`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Free preset manifest failed with ${response.status}`);
    }

    const presets = await response.json();
    freePresetImages = {};
    presets.forEach((preset) => {
      if (!preset.id || !preset.src) {
        return;
      }

      const normalizedPreset = {
        id: preset.id,
        label: preset.label || preset.id,
        src: preset.src.startsWith("http") || preset.src.startsWith("/") ? preset.src : `${freePresetBasePath}${encodeURIComponent(preset.src)}?v=20260504`,
      };
      freePresetImages[normalizedPreset.id] = normalizedPreset.src;

      if (!freePresetGrid.querySelector(`input[name="freePreset"][value="${normalizedPreset.id}"]`)) {
        freePresetGrid.append(createFreePresetOption(normalizedPreset));
      }
    });
  } catch (error) {
    console.warn(error);
  } finally {
    if (selectedFreePreset !== "text" && selectedFreePreset !== "custom" && !freePresetImages[selectedFreePreset]) {
      selectedFreePreset = "text";
    }
    updateFreePresetSelection();
    if (currentCards.length > 0 || currentItems.length > 0) {
      renderCurrentOutput();
    } else {
      generateCards();
    }
  }
}

function updateFreePresetSelection() {
  const selected = freePresetGrid?.querySelector(`input[name="freePreset"][value="${selectedFreePreset}"]`);
  if (selected) {
    selected.checked = true;
  }
}

function formatTitleText(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed !== trimmed.toUpperCase()) {
    return trimmed;
  }

  return trimmed.split(/(\s+|-|\/)/).map((part) => {
    if (!/[A-Z]/.test(part) || /[./]/.test(part)) {
      return part;
    }
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join("");
}

function parseMusicItem(value) {
  const trimmed = value.trim();
  const separatorPatterns = [
    /\s+\|\s+/,
    /\s+[–—]\s+/,
    /\s+-\s+/,
    /\s+by\s+/i,
    /\s*[|]\s*/,
    /\s+[–—]\s*/,
    /\s+-\s*/,
  ];

  for (const pattern of separatorPatterns) {
    const parts = trimmed.split(pattern);
    if (parts.length >= 2 && parts[0].trim() && parts.slice(1).join(" ").trim()) {
      return {
        title: formatTitleText(parts[0]),
        artist: parts.slice(1).join(" ").trim().toLocaleUpperCase("en-US"),
      };
    }
  }

  const looseHyphenMatch = trimmed.match(/^(.+?)[-–—](.+)$/);
  if (looseHyphenMatch) {
    return {
      title: formatTitleText(looseHyphenMatch[1]),
      artist: looseHyphenMatch[2].trim().toLocaleUpperCase("en-US"),
    };
  }

  return null;
}

function createSquare(value) {
  const square = document.createElement("div");
  square.className = "square";

  if (value === "__FREE__") {
    square.classList.add("free");
    const freeImageSrc = getFreeImageSrc();
    if (freeImageSrc) {
      const image = document.createElement("img");
      image.src = freeImageSrc;
      image.alt = inputs.freeText.value.trim() || "Free square";
      square.append(image);
    } else {
      const freeLabel = inputs.freeText.value.trim() || "FREE";
      square.textContent = freeLabel;
      applyTextFitClasses(square, freeLabel);
    }
    return square;
  }

  const musicItem = parseMusicItem(value);
  if (musicItem) {
    const title = document.createElement("span");
    title.className = "song-title";
    title.textContent = musicItem.title;

    const artist = document.createElement("span");
    artist.className = "song-artist";
    artist.textContent = musicItem.artist;

    square.classList.add("music-square");
    square.append(title, artist);
  } else {
    square.textContent = value;
  }
  applyTextFitClasses(square, value);
  return square;
}

function applyTextFitClasses(square, value) {
  if (value.split(/\s+/).some((word) => word.length > 12)) {
    square.classList.add("text-tight");
  }
  if (value.length > 42) {
    square.classList.add("text-xlong");
  } else if (value.length > 30) {
    square.classList.add("text-long");
  } else if (value.length > 18) {
    square.classList.add("text-medium");
  }
}

function fitSquareText(square) {
  if (square.querySelector("img")) {
    return;
  }

  square.style.fontSize = "";
  const baseSize = Number.parseFloat(getComputedStyle(square).fontSize);
  const minimumSize = cardsPerPage.value === "2" ? 5.8 : 8;
  let size = baseSize;

  while (size > minimumSize && (square.scrollHeight > square.clientHeight || square.scrollWidth > square.clientWidth)) {
    size -= 0.5;
    square.style.fontSize = `${size}px`;
  }
}

function fitAllSquareText() {
  requestAnimationFrame(() => {
    document.querySelectorAll(".square").forEach(fitSquareText);
  });
}

function getCurrentPageSize() {
  const [pageWidth, pageHeight] = pageDimensions[pageSize.value];
  const isTwoUp = cardsPerPage.value === "2";
  const cardWidth = isTwoUp ? pageHeight / 2 : pageWidth;
  const cardHeight = isTwoUp ? (pageHeight / 2) * (pageHeight / pageWidth) : pageHeight;
  return {
    pageWidth,
    pageHeight,
    sheetWidth: isTwoUp ? pageHeight : pageWidth,
    sheetHeight: isTwoUp ? pageWidth : pageHeight,
    cardWidth,
    cardHeight,
    orientation: isTwoUp ? "landscape" : "portrait",
  };
}

function getProductNameForFilename() {
  return getProductName()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "bingo";
}

function getProductNameForTitle() {
  return getProductName()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Bingo";
}

function getPdfFilename(exportType = "current") {
  const productName = getProductNameForFilename();
  const suffixes = {
    "cards-full": "bingo-cards",
    "cards-two-up": "bingo-cards-2-to-a-page",
    extras: "instructions",
    current: cardsPerPage.value === "2" ? "bingo-cards-2-to-a-page" : "bingo-cards",
  };
  return `${productName}-${suffixes[exportType] || suffixes.current}.pdf`;
}

function getPrintDocumentTitle(exportType) {
  const productName = getProductNameForTitle();
  const suffixes = {
    "cards-full": "Bingo Cards",
    "cards-two-up": "Bingo Cards 2 to a page",
    extras: "Instructions",
  };
  return `${productName} ${suffixes[exportType] || "Bingo Cards"}`;
}

function cloneForPdf(page, width, height) {
  const clone = page.cloneNode(true);
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.margin = "0";
  clone.style.transform = "none";
  clone.style.boxShadow = "none";
  clone.style.setProperty("--preview-scale", "1");
  return clone;
}

function createPdfSheet(width, height, isTwoUp = false) {
  const sheet = document.createElement("div");
  sheet.className = `pdf-export-sheet${isTwoUp ? " two-up" : ""}`;
  sheet.style.width = `${width}px`;
  sheet.style.height = `${height}px`;
  return sheet;
}

function createPdfExportArea({ includeCards = true, includeExtras = true } = {}) {
  const sizing = getCurrentPageSize();
  const exportArea = document.createElement("div");
  exportArea.className = "pdf-export-area";
  exportArea.style.width = `${sizing.sheetWidth}px`;
  exportArea.style.setProperty("--screen-page-width", `${sizing.cardWidth}px`);
  exportArea.style.setProperty("--screen-page-height", `${sizing.cardHeight}px`);

  if (includeCards) {
    const cards = [...cardsContainer.querySelectorAll(".bingo-card")];
    for (let index = 0; index < cards.length; index += cardsPerPage.value === "2" ? 2 : 1) {
      const sheet = createPdfSheet(sizing.sheetWidth, sizing.sheetHeight, cardsPerPage.value === "2");
      sheet.append(cloneForPdf(cards[index], sizing.cardWidth, sizing.cardHeight));
      if (cardsPerPage.value === "2" && cards[index + 1]) {
        sheet.append(cloneForPdf(cards[index + 1], sizing.cardWidth, sizing.cardHeight));
      }
      exportArea.append(sheet);
    }
  }

  if (includeExtras) {
    [...extrasContainer.querySelectorAll(".extra-page")].forEach((page) => {
      const sheet = createPdfSheet(sizing.sheetWidth, sizing.sheetHeight);
      sheet.append(cloneForPdf(page, sizing.sheetWidth, sizing.sheetHeight));
      exportArea.append(sheet);
    });
  }

  return { exportArea, sizing };
}

function addPdfExportOverrides(clonedDocument) {
  const style = clonedDocument.createElement("style");
  style.textContent = `
    .pdf-export-area,
    .pdf-export-sheet,
    .pdf-export-area .bingo-card,
    .pdf-export-area .extra-page {
      box-shadow: none !important;
    }

    .pdf-export-area .card-header {
      background: #fff !important;
      background-image: none !important;
    }

    .pdf-export-area .square.free {
      background: #fff !important;
    }

    .pdf-export-area .instructions-page section,
    .pdf-export-area .marker-token {
      background: #fff !important;
    }
  `;
  clonedDocument.head.append(style);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3
    ? clean.split("").map((letter) => letter + letter).join("")
    : clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mixWithWhite(hex, amount = 0.85) {
  const [red, green, blue] = hexToRgb(hex);
  return [
    Math.round(red + (255 - red) * amount),
    Math.round(green + (255 - green) * amount),
    Math.round(blue + (255 - blue) * amount),
  ];
}

function setPdfColor(pdf, method, color) {
  const rgb = Array.isArray(color) ? color : hexToRgb(color);
  pdf[method](rgb[0], rgb[1], rgb[2]);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function drawFittedText(pdf, text, x, y, width, height, options = {}) {
  const {
    align = "center",
    valign = "middle",
    maxSize = 14,
    minSize = 6,
    font = "helvetica",
    style = "bold",
    color = "#191714",
    lineHeight = 1.12,
  } = options;
  let fontSize = maxSize;
  let lines = [];

  pdf.setFont(font, style);
  setPdfColor(pdf, "setTextColor", color);

  do {
    pdf.setFontSize(fontSize);
    lines = pdf.splitTextToSize(text, width);
    if (lines.length * fontSize * lineHeight <= height) {
      break;
    }
    fontSize -= 0.5;
  } while (fontSize > minSize);

  const renderedHeight = lines.length * fontSize * lineHeight;
  const startY = valign === "top"
    ? y + fontSize
    : y + ((height - renderedHeight) / 2) + fontSize;
  const textX = align === "left" ? x : x + width / 2;

  lines.forEach((line, index) => {
    pdf.text(line, textX, startY + index * fontSize * lineHeight, { align });
  });
}

function drawBingoCardPdf(pdf, cardItems, x, y, width, height) {
  const primary = primaryColor.value;
  const highlight = highlightColor.value;
  const muted = "#70685f";
  const scale = width / 816;
  const paddingX = width * 0.052;
  const paddingTop = height * 0.028;
  const paddingBottom = height * 0.022;
  const headerHeight = height * 0.19;
  const footerHeight = height * 0.045;
  const gridGap = width * 0.016;
  const gridTop = y + paddingTop + headerHeight + height * 0.02;
  const gridHeight = height - paddingTop - paddingBottom - headerHeight - footerHeight - height * 0.04;
  const gridWidth = width - paddingX * 2;
  const cellSize = Math.min((gridWidth - gridGap * 4) / 5, (gridHeight - gridGap * 4) / 5);
  const gridX = x + (width - (cellSize * 5 + gridGap * 4)) / 2;
  const footerY = gridTop + cellSize * 5 + gridGap * 4 + height * 0.018;

  setPdfColor(pdf, "setDrawColor", primary);
  pdf.setLineWidth(Math.max(1, 2 * scale));
  pdf.rect(x, y, width, height);

  setPdfColor(pdf, "setDrawColor", primary);
  pdf.setLineWidth(Math.max(2, 4 * scale));
  pdf.line(x + paddingX, y + paddingTop + headerHeight, x + width - paddingX, y + paddingTop + headerHeight);

  cardItems.forEach((value, index) => {
    const col = index % 5;
    const row = Math.floor(index / 5);
    const cellX = gridX + col * (cellSize + gridGap);
    const cellY = gridTop + row * (cellSize + gridGap);
    const isFree = value === "__FREE__";

    setPdfColor(pdf, "setDrawColor", isFree ? primary : highlight);
    setPdfColor(pdf, "setFillColor", isFree ? mixWithWhite(highlight, 0.83) : "#ffffff");
    pdf.setLineWidth(Math.max(0.6, isFree ? 2 * scale : 1 * scale));
    pdf.roundedRect(cellX, cellY, cellSize, cellSize, 5 * scale, 5 * scale, "FD");

    if (isFree && freeImageData) {
      try {
        const imageFormat = freeImageData.includes("image/jpeg") || freeImageData.includes("image/jpg") ? "JPEG" : "PNG";
        const imageBox = cellSize * 0.72;
        const imageRatio = freeImageAspectRatio > 0 ? freeImageAspectRatio : 1;
        const imageWidth = imageRatio >= 1 ? imageBox : imageBox * imageRatio;
        const imageHeight = imageRatio >= 1 ? imageBox / imageRatio : imageBox;
        const imageX = cellX + (cellSize - imageWidth) / 2;
        const imageY = cellY + (cellSize - imageHeight) / 2;
        pdf.addImage(freeImageData, imageFormat, imageX, imageY, imageWidth, imageHeight);
      } catch {
        drawFittedText(pdf, inputs.freeText.value.trim() || "FREE", cellX + 6, cellY + 6, cellSize - 12, cellSize - 12, {
          maxSize: 18 * scale,
          minSize: 6,
          color: primary,
        });
      }
      return;
    }

    drawFittedText(pdf, isFree ? (inputs.freeText.value.trim() || "FREE") : value, cellX + 7 * scale, cellY + 7 * scale, cellSize - 14 * scale, cellSize - 14 * scale, {
      maxSize: isFree ? 20 * scale : 15.5 * scale,
      minSize: cardsPerPage.value === "2" ? 5.5 : 7.5,
      color: isFree ? primary : "#191714",
      lineHeight: 1.1,
    });
  });

  const footerText = inputs.footerText.value.trim();
  if (footerText) {
    setPdfColor(pdf, "setDrawColor", highlight);
    pdf.setLineWidth(Math.max(1, 1.5 * scale));
    pdf.line(x + paddingX, footerY, x + width - paddingX, footerY);
    drawFittedText(pdf, footerText, x + paddingX, footerY + footerHeight * 0.18, width - paddingX * 2, footerHeight * 0.55, {
      maxSize: clamp(15 * scale, 6, 16),
      minSize: 5,
      color: muted,
    });
  }
}

function addPdfPage(pdf, sizing, pageIndex) {
  if (pageIndex > 0) {
    pdf.addPage([sizing.sheetWidth, sizing.sheetHeight], sizing.orientation);
  }
}

function drawInstructionsPdf(pdf, sizing, pageIndex) {
  addPdfPage(pdf, sizing, pageIndex);
  const margin = sizing.sheetWidth * 0.08;
  let y = sizing.sheetHeight * 0.11;
  drawFittedText(pdf, "Game guide", margin, y, sizing.sheetWidth - margin * 2, 34, {
    maxSize: 20,
    color: highlightColor.value,
    font: "helvetica",
  });
  y += 40;
  drawFittedText(pdf, "How to play", margin, y, sizing.sheetWidth - margin * 2, 64, {
    maxSize: 48,
    minSize: 24,
    font: "times",
    style: "bold",
    color: primaryColor.value,
  });
  y += 90;
  const steps = [
    "Print the bingo cards and give one card to each player.",
    "Print the master checklist for the host to use as the call sheet.",
    "Choose your winning pattern before the game starts.",
    "Call items in any order and tick each one off as it is used.",
    "Players cover matching squares with markers, counters, or a pen.",
    "The first player to complete the chosen pattern calls Bingo.",
  ];
  steps.forEach((step, index) => {
    drawFittedText(pdf, `${index + 1}. ${step}`, margin, y, sizing.sheetWidth - margin * 2, 34, {
      align: "left",
      valign: "top",
      maxSize: 18,
      minSize: 10,
      style: "normal",
    });
    y += 42;
  });
  y += 18;
  drawFittedText(pdf, "Common winning patterns", margin, y, sizing.sheetWidth - margin * 2, 32, {
    align: "left",
    maxSize: 22,
    color: primaryColor.value,
  });
  y += 34;
  drawFittedText(pdf, "One row, one column, a diagonal line, four corners, or a full house.", margin, y, sizing.sheetWidth - margin * 2, 50, {
    align: "left",
    maxSize: 18,
    style: "normal",
  });
}

function drawMasterListPdf(pdf, sizing, pageIndex, items) {
  addPdfPage(pdf, sizing, pageIndex);
  const margin = sizing.sheetWidth * 0.055;
  const sortedItems = [...items].sort((first, second) => first.localeCompare(second, undefined, { sensitivity: "base" }));
  drawFittedText(pdf, "Master checklist", margin, 42, sizing.sheetWidth - margin * 2, 54, {
    maxSize: 40,
    font: "times",
    style: "bold",
    color: primaryColor.value,
  });
  const columns = cardsPerPage.value === "2" ? 4 : 3;
  const rows = Math.ceil(sortedItems.length / columns);
  const top = 120;
  const columnWidth = (sizing.sheetWidth - margin * 2) / columns;
  const rowHeight = Math.min(24, (sizing.sheetHeight - top - 60) / rows);

  sortedItems.forEach((item, index) => {
    const column = Math.floor(index / rows);
    const row = index % rows;
    const x = margin + column * columnWidth;
    const y = top + row * rowHeight;
    setPdfColor(pdf, "setDrawColor", highlightColor.value);
    pdf.rect(x, y + 4, 10, 10);
    drawFittedText(pdf, `${String(index + 1).padStart(2, "0")}  ${item}`, x + 16, y, columnWidth - 20, rowHeight, {
      align: "left",
      maxSize: 11,
      minSize: 6,
      style: "bold",
    });
  });
}

function drawMarkersPdf(pdf, sizing, pageIndex) {
  addPdfPage(pdf, sizing, pageIndex);
  const across = cardsPerPage.value === "2" ? 11 : 6;
  const down = cardsPerPage.value === "2" ? 9 : 7;
  const margin = sizing.sheetWidth * 0.05;
  const top = 105;
  const gap = 8;
  const token = Math.min((sizing.sheetWidth - margin * 2 - gap * (across - 1)) / across, (sizing.sheetHeight - top - 50 - gap * (down - 1)) / down);
  drawFittedText(pdf, "Bingo markers", margin, 42, sizing.sheetWidth - margin * 2, 50, {
    maxSize: 38,
    font: "times",
    style: "bold",
    color: primaryColor.value,
  });
  for (let index = 0; index < across * down; index += 1) {
    const col = index % across;
    const row = Math.floor(index / across);
    const x = margin + col * (token + gap);
    const y = top + row * (token + gap);
    setPdfColor(pdf, "setDrawColor", highlightColor.value);
    setPdfColor(pdf, "setFillColor", mixWithWhite(highlightColor.value, 0.86));
    pdf.circle(x + token / 2, y + token / 2, token / 2, "FD");
    drawFittedText(pdf, getProductName() || "Bingo", x + token * 0.12, y + token * 0.16, token * 0.76, token * 0.45, {
      maxSize: token * 0.12,
      minSize: 4,
      color: primaryColor.value,
    });
    drawFittedText(pdf, "BINGO", x + token * 0.16, y + token * 0.6, token * 0.68, token * 0.22, {
      maxSize: token * 0.13,
      minSize: 4,
      color: highlightColor.value,
      font: "times",
    });
  }
}

function setPdfBusy(isBusy) {
  printFullSizeButton.disabled = isBusy;
  printTwoUpButton.disabled = isBusy;
  printExtrasButton.disabled = isBusy;
  pngSamplePackButton.disabled = isBusy;
  form.querySelector("#generateButton").disabled = isBusy;
  resetButton.disabled = isBusy;
  printFullSizeButton.textContent = isBusy ? "Preparing..." : "Print full size cards";
  printTwoUpButton.textContent = isBusy ? "Preparing..." : "Print 2-up cards";
  printExtrasButton.textContent = isBusy ? "Preparing..." : "Print instructions";
  pngSamplePackButton.textContent = isBusy ? "Preparing..." : "PNG sample pack";
}

function restoreExportSettings(previousCardsPerPage) {
  cardsPerPage.value = previousCardsPerPage;
  updateDesignSettings();
  renderCurrentOutput();
}

function applyExportMode(exportType) {
  if (exportType === "cards-full" || exportType === "extras") {
    cardsPerPage.value = "1";
  } else if (exportType === "cards-two-up") {
    cardsPerPage.value = "2";
  }
}

async function waitForPrintableImages(container = document) {
  const images = [...container.querySelectorAll("img")];
  await Promise.all(images.map((image) => {
    if (image.complete && image.naturalWidth > 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }));
}

function createPngExportArea(width, height) {
  const exportArea = document.createElement("div");
  exportArea.className = "pdf-export-area png-export-area";
  exportArea.style.width = `${width}px`;
  exportArea.style.minHeight = `${height}px`;
  exportArea.style.setProperty("--screen-page-width", `${width}px`);
  exportArea.style.setProperty("--screen-page-height", `${height}px`);
  return exportArea;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function canvasToBlob(canvas, type = "image/png", quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas could not be exported."));
      }
    }, type, quality);
  });
}

async function renderElementToPngBlob(element) {
  await waitForPrintableImages(element);
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: pngExportScale,
    useCORS: true,
    allowTaint: true,
    logging: false,
    onclone: addPdfExportOverrides,
  });
  return canvasToBlob(canvas);
}

async function addElementPngToZip(zip, filename, element, width, height) {
  const exportArea = createPngExportArea(width, height);
  exportArea.append(element);
  document.body.append(exportArea);

  try {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const blob = await renderElementToPngBlob(element);
    zip.file(filename, blob);
  } finally {
    exportArea.remove();
  }
}

async function withTemporaryCardLayout(cardsPerPageValue, callback) {
  const previousCardsPerPage = cardsPerPage.value;
  cardsPerPage.value = cardsPerPageValue;
  updateDesignSettings();
  renderCurrentOutput();

  try {
    return await callback();
  } finally {
    restoreExportSettings(previousCardsPerPage);
  }
}

function createTwoUpSampleSheet(cardElements, startIndex, sizing) {
  const sheet = createPdfSheet(sizing.sheetWidth, sizing.sheetHeight, true);
  sheet.append(cloneForPdf(cardElements[startIndex], sizing.cardWidth, sizing.cardHeight));
  if (cardElements[startIndex + 1]) {
    sheet.append(cloneForPdf(cardElements[startIndex + 1], sizing.cardWidth, sizing.cardHeight));
  }
  return sheet;
}

function renderInstructionsForCount(cardCount) {
  const previousCount = inputs.count.value;
  inputs.count.value = String(cardCount);
  try {
    return renderInstructions();
  } finally {
    inputs.count.value = previousCount;
  }
}

async function exportPngSamplePack() {
  if (!validateReadyToExport("current")) {
    return;
  }

  if (!window.html2canvas || !window.JSZip) {
    setStatus("The PNG exporter is still loading. Please try again in a moment.", true);
    return;
  }

  const originalCardsPerPage = cardsPerPage.value;
  const zip = new JSZip();
  const baseName = getProductNameForFilename();

  setPdfBusy(true);
  setStatus("Creating PNG sample pack...");

  try {
    await withTemporaryCardLayout("1", async () => {
      const sizing = getCurrentPageSize();
      const cards = [...cardsContainer.querySelectorAll(".bingo-card")].slice(0, 20);
      for (const [index, card] of cards.entries()) {
        const clone = cloneForPdf(card, sizing.cardWidth, sizing.cardHeight);
        await addElementPngToZip(zip, `full-size-cards/${String(index + 1).padStart(2, "0")}-${baseName}-card.png`, clone, sizing.cardWidth, sizing.cardHeight);
        setStatus(`Creating PNG sample pack... full-size card ${index + 1} of ${cards.length}`);
      }
    });

    await withTemporaryCardLayout("2", async () => {
      const sizing = getCurrentPageSize();
      const cards = [...cardsContainer.querySelectorAll(".bingo-card")].slice(0, 4);
      for (let index = 0; index < Math.min(2, Math.ceil(cards.length / 2)); index += 1) {
        const sheet = createTwoUpSampleSheet(cards, index * 2, sizing);
        await addElementPngToZip(zip, `two-up-cards/${String(index + 1).padStart(2, "0")}-${baseName}-2-up.png`, sheet, sizing.sheetWidth, sizing.sheetHeight);
        setStatus(`Creating PNG sample pack... 2-up sheet ${index + 1}`);
      }
    });

    await withTemporaryCardLayout("1", async () => {
      const sizing = getCurrentPageSize();
      const markerPages = renderMarkers();
      for (const [index, page] of markerPages.entries()) {
        await addElementPngToZip(zip, `extras/${baseName}-bingo-markers-${index === 0 ? "large" : "small"}.png`, page, sizing.sheetWidth, sizing.sheetHeight);
      }

      const masterPages = renderMasterList(currentItems);
      for (const [index, page] of masterPages.entries()) {
        await addElementPngToZip(zip, `extras/${String(index + 1).padStart(2, "0")}-${baseName}-master-checklist.png`, page, sizing.sheetWidth, sizing.sheetHeight);
      }

      for (const cardCount of [100, 200, 300]) {
        const page = renderInstructionsForCount(cardCount);
        await addElementPngToZip(zip, `instructions/${baseName}-instructions-${cardCount}-cards.png`, page, sizing.sheetWidth, sizing.sheetHeight);
      }
    });

    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, `${baseName}-png-sample-pack.zip`);
    setStatus("Downloaded PNG sample pack.");
  } catch (error) {
    console.error(error);
    setStatus("The PNG sample pack could not be created. Please try again.", true);
  } finally {
    cardsPerPage.value = originalCardsPerPage;
    updateDesignSettings();
    renderCurrentOutput();
    setPdfBusy(false);
  }
}

async function downloadPdf(exportType = "current") {
  const previousCardsPerPage = cardsPerPage.value;

  if (!validateReadyToExport(exportType)) {
    return;
  }

  applyExportMode(exportType);
  updateDesignSettings();
  renderCurrentOutput();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await waitForPrintableImages(document.body);

  if (currentCards.length === 0) {
    setStatus("Add at least 24 unique list items before downloading a PDF.", true);
    restoreExportSettings(previousCardsPerPage);
    return;
  }

  if (!window.html2canvas || !window.jspdf?.jsPDF) {
    setStatus("The PDF maker is still loading. Please try again in a moment.", true);
    restoreExportSettings(previousCardsPerPage);
    return;
  }

  setPdfBusy(true);
  setStatus("Creating your PDF...");

  const { exportArea, sizing } = createPdfExportArea({
    includeCards: exportType !== "extras",
    includeExtras: exportType === "current" || exportType === "extras",
  });
  document.body.append(exportArea);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: sizing.orientation,
      unit: "px",
      format: [sizing.sheetWidth, sizing.sheetHeight],
      compress: true,
    });
    const sheets = [...exportArea.querySelectorAll(".pdf-export-sheet")];

    for (const [index, sheet] of sheets.entries()) {
      if (index > 0) {
        pdf.addPage([sizing.sheetWidth, sizing.sheetHeight], sizing.orientation);
      }

      const canvas = await html2canvas(sheet, {
        backgroundColor: "#ffffff",
        scale: pdfExportScale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: addPdfExportOverrides,
      });
      const image = canvas.toDataURL("image/jpeg", pdfJpegQuality);
      pdf.addImage(image, "JPEG", 0, 0, sizing.sheetWidth, sizing.sheetHeight);
    }

    const filename = getPdfFilename(exportType);
    const pdfSizeMb = pdf.output("arraybuffer").byteLength / (1024 * 1024);
    pdf.save(filename);
    setStatus(`Downloaded ${sheets.length} PDF page${sheets.length === 1 ? "" : "s"} at about ${pdfSizeMb.toFixed(1)} MB${pdfSizeMb > etsyMaxFileSizeMb ? ". Etsy limit is 20 MB, so split this set or reduce card count." : "."}`, pdfSizeMb > etsyMaxFileSizeMb);
  } catch (error) {
    console.error(error);
    setStatus("The PDF could not be created. Please use Print or save PDF instead.", true);
  } finally {
    exportArea.remove();
    setPdfBusy(false);
    restoreExportSettings(previousCardsPerPage);
  }
}

async function printExport(exportType) {
  const previousCardsPerPage = cardsPerPage.value;
  const previousTitle = document.title;

  if (!validateReadyToExport(exportType)) {
    return;
  }

  isRestoringSettings = true;
  applyExportMode(exportType);
  document.body.dataset.printExport = exportType === "extras" ? "extras" : "cards";
  updateDesignSettings();
  renderCurrentOutput();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await waitForPrintableImages(document.body);
  isRestoringSettings = false;

  if ((exportType === "cards-full" || exportType === "cards-two-up") && currentCards.length === 0) {
    setStatus("Add at least 24 unique list items before printing cards.", true);
    delete document.body.dataset.printExport;
    document.title = previousTitle;
    restoreExportSettings(previousCardsPerPage);
    return;
  }

  const restoreAfterPrint = () => {
    window.removeEventListener("afterprint", restoreAfterPrint);
    delete document.body.dataset.printExport;
    document.title = previousTitle;
    isRestoringSettings = true;
    restoreExportSettings(previousCardsPerPage);
    isRestoringSettings = false;
  };

  window.addEventListener("afterprint", restoreAfterPrint, { once: true });
  requestAnimationFrame(() => {
    document.title = getPrintDocumentTitle(exportType);
    window.print();
    setTimeout(() => {
      if (document.body.dataset.printExport) {
        restoreAfterPrint();
      }
    }, 1200);
  });
}

function renderCards(cards) {
  cardsContainer.replaceChildren();

  cards.forEach((cardItems) => {
    const frame = document.createElement("div");
    frame.className = "card-frame";

    const card = cardTemplate.content.firstElementChild.cloneNode(true);
    const cardHeader = card.querySelector(".card-header");
    if (headerImageData) {
      const image = document.createElement("img");
      image.className = "header-image";
      image.src = headerImageData;
      image.alt = getProductName() || "Bingo header";
      cardHeader.append(image);
      card.classList.add("has-header-image");
    } else {
      const placeholder = document.createElement("p");
      placeholder.className = "header-placeholder";
      placeholder.textContent = "Upload header image";
      cardHeader.append(placeholder);
    }
    card.querySelector("footer").textContent = inputs.footerText.value.trim();

    const grid = card.querySelector(".bingo-grid");
    cardItems.forEach((value) => grid.append(createSquare(value)));
    frame.append(card);
    cardsContainer.append(frame);
  });

  cardTotal.textContent = `${cards.length} card${cards.length === 1 ? "" : "s"}`;
  fitAllSquareText();
  updatePreviewScale();
}

function renderCurrentOutput() {
  if (currentCards.length > 0) {
    renderCards(currentCards);
  }

  if (currentItems.length > 0) {
    renderExtras(currentItems);
  }
}

function markCardsNeedRegeneration() {
  generatedSettingsDirty = true;
  updateListHelp();
  const items = parseItems(inputs.items.value);
  const requestedCount = getRequestedCardCount();
  renderHelpfulChecks(getHelpfulChecks(items, requestedCount));

  if (currentCards.length > 0) {
    setStatus("Your list or card count changed. Click Generate cards before printing or saving PDFs.", true);
  }
}

function createExtraFrame(page) {
  const frame = document.createElement("div");
  frame.className = "extra-frame";
  if (page.classList.contains("instructions-page")) {
    frame.classList.add("instructions-frame");
  }
  if (page.classList.contains("thank-you-page")) {
    frame.classList.add("thank-you-frame");
  }
  frame.append(page);
  return frame;
}

function updateHeadingPreview() {
  const markerOccasion = getProductName() || "Bingo";
  const footerText = inputs.footerText.value.trim();

  extrasContainer.querySelectorAll(".marker-occasion").forEach((heading) => {
    heading.textContent = markerOccasion;
  });

  document.querySelectorAll(".bingo-card footer, .extra-page footer").forEach((footer) => {
    footer.textContent = footerText;
  });
}

function updateFreeSquarePreview() {
  const freeLabel = inputs.freeText.value.trim() || "FREE";

  cardsContainer.querySelectorAll(".square.free").forEach((square) => {
    const image = square.querySelector("img");
    if (image) {
      image.alt = freeLabel;
      return;
    }

    resetTextFitClasses(square);
    square.textContent = freeLabel;
    applyTextFitClasses(square, freeLabel);
    fitSquareText(square);
  });

  const items = parseItems(inputs.items.value);
  const requestedCount = Math.min(Math.max(Number(inputs.count.value) || 1, 1), 300);
  renderHelpfulChecks(getHelpfulChecks(items, requestedCount));
}

function setOptionalLink(anchor, url) {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    anchor.removeAttribute("href");
    anchor.textContent = "Add link before exporting";
    anchor.classList.add("missing-link");
    return;
  }

  anchor.href = cleanUrl;
  anchor.textContent = cleanUrl;
  anchor.classList.remove("missing-link");
}

function createPlaylistCard({ title, description, url, qrData, qrAlt }) {
  const card = document.createElement("div");
  card.className = "playlist-card";

  const text = document.createElement("div");
  text.className = "playlist-card-text";

  const heading = document.createElement("h5");
  heading.textContent = title;

  const copy = document.createElement("p");
  copy.textContent = description;

  const link = document.createElement("a");
  link.target = "_blank";
  link.rel = "noopener";
  setOptionalLink(link, url);

  text.append(heading, copy, link);

  const qr = document.createElement("div");
  qr.className = "playlist-qr";
  if (qrData) {
    const image = document.createElement("img");
    image.src = qrData;
    image.alt = qrAlt;
    qr.append(image);
  } else {
    qr.textContent = "QR";
    qr.classList.add("missing-qr");
  }

  card.append(text, qr);
  return card;
}

function getRequestedCardCount() {
  return Math.min(Math.max(Number(inputs.count.value) || 1, 1), 300);
}

function renderInstructions() {
  const page = instructionsTemplate.content.firstElementChild.cloneNode(true);
  const brandImage = page.querySelector(".instructions-brand-image");
  if (headerImageData) {
    brandImage.src = headerImageData;
    brandImage.alt = getProductName() || "Music bingo";
  } else {
    brandImage.remove();
  }

  const includedList = page.querySelector(".included-pack ul");
  [
    `${getRequestedCardCount()} full-size bingo cards`,
    `${getRequestedCardCount()} bingo cards, 2 to a page`,
    "Spotify playlist link and QR code",
    "Embedded preview playlist link and QR code",
    "Master calling checklist",
    "Bingo markers in 2 sizes",
  ].forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    includedList.append(listItem);
  });

  const playlistLinks = page.querySelector(".playlist-links");
  playlistLinks.append(
    createPlaylistCard({
      title: "Full Spotify playlist",
      description: "Open the playlist and press the main Play button. Shuffle is fine, or follow the master checklist.",
      url: inputs.spotifyFullUrl.value,
      qrData: spotifyFullQrData,
      qrAlt: "QR code for the full Spotify playlist",
    }),
    createPlaylistCard({
      title: "Embedded preview playlist",
      description: "Use this option for shorter song previews if the host does not want to log in.",
      url: inputs.spotifyPreviewUrl.value,
      qrData: spotifyPreviewQrData,
      qrAlt: "QR code for the embedded preview playlist",
    }),
  );
  page.querySelector("footer").textContent = inputs.footerText.value.trim();
  return page;
}

function renderTips() {
  const page = tipsTemplate.content.firstElementChild.cloneNode(true);
  const songCount = parseItems(inputs.items.value).length;
  const countCheck = page.querySelector(".playlist-count-check");
  countCheck.textContent = songCount > 0
    ? `Before the game starts, check the playlist shows ${songCount} song${songCount === 1 ? "" : "s"} and that they are playable.`
    : "Before the game starts, check that every playlist track is visible and playable.";
  page.querySelector("footer").textContent = inputs.footerText.value.trim();
  return page;
}

function getMasterListPageSize() {
  return cardsPerPage.value === "2" ? 90 : 84;
}

function getMasterListColumnCount(itemCount) {
  if (cardsPerPage.value === "2") {
    return itemCount > 72 ? 5 : 4;
  }
  return itemCount > 60 ? 4 : 3;
}

function renderMasterListPage(items, startIndex, pageIndex, pageCount) {
  const page = masterListTemplate.content.firstElementChild.cloneNode(true);
  const list = page.querySelector(".master-list");
  const subtitle = page.querySelector(".extra-subtitle");
  const columnCount = getMasterListColumnCount(items.length);
  const rowCount = Math.ceil(items.length / columnCount);

  list.style.setProperty("--master-list-columns", columnCount);
  page.querySelector("footer").textContent = inputs.footerText.value.trim();
  if (items.length > 76) {
    page.classList.add("master-list-ultra-compact");
  } else if (items.length > 54) {
    page.classList.add("master-list-compact");
  }

  if (pageCount > 1) {
    subtitle.textContent = `Call items in any order and tick them off as you go. Page ${pageIndex + 1} of ${pageCount}.`;
  }

  items.forEach((item, index) => {
    const column = Math.floor(index / rowCount);
    const rowPosition = index % rowCount;
    const row = document.createElement("div");
    row.className = "master-list-item";
    row.style.gridColumn = String(column + 1);
    row.style.gridRow = String(rowPosition + 1);

    const box = document.createElement("span");
    box.className = "check-box";
    box.setAttribute("aria-hidden", "true");

    const number = document.createElement("span");
    number.className = "master-number";
    number.textContent = String(startIndex + index + 1).padStart(2, "0");

    const text = document.createElement("span");
    text.className = "master-text";
    text.textContent = item;

    row.append(box, number, text);
    list.append(row);
  });
  return page;
}

function renderMasterList(items) {
  const sortedItems = [...items].sort((first, second) => first.localeCompare(second, undefined, { sensitivity: "base" }));
  const pageSize = getMasterListPageSize();
  const pageCount = Math.ceil(sortedItems.length / pageSize);
  const pages = [];

  for (let startIndex = 0; startIndex < sortedItems.length; startIndex += pageSize) {
    pages.push(renderMasterListPage(
      sortedItems.slice(startIndex, startIndex + pageSize),
      startIndex,
      pages.length,
      pageCount,
    ));
  }

  return pages;
}

function renderMarkersPage(size = "large") {
  const page = markersTemplate.content.firstElementChild.cloneNode(true);
  const grid = page.querySelector(".markers-grid");
  const markerCount = size === "small" ? 99 : 42;
  const occasion = getProductName() || "Bingo";
  const subtitle = page.querySelector(".extra-subtitle");
  page.classList.add(size === "small" ? "markers-page-small" : "markers-page-large");
  subtitle.textContent = size === "small"
    ? "Cut these out for smaller card sets or larger groups."
    : "Cut these out for full-size cards or easier handling.";
  page.querySelector("footer").textContent = inputs.footerText.value.trim();

  for (let marker = 0; marker < markerCount; marker += 1) {
    const token = document.createElement("span");
    token.className = "marker-token";

    if (markerImageData) {
      token.classList.add("has-marker-image");
      const image = document.createElement("img");
      image.className = "marker-image";
      image.src = markerImageData;
      image.alt = `${occasion} bingo marker`;
      token.append(image);
      grid.append(token);
      continue;
    }

    const occasionText = document.createElement("span");
    occasionText.className = "marker-occasion";
    occasionText.textContent = occasion;
    const bingoText = document.createElement("span");
    bingoText.className = "marker-bingo";
    bingoText.textContent = "BINGO";

    token.append(occasionText, bingoText);
    grid.append(token);
  }
  return page;
}

function renderMarkers() {
  return [renderMarkersPage("large"), renderMarkersPage("small")];
}

function renderThankYou() {
  return thankYouTemplate.content.firstElementChild.cloneNode(true);
}

function renderExtras(items) {
  extrasContainer.replaceChildren();
  document.body.dataset.hasExtras = "false";

  extrasContainer.append(createExtraFrame(renderInstructions()));
  extrasContainer.append(createExtraFrame(renderTips()));

  renderMasterList(items).forEach((page) => {
    extrasContainer.append(createExtraFrame(page));
  });

  renderMarkers().forEach((page) => {
    extrasContainer.append(createExtraFrame(page));
  });

  extrasContainer.append(createExtraFrame(renderThankYou()));

  if (extrasContainer.children.length > 0) {
    document.body.dataset.hasExtras = "true";
  }

  updatePreviewScale();
}

function updatePreviewScale() {
  const [pageWidth, pageHeight] = pageDimensions[pageSize.value];
  const isTwoUp = cardsPerPage.value === "2";
  const cardWidth = isTwoUp ? pageHeight / 2 : pageWidth;
  const cardHeight = isTwoUp ? (pageHeight / 2) * (pageHeight / pageWidth) : pageHeight;
  const extraWidth = isTwoUp ? pageHeight : pageWidth;
  const extraHeight = isTwoUp ? pageWidth : pageHeight;
  [document.documentElement, document.body].forEach((target) => {
    target.style.setProperty("--screen-page-width", `${cardWidth}px`);
    target.style.setProperty("--screen-page-height", `${cardHeight}px`);
    target.style.setProperty("--two-up-card-height", `${Math.round(cardHeight)}px`);
  });

  requestAnimationFrame(() => {
    document.querySelectorAll(".card-frame").forEach((frame) => {
      const availableWidth = frame.clientWidth;
      const scale = availableWidth > 0 ? availableWidth / cardWidth : 1;
      frame.style.setProperty("--preview-scale", scale.toFixed(4));
      frame.style.height = `${cardHeight * scale}px`;
    });

    document.querySelectorAll(".extra-frame").forEach((frame) => {
      const availableWidth = frame.clientWidth;
      const scale = availableWidth > 0 ? availableWidth / extraWidth : 1;
      frame.style.setProperty("--preview-scale", scale.toFixed(4));
      frame.style.height = `${extraHeight * scale}px`;
    });
  });
}

function generateCards() {
  const items = parseItems(inputs.items.value);
  updateListHelp();
  const requestedCount = Math.min(Math.max(Number(inputs.count.value) || 1, 1), 300);
  inputs.count.value = requestedCount;

  if (items.length < 24) {
    currentCards = [];
    currentItems = [];
    cardsContainer.replaceChildren();
    extrasContainer.replaceChildren();
    renderHelpfulChecks([]);
    cardTotal.textContent = "0 cards";
    setStatus(items.length === 0
      ? "Paste your bingo list to get started."
      : "Add at least 24 unique list items for a 5 x 5 card with one free square.",
    true);
    return;
  }

  const cards = makeUniqueCards(items, requestedCount);
  currentCards = cards;
  currentItems = items;
  generatedSettingsDirty = false;
  renderCards(cards);
  renderExtras(items);
  renderHelpfulChecks(getHelpfulChecks(items, requestedCount));

  const countWarning = items.length === 75 ? "" : ` You have ${items.length} unique songs; Etsy packs should have exactly 75.`;
  const note = cards.length === requestedCount
    ? `Generated ${cards.length} unique card${cards.length === 1 ? "" : "s"} from ${items.length} items.`
    : `Generated ${cards.length} unique cards before combinations ran out. Add more items for more variety.`;
  setStatus(`${note}${countWarning}`, items.length !== 75);
  saveSettings();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateCards();
});

inputs.items.addEventListener("input", () => {
  markCardsNeedRegeneration();
  saveSettings();
});

freePresetGrid.addEventListener("change", (event) => {
  if (event.target.name !== "freePreset") {
    return;
  }

  selectedFreePreset = event.target.value;
  if (selectedFreePreset !== "custom") {
    freeImageData = "";
    if (freeImageInput) {
      freeImageInput.value = "";
    }
  }
  renderCurrentOutput();
  saveSettings();
});

freeImageInput?.addEventListener("change", () => {
  const file = freeImageInput.files[0];
  if (!file) {
    freeImageData = "";
    freeImageAspectRatio = 1;
    selectedFreePreset = "text";
    updateFreePresetSelection();
    renderCurrentOutput();
    saveSettings();
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    freeImageData = reader.result;
    selectedFreePreset = "custom";
    const image = new Image();
    image.addEventListener("load", () => {
      freeImageAspectRatio = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1;
      updateFreePresetSelection();
      renderCurrentOutput();
      saveSettings();
    });
    image.addEventListener("error", () => {
      freeImageAspectRatio = 1;
      updateFreePresetSelection();
      renderCurrentOutput();
      saveSettings();
    });
    image.src = freeImageData;
  });
  reader.readAsDataURL(file);
});

headerImageInput.addEventListener("change", () => {
  const file = headerImageInput.files[0];
  if (!file) {
    headerImageData = "";
    renderCurrentOutput();
    saveSettings();
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    headerImageData = reader.result;
    renderCurrentOutput();
    saveSettings();
  });
  reader.readAsDataURL(file);
});

markerImageInput.addEventListener("change", () => {
  const file = markerImageInput.files[0];
  if (!file) {
    markerImageData = "";
    renderCurrentOutput();
    saveSettings();
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    markerImageData = reader.result;
    renderCurrentOutput();
    saveSettings();
  });
  reader.readAsDataURL(file);
});

function handleQrUpload(input, updateData) {
  const file = input.files[0];
  if (!file) {
    updateData("");
    renderCurrentOutput();
    saveSettings();
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    updateData(reader.result);
    renderCurrentOutput();
    saveSettings();
  });
  reader.readAsDataURL(file);
}

spotifyFullQrInput.addEventListener("change", () => {
  handleQrUpload(spotifyFullQrInput, (value) => {
    spotifyFullQrData = value;
  });
});

spotifyPreviewQrInput.addEventListener("change", () => {
  handleQrUpload(spotifyPreviewQrInput, (value) => {
    spotifyPreviewQrData = value;
  });
});

[primaryColor, highlightColor].forEach((control) => {
  control.addEventListener("input", () => {
    updateCustomColors();
    saveSettings();
  });
});

[pageSize, cardsPerPage].forEach((control) => {
  control.addEventListener("change", () => {
    updateDesignSettings();
    renderCurrentOutput();
    saveSettings();
  });
});

[inputs.productName, inputs.footerText, inputs.spotifyFullUrl, inputs.spotifyPreviewUrl].filter(Boolean).forEach((control) => {
  control.addEventListener("input", () => {
    updateHeadingPreview();
    renderCurrentOutput();
    saveSettings();
  });
});

[inputs.freeText].forEach((control) => {
  control.addEventListener("input", () => {
    updateFreeSquarePreview();
    saveSettings();
  });
});

[inputs.count].forEach((control) => {
  control.addEventListener("input", () => {
    markCardsNeedRegeneration();
    saveSettings();
  });
});

printFullSizeButton.addEventListener("click", () => printExport("cards-full"));
printTwoUpButton.addEventListener("click", () => printExport("cards-two-up"));
printExtrasButton.addEventListener("click", () => printExport("extras"));
pngSamplePackButton.addEventListener("click", exportPngSamplePack);
resetButton.addEventListener("click", resetSettings);
savedGameSelect?.addEventListener("change", () => {
  selectedCloudGameId = savedGameSelect.value;
});
saveGameButton?.addEventListener("click", () => saveCloudGame());
newCloudGameButton?.addEventListener("click", () => saveCloudGame({ asNew: true }));
loadSavedGameButton?.addEventListener("click", loadSelectedCloudGame);
deleteSavedGameButton?.addEventListener("click", deleteSelectedCloudGame);

window.addEventListener("resize", updatePreviewScale);

restoreSettings();
updateFreePresetSelection();
applyCurrentColors();
updateDesignSettings();
updateListHelp();
loadFreePresetManifest();
loadSavedGames();
