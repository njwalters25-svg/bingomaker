const form = document.querySelector("#bingoForm");
const cardsContainer = document.querySelector("#cards");
const extrasContainer = document.querySelector("#extras");
const cardTemplate = document.querySelector("#cardTemplate");
const instructionsTemplate = document.querySelector("#instructionsTemplate");
const masterListTemplate = document.querySelector("#masterListTemplate");
const markersTemplate = document.querySelector("#markersTemplate");
const statusMessage = document.querySelector("#statusMessage");
const cardTotal = document.querySelector("#cardTotal");
const listHelp = document.querySelector("#listHelp");
const qualityWarnings = document.querySelector("#qualityWarnings");
const headerImageInput = document.querySelector("#headerImage");
const freeImageInput = document.querySelector("#freeImage");
const printButton = document.querySelector("#printButton");
const downloadFullSizeButton = document.querySelector("#downloadFullSizeButton");
const downloadTwoUpButton = document.querySelector("#downloadTwoUpButton");
const downloadExtrasButton = document.querySelector("#downloadExtrasButton");
const resetButton = document.querySelector("#resetButton");
const schemeGrid = document.querySelector("#schemeGrid");
const fontStyle = document.querySelector("#fontStyle");
const occasionFont = document.querySelector("#occasionFont");
const occasionSize = document.querySelector("#occasionSize");
const occasionSizeValue = document.querySelector("#occasionSizeValue");
const titleSize = document.querySelector("#titleSize");
const titleSizeValue = document.querySelector("#titleSizeValue");
const gridStyle = document.querySelector("#gridStyle");
const pageSize = document.querySelector("#pageSize");
const cardsPerPage = document.querySelector("#cardsPerPage");
const printPageStyle = document.querySelector("#printPageStyle");
const primaryColor = document.querySelector("#primaryColor");
const highlightColor = document.querySelector("#highlightColor");
const titleColor = document.querySelector("#titleColor");
const occasionColor = document.querySelector("#occasionColor");

let freeImageData = "";
let headerImageData = "";
let isRestoringSettings = false;
let currentCards = [];

const storageKey = "allOccasionsBingoMakerSettings";

const inputs = {
  occasion: document.querySelector("#occasionInput"),
  title: document.querySelector("#titleInput"),
  count: document.querySelector("#cardCount"),
  items: document.querySelector("#itemList"),
  freeText: document.querySelector("#freeText"),
  footerText: document.querySelector("#footerText"),
  includeInstructions: document.querySelector("#includeInstructions"),
  includeMasterList: document.querySelector("#includeMasterList"),
  includeMarkers: document.querySelector("#includeMarkers"),
};

const centerIndex = 12;
const pageDimensions = {
  letter: [816, 1056],
  a4: [794, 1123],
};
const schemeColors = {
  party: ["#d94841", "#178f88", "#7a2f82", "#d94841"],
  primary: ["#d62828", "#1d4ed8", "#111827", "#d62828"],
  pastel: ["#f4a6c1", "#8ddad5", "#8e6cc8", "#d7833f"],
  kids: ["#ff6b35", "#00b4d8", "#53389e", "#0f8a5f"],
  teen: ["#ff2aa1", "#00b4ff", "#7c3aed", "#111827"],
  masculine: ["#243447", "#2f6f73", "#8c3f2b", "#c9932b"],
  feminine: ["#d65a87", "#8e5aa8", "#9b2f67", "#c06c84"],
  earth: ["#6f4e37", "#6c8f4e", "#2f5d50", "#b85c38"],
  coastal: ["#0e7490", "#f4a261", "#275f75", "#2a9d8f"],
  luxury: ["#111827", "#b08d57", "#7f1d1d", "#111827"],
  christmas: ["#b91c1c", "#166534", "#7f1212", "#d4af37"],
  halloween: ["#111111", "#f97316", "#7e22ce", "#111111"],
};
const occasionFontMaxSizes = {
  1: {
    bold: 48,
    script: 65,
    serif: 62,
    modern: 54,
    playful: 58,
    groovy: 64,
    handwritten: 58,
  },
  2: {
    bold: 46,
    script: 64,
    serif: 56,
    modern: 50,
    playful: 54,
    groovy: 60,
    handwritten: 54,
  },
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

function getSettingsSnapshot() {
  return {
    occasion: inputs.occasion.value,
    title: inputs.title.value,
    count: inputs.count.value,
    items: inputs.items.value,
    freeText: inputs.freeText.value,
    footerText: inputs.footerText.value,
    includeInstructions: inputs.includeInstructions.checked,
    includeMasterList: inputs.includeMasterList.checked,
    includeMarkers: inputs.includeMarkers.checked,
    fontStyle: fontStyle.value,
    occasionFont: occasionFont.value,
    occasionSize: occasionSize.value,
    titleSize: titleSize.value,
    gridStyle: gridStyle.value,
    pageSize: pageSize.value,
    cardsPerPage: cardsPerPage.value,
    primaryColor: primaryColor.value,
    highlightColor: highlightColor.value,
    titleColor: titleColor.value,
    occasionColor: occasionColor.value,
  };
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

    isRestoringSettings = true;
    inputs.occasion.value = savedSettings.occasion ?? inputs.occasion.value;
    inputs.title.value = savedSettings.title || inputs.title.value;
    inputs.count.value = savedSettings.count || inputs.count.value;
    inputs.items.value = savedSettings.items ?? inputs.items.value;
    inputs.freeText.value = savedSettings.freeText || inputs.freeText.value;
    inputs.footerText.value = savedSettings.footerText ?? inputs.footerText.value;
    inputs.includeInstructions.checked = savedSettings.includeInstructions ?? inputs.includeInstructions.checked;
    inputs.includeMasterList.checked = savedSettings.includeMasterList ?? inputs.includeMasterList.checked;
    inputs.includeMarkers.checked = savedSettings.includeMarkers ?? inputs.includeMarkers.checked;
    fontStyle.value = savedSettings.fontStyle || fontStyle.value;
    occasionFont.value = savedSettings.occasionFont || occasionFont.value;
    occasionSize.value = savedSettings.occasionSize || occasionSize.value;
    titleSize.value = savedSettings.titleSize || titleSize.value;
    gridStyle.value = savedSettings.gridStyle || gridStyle.value;
    pageSize.value = savedSettings.pageSize || pageSize.value;
    cardsPerPage.value = savedSettings.cardsPerPage || cardsPerPage.value;
    primaryColor.value = savedSettings.primaryColor || primaryColor.value;
    highlightColor.value = savedSettings.highlightColor || highlightColor.value;
    titleColor.value = savedSettings.titleColor || titleColor.value;
    occasionColor.value = savedSettings.occasionColor || occasionColor.value;
  } catch {
    localStorage.removeItem(storageKey);
  } finally {
    isRestoringSettings = false;
  }
}

function resetSettings() {
  localStorage.removeItem(storageKey);
  isRestoringSettings = true;

  inputs.occasion.value = "";
  inputs.title.value = "BINGO";
  inputs.count.value = "100";
  inputs.items.value = "";
  inputs.freeText.value = "FREE";
  inputs.footerText.value = "";
  inputs.includeInstructions.checked = true;
  inputs.includeMasterList.checked = true;
  inputs.includeMarkers.checked = true;
  fontStyle.value = "editorial";
  occasionFont.value = "bold";
  occasionSize.value = "25";
  titleSize.value = "98";
  gridStyle.value = "crisp";
  pageSize.value = "letter";
  cardsPerPage.value = "2";
  primaryColor.value = schemeColors.party[0];
  highlightColor.value = schemeColors.party[1];
  titleColor.value = schemeColors.party[2];
  occasionColor.value = schemeColors.party[3];
  document.querySelector('input[name="scheme"][value="party"]').checked = true;
  document.body.dataset.scheme = "party";
  document.body.dataset.customColors = "false";
  freeImageData = "";
  headerImageData = "";
  freeImageInput.value = "";
  headerImageInput.value = "";
  isRestoringSettings = false;

  applyCurrentColors();
  updateDesignSettings();
  updateListHelp();
  generateCards();
  setStatus("Saved settings cleared. Paste a list to start again.");
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

  if (requestedCount > 30 && items.length < 60) {
    checks.push("You are making quite a few cards from this list. Add more items if you want the cards to feel more different.");
  }

  if (longestItem.length > 52) {
    checks.push("Some items are very long and may print smaller. Shorten long titles or remove extra featuring details if needed.");
  } else if (hasVeryLongWord) {
    checks.push("Some long words or artist names may need extra space. Check the preview before printing.");
  }

  if (cardsPerPage.value === "2" && freeLabel.length > 16 && !freeImageData) {
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

function updateDesignSettings() {
  const occasionMaxSizes = occasionFontMaxSizes[cardsPerPage.value] || occasionFontMaxSizes[1];
  const occasionMaxSize = occasionMaxSizes[occasionFont.value] || 48;
  occasionSize.max = occasionMaxSize;
  if (Number(occasionSize.value) > occasionMaxSize) {
    occasionSize.value = occasionMaxSize;
  }

  document.body.dataset.font = fontStyle.value;
  document.body.dataset.occasionFont = occasionFont.value;
  document.body.dataset.grid = gridStyle.value;
  document.body.dataset.page = pageSize.value;
  document.body.dataset.cardsPerPage = cardsPerPage.value;
  occasionSizeValue.value = occasionSize.value;
  titleSizeValue.value = titleSize.value;
  document.documentElement.style.setProperty("--occasion-size", `${occasionSize.value}px`);
  document.documentElement.style.setProperty("--title-size", `${titleSize.value}px`);
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
  document.body.dataset.customColors = "true";
  applyCurrentColors();
}

function applyCurrentColors() {
  const colorTargets = [document.documentElement, document.body];
  colorTargets.forEach((target) => {
    target.style.setProperty("--accent", primaryColor.value);
    target.style.setProperty("--accent-2", highlightColor.value);
    target.style.setProperty("--title-color", titleColor.value);
    target.style.setProperty("--occasion-color", occasionColor.value);
  });
}

function resetTextFitClasses(square) {
  square.classList.remove("text-tight", "text-medium", "text-long", "text-xlong");
  square.style.fontSize = "";
}

function formatTitleText(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed !== trimmed.toUpperCase()) {
    return trimmed;
  }

  return trimmed.toLowerCase().replace(/(^|[\s("/-])([a-z])/g, (match) => match.toUpperCase());
}

function parseMusicItem(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.+?)\s(?:[-–—|]|\bby\b)\s(.+)$/i);
  if (!match) {
    return null;
  }

  return {
    title: formatTitleText(match[1]),
    artist: match[2].trim().toUpperCase(),
  };
}

function createSquare(value) {
  const square = document.createElement("div");
  square.className = "square";

  if (value === "__FREE__") {
    square.classList.add("free");
    if (freeImageData) {
      const image = document.createElement("img");
      image.src = freeImageData;
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
  return {
    pageWidth,
    pageHeight,
    sheetWidth: isTwoUp ? pageHeight : pageWidth,
    sheetHeight: isTwoUp ? pageWidth : pageHeight,
    cardWidth: isTwoUp ? pageHeight / 2 : pageWidth,
    cardHeight: isTwoUp ? pageWidth : pageHeight,
    orientation: isTwoUp ? "landscape" : "portrait",
  };
}

function getProductNameForFilename() {
  return inputs.occasion.value.trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "bingo";
}

function getPdfFilename(exportType = "current") {
  const productName = getProductNameForFilename();
  const suffixes = {
    "cards-full": "bingo-cards",
    "cards-two-up": "bingo-cards-2-to-a-page",
    extras: "instructions-playlist",
    current: cardsPerPage.value === "2" ? "bingo-cards-2-to-a-page" : "bingo-cards",
  };
  return `${productName}-${suffixes[exportType] || suffixes.current}.pdf`;
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
    .pdf-export-area, .pdf-export-area * {
      box-shadow: none !important;
    }

    .pdf-export-area .card-header {
      background: #fff !important;
      background-image: none !important;
    }

    .pdf-export-area .square.free {
      background: ${mixWithWhite(highlightColor.value, 0.82).join(",").replace(/^/, "rgb(").replace(/$/, ")")} !important;
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
  const title = titleColor.value;
  const occasion = occasionColor.value;
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

  pdf.setFont("times", "bolditalic");
  drawFittedText(pdf, inputs.occasion.value.trim(), x + paddingX, y + paddingTop, width - paddingX * 2, headerHeight * 0.28, {
    maxSize: clamp(Number(occasionSize.value) * scale, 10, 40),
    minSize: 7,
    font: "times",
    style: "bolditalic",
    color: occasion,
  });

  drawFittedText(pdf, inputs.title.value.trim() || "BINGO", x + paddingX, y + paddingTop + headerHeight * 0.24, width - paddingX * 2, headerHeight * 0.58, {
    maxSize: clamp(Number(titleSize.value) * scale, 24, 92),
    minSize: 16,
    font: "times",
    style: "bold",
    color: title,
    lineHeight: 0.95,
  });

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
        pdf.addImage(freeImageData, imageFormat, cellX + cellSize * 0.14, cellY + cellSize * 0.14, cellSize * 0.72, cellSize * 0.72);
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
    color: occasionColor.value,
    font: "helvetica",
  });
  y += 40;
  drawFittedText(pdf, "How to play", margin, y, sizing.sheetWidth - margin * 2, 64, {
    maxSize: 48,
    minSize: 24,
    font: "times",
    style: "bold",
    color: titleColor.value,
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
    color: titleColor.value,
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
    color: titleColor.value,
  });
  for (let index = 0; index < across * down; index += 1) {
    const col = index % across;
    const row = Math.floor(index / across);
    const x = margin + col * (token + gap);
    const y = top + row * (token + gap);
    setPdfColor(pdf, "setDrawColor", highlightColor.value);
    setPdfColor(pdf, "setFillColor", mixWithWhite(highlightColor.value, 0.86));
    pdf.circle(x + token / 2, y + token / 2, token / 2, "FD");
    drawFittedText(pdf, inputs.occasion.value.trim() || "Bingo", x + token * 0.12, y + token * 0.16, token * 0.76, token * 0.45, {
      maxSize: token * 0.12,
      minSize: 4,
      color: primaryColor.value,
    });
    drawFittedText(pdf, inputs.title.value.trim() || "BINGO", x + token * 0.16, y + token * 0.6, token * 0.68, token * 0.22, {
      maxSize: token * 0.13,
      minSize: 4,
      color: highlightColor.value,
      font: "times",
    });
  }
}

function setPdfBusy(isBusy) {
  downloadFullSizeButton.disabled = isBusy;
  downloadTwoUpButton.disabled = isBusy;
  downloadExtrasButton.disabled = isBusy;
  printButton.disabled = isBusy;
  form.querySelector("#generateButton").disabled = isBusy;
  resetButton.disabled = isBusy;
  downloadFullSizeButton.textContent = isBusy ? "Making PDF..." : "Full size cards PDF";
  downloadTwoUpButton.textContent = isBusy ? "Making PDF..." : "2-up cards PDF";
  downloadExtrasButton.textContent = isBusy ? "Making PDF..." : "Instructions playlist PDF";
}

function restoreExportSettings(previousCardsPerPage, previousExtras) {
  cardsPerPage.value = previousCardsPerPage;
  inputs.includeInstructions.checked = previousExtras.includeInstructions;
  inputs.includeMasterList.checked = previousExtras.includeMasterList;
  inputs.includeMarkers.checked = previousExtras.includeMarkers;
  updateDesignSettings();
  generateCards();
}

async function downloadPdf(exportType = "current") {
  const previousCardsPerPage = cardsPerPage.value;
  const previousExtras = {
    includeInstructions: inputs.includeInstructions.checked,
    includeMasterList: inputs.includeMasterList.checked,
    includeMarkers: inputs.includeMarkers.checked,
  };

  if (exportType === "cards-full" || exportType === "extras") {
    cardsPerPage.value = "1";
  } else if (exportType === "cards-two-up") {
    cardsPerPage.value = "2";
  }

  if (exportType === "cards-full" || exportType === "cards-two-up") {
    inputs.includeInstructions.checked = false;
    inputs.includeMasterList.checked = false;
    inputs.includeMarkers.checked = false;
  }

  if (exportType === "extras") {
    inputs.includeInstructions.checked = true;
    inputs.includeMasterList.checked = true;
    inputs.includeMarkers.checked = true;
  }

  updateDesignSettings();
  generateCards();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  if (currentCards.length === 0) {
    setStatus("Add at least 24 unique list items before downloading a PDF.", true);
    restoreExportSettings(previousCardsPerPage, previousExtras);
    return;
  }

  if (!window.html2canvas || !window.jspdf?.jsPDF) {
    setStatus("The PDF maker is still loading. Please try again in a moment.", true);
    restoreExportSettings(previousCardsPerPage, previousExtras);
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
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: addPdfExportOverrides,
      });
      const image = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(image, "JPEG", 0, 0, sizing.sheetWidth, sizing.sheetHeight);
    }

    pdf.save(getPdfFilename(exportType));
    setStatus(`Downloaded ${sheets.length} PDF page${sheets.length === 1 ? "" : "s"}.`);
  } catch (error) {
    console.error(error);
    setStatus("The PDF could not be created. Please use Print or save PDF instead.", true);
  } finally {
    exportArea.remove();
    setPdfBusy(false);
    restoreExportSettings(previousCardsPerPage, previousExtras);
  }
}

function renderCards(cards) {
  cardsContainer.replaceChildren();

  cards.forEach((cardItems) => {
    const frame = document.createElement("div");
    frame.className = "card-frame";

    const card = cardTemplate.content.firstElementChild.cloneNode(true);
    const cardHeader = card.querySelector(".card-header");
    card.querySelector(".occasion").textContent = inputs.occasion.value.trim();
    card.querySelector("h3").textContent = inputs.title.value.trim() || "BINGO";
    if (headerImageData) {
      const image = document.createElement("img");
      image.className = "header-image";
      image.src = headerImageData;
      image.alt = inputs.title.value.trim() || "Bingo header";
      cardHeader.append(image);
      card.classList.add("has-header-image");
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

function createExtraFrame(page) {
  const frame = document.createElement("div");
  frame.className = "extra-frame";
  frame.append(page);
  return frame;
}

function updateHeadingPreview() {
  const occasion = inputs.occasion.value.trim();
  const title = inputs.title.value.trim() || "BINGO";
  const markerOccasion = occasion || "Bingo";
  const footerText = inputs.footerText.value.trim();

  cardsContainer.querySelectorAll(".occasion").forEach((heading) => {
    heading.textContent = occasion;
  });

  cardsContainer.querySelectorAll(".bingo-card h3").forEach((heading) => {
    heading.textContent = title;
  });

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

function renderInstructions() {
  const page = instructionsTemplate.content.firstElementChild.cloneNode(true);
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

function renderMarkers() {
  const page = markersTemplate.content.firstElementChild.cloneNode(true);
  const grid = page.querySelector(".markers-grid");
  const markerCount = cardsPerPage.value === "2" ? 99 : 42;
  const occasion = inputs.occasion.value.trim() || "Bingo";
  page.querySelector("footer").textContent = inputs.footerText.value.trim();

  for (let marker = 0; marker < markerCount; marker += 1) {
    const token = document.createElement("span");
    token.className = "marker-token";

    const occasionText = document.createElement("span");
    occasionText.className = "marker-occasion";
    occasionText.textContent = occasion;

    const bingoText = document.createElement("span");
    bingoText.className = "marker-bingo";
    bingoText.textContent = inputs.title.value.trim() || "BINGO";

    token.append(occasionText, bingoText);
    grid.append(token);
  }
  return page;
}

function renderExtras(items) {
  extrasContainer.replaceChildren();
  document.body.dataset.hasExtras = "false";

  if (inputs.includeInstructions.checked) {
    extrasContainer.append(createExtraFrame(renderInstructions()));
  }

  if (inputs.includeMasterList.checked) {
    renderMasterList(items).forEach((page) => {
      extrasContainer.append(createExtraFrame(page));
    });
  }

  if (inputs.includeMarkers.checked) {
    extrasContainer.append(createExtraFrame(renderMarkers()));
  }

  if (extrasContainer.children.length > 0) {
    document.body.dataset.hasExtras = "true";
  }

  updatePreviewScale();
}

function updatePreviewScale() {
  const [pageWidth, pageHeight] = pageDimensions[pageSize.value];
  const isTwoUp = cardsPerPage.value === "2";
  const cardWidth = isTwoUp ? pageHeight / 2 : pageWidth;
  const cardHeight = isTwoUp ? pageWidth : pageHeight;
  const extraWidth = isTwoUp ? pageHeight : pageWidth;
  const extraHeight = isTwoUp ? pageWidth : pageHeight;
  [document.documentElement, document.body].forEach((target) => {
    target.style.setProperty("--screen-page-width", `${cardWidth}px`);
    target.style.setProperty("--screen-page-height", `${cardHeight}px`);
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
  renderCards(cards);
  renderExtras(items);
  renderHelpfulChecks(getHelpfulChecks(items, requestedCount));

  const note = cards.length === requestedCount
    ? `Generated ${cards.length} unique card${cards.length === 1 ? "" : "s"} from ${items.length} items.`
    : `Generated ${cards.length} unique cards before combinations ran out. Add more items for more variety.`;
  setStatus(note);
  saveSettings();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateCards();
});

inputs.items.addEventListener("input", () => {
  updateListHelp();
  saveSettings();
});

freeImageInput.addEventListener("change", () => {
  const file = freeImageInput.files[0];
  if (!file) {
    freeImageData = "";
    generateCards();
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    freeImageData = reader.result;
    generateCards();
  });
  reader.readAsDataURL(file);
});

headerImageInput.addEventListener("change", () => {
  const file = headerImageInput.files[0];
  if (!file) {
    headerImageData = "";
    generateCards();
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    headerImageData = reader.result;
    generateCards();
  });
  reader.readAsDataURL(file);
});

schemeGrid.addEventListener("change", (event) => {
  if (event.target.name === "scheme") {
    document.body.dataset.scheme = event.target.value;
    const [primary, highlight, title, occasion] = schemeColors[event.target.value];
    primaryColor.value = primary;
    highlightColor.value = highlight;
    titleColor.value = title;
    occasionColor.value = occasion;
    document.body.dataset.customColors = "false";
    applyCurrentColors();
    saveSettings();
  }
});

[primaryColor, highlightColor, titleColor, occasionColor].forEach((control) => {
  control.addEventListener("input", () => {
    updateCustomColors();
    saveSettings();
  });
});

[fontStyle, occasionFont, gridStyle, pageSize, cardsPerPage].forEach((control) => {
  control.addEventListener("change", () => {
    updateDesignSettings();
    saveSettings();
  });
});

cardsPerPage.addEventListener("change", generateCards);

[inputs.includeInstructions, inputs.includeMasterList, inputs.includeMarkers].forEach((control) => {
  control.addEventListener("change", generateCards);
});

[occasionSize, titleSize].forEach((control) => {
  control.addEventListener("input", () => {
    updateDesignSettings();
    saveSettings();
  });
});

[inputs.occasion, inputs.title, inputs.footerText].forEach((control) => {
  control.addEventListener("input", () => {
    updateHeadingPreview();
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
  control.addEventListener("input", saveSettings);
});

printButton.addEventListener("click", () => {
  updateDesignSettings();
  generateCards();
  requestAnimationFrame(() => window.print());
});

downloadFullSizeButton.addEventListener("click", () => downloadPdf("cards-full"));
downloadTwoUpButton.addEventListener("click", () => downloadPdf("cards-two-up"));
downloadExtrasButton.addEventListener("click", () => downloadPdf("extras"));
resetButton.addEventListener("click", resetSettings);

window.addEventListener("resize", updatePreviewScale);

document.body.dataset.scheme = "party";
restoreSettings();
applyCurrentColors();
updateDesignSettings();
updateListHelp();
generateCards();
