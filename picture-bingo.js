"use strict";

const LETTER = [612, 792];
const LANDSCAPE_LETTER = [792, 612];
const TWO_UP_SCALE = 396 / 612;
const TWO_UP_TOP = (612 - 792 * TWO_UP_SCALE) / 2;
const DEFAULT_BORDER = "#c18f22";
const MARGIN = 36;
const GRID_WIDTH = LETTER[0] - MARGIN * 2;
const BOARD_MARGIN = 24;
const BOARD_WIDTH = LETTER[0] - BOARD_MARGIN * 2;
const HEADER_TOP = 28;
const HEADER_HEIGHT = 150;
const BOARD_TOP = 190;
const CALLING_TOP = 60;
const CALLING_HEIGHT = LETTER[1] - CALLING_TOP - MARGIN;
const IMAGE_LIMIT = 750;

function labelFromFilename(name) {
  const label = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return (label ? label[0].toUpperCase() + label.slice(1) : "Picture").slice(0, 60);
}

function makePictureBoards(pictures, layout, quantity, random = Math.random) {
  const needed = layout * layout - (layout === 5 ? 1 : 0);
  if (pictures.length < needed) return [];
  const boards = [];
  const seen = new Set();
  for (let attempt = 0; boards.length < quantity && attempt < quantity * 80; attempt++) {
    const shuffled = [...pictures];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const board = shuffled.slice(0, needed);
    const signature = JSON.stringify(board.map(picture => picture.id));
    if (seen.has(signature)) continue;
    seen.add(signature);
    if (layout === 5) board.splice(12, 0, null);
    boards.push(board);
  }
  return boards;
}

function makeCallingPages(pictures) {
  const pages = [];
  for (let i = 0; i < pictures.length; i += 4) pages.push(pictures.slice(i, i + 4));
  return pages;
}

function containedImage(picture, x, y, width, height) {
  const scale = Math.min(width / picture.width, height / picture.height);
  const w = picture.width * scale;
  const h = picture.height * scale;
  return [x + (width - w) / 2, y + (height - h) / 2, w, h];
}

function drawLabel(pdf, label, x, y, width, height, maxSize) {
  let size = maxSize;
  let lines;
  for (;;) {
    pdf.setFontSize(size);
    lines = pdf.splitTextToSize(label, width);
    if (lines.length * size * 1.1 <= height) break;
    size *= 0.9;
  }
  drawLines(pdf, lines, x, y, width, height, size);
}

function drawLines(pdf, lines, x, y, width, height, size) {
  pdf.setFontSize(size);
  const baseline = y + (height - lines.length * size * 1.1) / 2 + size;
  lines.forEach((line, i) => pdf.text(line, x + width / 2, baseline + i * size * 1.1, { align: "center" }));
}

function boardLabels(pdf, pictures, layout) {
  const cell = BOARD_WIDTH / layout;
  pdf.setFont("helvetica", "bold");
  let size = 13;
  for (;;) {
    pdf.setFontSize(size);
    const lines = new Map(pictures.map(picture => [picture.id, pdf.splitTextToSize(picture.label || " ", cell - 6)]));
    const longest = Math.max(2, ...Array.from(lines.values(), value => value.length));
    const height = longest * size * 1.1 + 3;
    if (height <= cell * 0.39) return { size, lines, height };
    size *= 0.95;
  }
}

function scaledBoard(pdf, offsetX) {
  const s = TWO_UP_SCALE;
  const y = value => TWO_UP_TOP + value * s;
  const x = value => offsetX + value * s;
  return {
    setFont: (...args) => pdf.setFont(...args),
    setDrawColor: (...args) => pdf.setDrawColor(...args),
    setLineWidth: value => pdf.setLineWidth(value * s),
    setFontSize: value => pdf.setFontSize(value * s),
    splitTextToSize: (value, width) => pdf.splitTextToSize(value, width * s),
    rect: (left, top, width, height) => pdf.rect(x(left), y(top), width * s, height * s),
    text: (value, left, top, options) => pdf.text(value, x(left), y(top), options),
    addImage: (data, format, left, top, width, height, alias) => pdf.addImage(data, format, x(left), y(top), width * s, height * s, alias),
  };
}

function writePicturePdf(pdf, { title, pages, layout, calling = false, header = null, twoUp = false,
  border = DEFAULT_BORDER, fontData, pictures: allPictures, boardStart = 0 }) {
  const columns = calling ? 2 : layout;
  const margin = calling ? MARGIN : BOARD_MARGIN;
  const gridWidth = calling ? GRID_WIDTH : BOARD_WIDTH;
  const cellWidth = gridWidth / columns;
  const cellHeight = calling ? CALLING_HEIGHT / 2 : cellWidth;
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(23, 34, 49);
  pdf.setDrawColor(82, 101, 104);
  pdf.setLineWidth(0.5);
  const labels = calling ? null : boardLabels(pdf, allPictures || [...new Set(pages.flat().filter(Boolean))], layout);
  if (!calling && fontData) {
    pdf.addFileToVFS("LilitaOne.ttf", fontData);
    pdf.addFont("LilitaOne.ttf", "LilitaOne", "normal");
  }
  const documentPdf = pdf;
  pages.forEach((pictures, pageIndex) => {
    if (pageIndex && (!twoUp || pageIndex % 2 === 0)) {
      documentPdf.addPage(twoUp ? LANDSCAPE_LETTER : LETTER, twoUp ? "landscape" : "portrait");
    }
    const pdf = twoUp ? scaledBoard(documentPdf, (pageIndex % 2) * 396) : documentPdf;
    if (!calling) {
      pdf.setDrawColor(border);
      pdf.setLineWidth(1.5);
      pdf.rect(16, 16, LETTER[0] - 32, LETTER[1] - 32);
      pdf.setDrawColor(82, 101, 104);
      pdf.setLineWidth(0.5);
    }
    if (!calling && header) {
      const image = containedImage(header, margin, HEADER_TOP, gridWidth, HEADER_HEIGHT);
      pdf.addImage(header.data, "JPEG", ...image, "board-header");
    } else {
      drawLabel(pdf, calling ? `${title} - Calling Cards` : title, margin, calling ? 12 : HEADER_TOP, gridWidth, calling ? 38 : HEADER_HEIGHT, calling ? 17 : 30);
    }
    const slots = calling ? 4 : pictures.length;
    for (let index = 0; index < slots; index++) {
      const picture = pictures[index];
      const x = margin + (index % columns) * cellWidth;
      const y = (calling ? CALLING_TOP : BOARD_TOP) + Math.floor(index / columns) * cellHeight;
      if (picture === null) {
        pdf.rect(x, y, cellWidth, cellHeight);
        pdf.setFont(fontData ? "LilitaOne" : "helvetica", fontData ? "normal" : "bold");
        const centre = x + cellWidth / 2;
        const middle = y + cellHeight / 2;
        pdf.setFontSize(22);
        pdf.text("Free", centre, middle - 3, { align: "center" });
        pdf.text("Space", centre, middle + 20, { align: "center" });
        pdf.setFont("helvetica", "bold");
        continue;
      }
      pdf.rect(x, y, cellWidth, cellHeight);
      if (picture) {
        const padding = calling ? 16 : 3;
        const nameHeight = calling ? 44 : 0;
        if (calling) drawLabel(pdf, title, x + padding, y + 7, cellWidth - padding * 2, nameHeight - 7, 14);
        const labelHeight = calling ? cellHeight * 0.28 : labels.height;
        const imageHeight = cellHeight - labelHeight - padding * 2 - nameHeight;
        const image = containedImage(picture, x + padding, y + padding + nameHeight, cellWidth - padding * 2, imageHeight);
        if (!calling) image[1] = y + padding + imageHeight - image[3];
        // Reusing the same alias makes jsPDF reference one image object across pages.
        pdf.addImage(picture.data, "JPEG", ...image, `picture-${picture.id}`);
        if (calling) drawLabel(pdf, picture.label, x + padding, y + cellHeight - labelHeight, cellWidth - padding * 2, labelHeight - 3, 24);
        else drawLines(pdf, labels.lines.get(picture.id), x + padding, y + cellHeight - labelHeight, cellWidth - padding * 2, labelHeight - 3, labels.size);
      }
    }
    if (!calling) drawLabel(pdf, `Board ${boardStart + pageIndex + 1}`, margin, BOARD_TOP + gridWidth + 4, gridWidth, 14, 10);
  });
  return pdf;
}

function pictureFileStem(title) {
  return title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "Picture-Bingo";
}

function createPicturePdf(JsPdf, game, calling = false, twoUp = false) {
  const pdf = new JsPdf({ unit: "pt", format: twoUp ? LANDSCAPE_LETTER : LETTER, orientation: twoUp ? "landscape" : "portrait", compress: true });
  const pages = calling ? makeCallingPages(game.pictures) : game.boards;
  writePicturePdf(pdf, { ...game, pages, calling, twoUp });
  return pdf;
}

async function buildPicturePack(zip, JsPdf, game, makeCaller, onProgress = async () => {}) {
  const name = pictureFileStem(game.title);
  const folder = zip.folder(name + "-" + game.boards.length + "-boards");
  const files = [
    [`${game.boards.length}-boards-full-page.pdf`, false, false, "Full-page boards"],
    [`${game.boards.length}-boards-2-up.pdf`, false, true, "Two-per-page boards"],
    ["calling-cards.pdf", true, false, "Calling cards"],
  ];
  for (const [suffix, calling, twoUp, label] of files) {
    await onProgress(label);
    folder.file(`${name}-${suffix}`, createPicturePdf(JsPdf, game, calling, twoUp).output("arraybuffer"));
  }
  await onProgress("Offline caller");
  folder.file(`${name}-bingo-caller.html`, makeCaller(game.title, game.pictures, game.header), { compression: "DEFLATE" });
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}

function opaqueBounds(pixels, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!pixels[(y * width + x) * 4 + 3]) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return right < 0 ? null : [left, top, right + 1, bottom + 1];
}

function headerBorderColor(pixels) {
  const buckets = new Map();
  for (let i = 0; i < pixels.length; i += 4) {
    const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const max = Math.max(...rgb);
    const min = Math.min(...rgb);
    if (pixels[i + 3] < 192 || max < 45 || min > 235) continue;
    const key = rgb.map(value => value >> 5).join(",");
    const bucket = buckets.get(key) || { count: 0, sum: [0, 0, 0], saturation: (max - min) / max };
    bucket.count++;
    rgb.forEach((value, channel) => { bucket.sum[channel] += value; });
    buckets.set(key, bucket);
  }
  const score = bucket => bucket.count * (0.1 + bucket.saturation ** 2);
  const ranked = [...buckets.values()].sort((a, b) => score(b) - score(a));
  const best = ranked.find(bucket => bucket.saturation > 0.25) || ranked[0];
  return best ? "#" + best.sum.map(value => Math.round(value / best.count).toString(16).padStart(2, "0")).join("") : DEFAULT_BORDER;
}

async function optimisePicture(file, id, limit = IMAGE_LIMIT, trim = true) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const { naturalWidth: width, naturalHeight: height } = image;
    let border;
    if (id === "header") {
      const sample = Math.min(1, 120 / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * sample));
      canvas.height = Math.max(1, Math.round(height * sample));
      const scan = canvas.getContext("2d", { willReadFrequently: true });
      scan.drawImage(image, 0, 0, canvas.width, canvas.height);
      border = headerBorderColor(scan.getImageData(0, 0, canvas.width, canvas.height).data);
    }
    let crop = [0, 0, width, height];
    if (trim && file.type !== "image/jpeg") {
      const scanScale = Math.min(1, limit / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scanScale));
      canvas.height = Math.max(1, Math.round(height * scanScale));
      const scan = canvas.getContext("2d", { willReadFrequently: true });
      scan.drawImage(image, 0, 0, canvas.width, canvas.height);
      const bounds = opaqueBounds(scan.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
      if (!bounds) throw new Error("Empty picture");
      const [left, top, right, bottom] = bounds;
      const x = Math.floor(left * width / canvas.width);
      const y = Math.floor(top * height / canvas.height);
      crop = [x, y, Math.ceil(right * width / canvas.width) - x, Math.ceil(bottom * height / canvas.height) - y];
    }
    const scale = Math.min(1, limit / Math.max(crop[2], crop[3]));
    canvas.width = Math.max(1, Math.round(crop[2] * scale));
    canvas.height = Math.max(1, Math.round(crop[3] * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, ...crop, 0, 0, canvas.width, canvas.height);
    const picture = { id, label: labelFromFilename(file.name), width: canvas.width, height: canvas.height, border, data: canvas.toDataURL("image/jpeg", 0.84) };
    canvas.width = canvas.height = 0;
    return picture;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function restorePictureBoards(saved) {
  const byId = new Map(saved.pictures.map(picture => [picture.id, picture]));
  const slots = saved.layout ** 2;
  if (saved.boards.length !== saved.quantity) throw new Error("Invalid saved board count");
  return saved.boards.map(board => {
    if (board.length !== slots || new Set(board).size !== slots ||
        board.some((id, i) => saved.layout === 5 && i === 12 ? id !== null : !byId.has(id))) {
      throw new Error("Invalid saved board");
    }
    return board.map(id => id === null ? null : byId.get(id));
  });
}

function initialisePictureBingo() {
  const byId = id => document.getElementById(id);
  const setup = byId("setup");
  const layout = byId("layout");
  const quantity = byId("quantity");
  const title = byId("gameTitle");
  const headerInput = byId("boardHeader");
  const border = byId("borderColor");
  const fileInput = byId("pictures");
  const list = byId("pictureList");
  const paper = byId("paper");
  const previewType = byId("previewType");
  const boardsButton = byId("boardsPdf");
  const twoUpButton = byId("twoUpPdf");
  const callingButton = byId("callingPdf");
  const callerButton = byId("callerHtml");
  const allFilesButton = byId("allPictureFiles");
  const pngPackButton = byId("picturePngPack");
  const savedSelect = byId("savedPictureGame");
  const loadGame = byId("loadPictureGame");
  const saveGame = byId("savePictureGame");
  const saveNew = byId("saveNewPictureGame");
  const cloud = window.bingoCloud;
  const previous = byId("previous");
  const next = byId("next");
  const pictures = [];
  let boards = [];
  let header = null;
  let page = 0;
  let nextId = 0;
  let busy = false;
  let activeGame = "";
  let metrics;
  const fontData = typeof pictureBingoFont === "string" ? pictureBingoFont : null;
  if (fontData) {
    const font = new FontFace("Lilita One", `url(data:font/ttf;base64,${fontData})`);
    document.fonts.add(font);
    font.load().catch(() => {});
  }

  const gameTitle = () => title.value.trim() || "Picture Bingo";
  const minimum = () => Number(layout.value) === 5 ? 24 : 16;
  const status = (message, error = false) => {
    byId("status").textContent = message;
    byId("status").classList.toggle("error", error);
  };
  const element = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content) node.textContent = content;
    return node;
  };

  function updateButtons() {
    const invalidLabels = pictures.some(picture => !picture.label);
    boardsButton.disabled = busy || invalidLabels || boards.length !== Number(quantity.value);
    twoUpButton.disabled = boardsButton.disabled;
    allFilesButton.disabled = boardsButton.disabled;
    pngPackButton.disabled = boardsButton.disabled;
    callingButton.disabled = busy || invalidLabels || !pictures.length;
    callerButton.disabled = callingButton.disabled;
    loadGame.disabled = busy || !cloud || !savedSelect.value;
    saveGame.disabled = saveNew.disabled = !cloud || boardsButton.disabled;
    saveGame.textContent = activeGame ? "Update saved game" : "Save game";
    byId("pictureCount").textContent = `${pictures.length} added`;
  }

  function renderPreview() {
    const calling = previewType.value === "calling";
    const twoUp = previewType.value === "two-up";
    const pages = calling ? makeCallingPages(pictures) : boards;
    const pageCount = twoUp ? Math.ceil(pages.length / 2) : pages.length;
    page = Math.max(0, Math.min(page, pageCount - 1));
    paper.replaceChildren();
    paper.classList.toggle("two-up", twoUp);
    paper.classList.toggle("player-board", !calling && !twoUp && Boolean(pages.length));
    paper.style.setProperty("--board-border", border.value);
    previous.disabled = page === 0;
    next.disabled = page + 1 >= pageCount;
    byId("pageNumber").textContent = pageCount ? `${page + 1} of ${pageCount}` : "";
    if (!pages.length) {
      paper.append(element("p", "empty", calling ? "No pictures yet" : `${minimum()} pictures needed for this layout`));
      return;
    }
    if (!metrics && window.jspdf?.jsPDF) metrics = new window.jspdf.jsPDF({ unit: "pt" });
    const labels = !calling && metrics ? boardLabels(metrics, pictures, Number(layout.value)) : null;
    if (twoUp) {
      pages.slice(page * 2, page * 2 + 2).forEach((entries, index) => {
        const sheet = element("div", "mini-board player-board");
        sheet.style.left = `${index * 50}%`;
        paper.append(sheet);
        renderSheet(sheet, entries, false, labels);
      });
    } else renderSheet(paper, pages[page], calling, labels);
  }

  function renderSheet(sheet, entries, calling, labels) {
    if (!calling && header) {
      const artwork = element("img", "board-header");
      artwork.src = header.data;
      artwork.alt = gameTitle();
      sheet.append(artwork);
    } else {
      sheet.append(element("h3", calling ? "calling-title" : "board-title", calling ? `${gameTitle()} - Calling Cards` : gameTitle()));
    }
    const grid = element("div", calling ? "sheet-grid calling" : "sheet-grid");
    const columns = calling ? 2 : Number(layout.value);
    grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows = grid.style.gridTemplateColumns;
    if (labels) grid.style.setProperty("--label-height", `${labels.height / (BOARD_WIDTH / columns) * 100}%`);
    const captions = [];
    for (let i = 0; i < (calling ? 4 : entries.length); i++) {
      const picture = entries[i];
      const cell = element("div", picture === null ? "picture-cell free" : "picture-cell");
      if (picture === null) {
        const free = element("span", "free-label");
        free.append("Free", document.createElement("br"), "Space");
        cell.append(free);
      }
      else if (picture) {
        if (calling) cell.append(element("span", "calling-game-name", gameTitle()));
        const image = element("img");
        image.src = picture.data;
        image.alt = "";
        const caption = element("span", "", labels ? labels.lines.get(picture.id).join("\n") : picture.label);
        if (labels) caption.style.fontSize = `${labels.size * sheet.clientWidth / LETTER[0]}px`;
        cell.append(image, caption);
        captions.push([caption, cell]);
      }
      grid.append(cell);
    }
    sheet.append(grid);
    if (calling) for (const [caption, cell] of captions) {
      let size = 15;
      while (caption.offsetHeight > (cell.clientHeight - 6) * 0.28 && size > 6) {
        caption.style.fontSize = `${--size}px`;
      }
    }
  }

  function rebuildBoards() {
    boards = makePictureBoards(pictures, Number(layout.value), Number(quantity.value));
    page = 0;
    updateButtons();
    renderPreview();
  }

  function pictureGames() {
    return cloud.from("bingo_games");
  }

  async function refreshSavedGames() {
    const { data, error } = await pictureGames().select("id, name").eq("data->>kind", "picture-bingo").order("name");
    if (error) throw error;
    savedSelect.replaceChildren(new Option(data.length ? "Choose a saved game" : "No saved picture games yet", ""));
    data.forEach(game => savedSelect.add(new Option(game.name, game.id)));
    savedSelect.value = activeGame;
    updateButtons();
  }

  async function runCloudAction(action) {
    setup.disabled = busy = true;
    status("Working with saved games...");
    try {
      await action();
    } catch (error) {
      console.error(error);
      status("Could not complete the saved-game action. Your current board is still available.", true);
    } finally {
      setup.disabled = busy = false;
      updateButtons();
    }
  }

  function savePictureGame(asNew) {
    return runCloudAction(async () => {
      const name = gameTitle();
      const payload = {
        name, updated_at: new Date().toISOString(),
        data: {
          kind: "picture-bingo", version: 1, layout: Number(layout.value), quantity: Number(quantity.value),
          pictures, header, headerFilename: byId("headerFilename").textContent, border: border.value,
          boards: boards.map(board => board.map(picture => picture?.id ?? null)),
        },
      };
      const query = asNew || !activeGame ? pictureGames().insert(payload)
        : pictureGames().update(payload).eq("id", activeGame).eq("data->>kind", "picture-bingo");
      const { data, error } = await query.select("id").single();
      if (error) throw error;
      activeGame = data.id;
      try {
        await refreshSavedGames();
      } catch (error) {
        console.error(error);
        status(`Saved "${name}", but the saved-game list could not refresh.`, true);
        return;
      }
      status(`Saved "${name}".`);
    });
  }

  savedSelect.addEventListener("change", updateButtons);
  saveGame.addEventListener("click", () => savePictureGame(false));
  saveNew.addEventListener("click", () => savePictureGame(true));
  loadGame.addEventListener("click", () => {
    const id = savedSelect.value;
    if (pictures.length && !window.confirm("Load this saved game and replace the current workspace? Unsaved changes will be lost.")) return;
    return runCloudAction(async () => {
      const { data, error } = await pictureGames().select("id, name, data").eq("id", id).eq("data->>kind", "picture-bingo").single();
      if (error) throw error;
      const saved = data.data;
      if (saved.kind !== "picture-bingo" || saved.version !== 1 || ![4, 5].includes(saved.layout) || ![50, 100].includes(saved.quantity)) {
        throw new Error("Unsupported saved picture game");
      }
      const restored = restorePictureBoards(saved);
      pictures.splice(0, pictures.length, ...saved.pictures);
      nextId = Math.max(0, ...pictures.map(picture => picture.id));
      boards = restored;
      activeGame = data.id;
      title.value = data.name;
      layout.value = String(saved.layout);
      quantity.value = String(saved.quantity);
      header = saved.header;
      border.value = saved.border || DEFAULT_BORDER;
      byId("headerFilename").textContent = saved.headerFilename || "";
      byId("headerSelection").hidden = !header;
      page = 0;
      renderList();
      renderPreview();
      status(`Loaded "${data.name}".`);
    });
  });

  function renderList() {
    list.replaceChildren();
    pictures.forEach((picture, index) => {
      const row = element("li");
      const thumbnail = element("img");
      thumbnail.src = picture.data;
      thumbnail.alt = "";
      const label = element("input");
      label.value = picture.label;
      label.maxLength = 60;
      label.setAttribute("aria-label", `Label for picture ${index + 1}`);
      label.addEventListener("input", () => {
        picture.label = label.value.trim();
        updateButtons();
        renderPreview();
      });
      const remove = element("button", "", "Remove");
      remove.setAttribute("aria-label", `Remove picture ${index + 1}`);
      remove.addEventListener("click", () => {
        pictures.splice(index, 1);
        renderList();
        rebuildBoards();
        status("");
      });
      row.append(thumbnail, label, remove);
      list.append(row);
    });
  }

  fileInput.addEventListener("change", async () => {
    const files = [...fileInput.files];
    if (!files.length) return;
    setup.disabled = busy = true;
    const failed = [];
    for (const [index, file] of files.entries()) {
      status(`Preparing picture ${index + 1} of ${files.length}...`);
      try {
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Unsupported image");
        pictures.push(await optimisePicture(file, ++nextId));
      } catch {
        failed.push(file.name);
      }
    }
    fileInput.value = "";
    setup.disabled = busy = false;
    renderList();
    rebuildBoards();
    status(failed.length ? `Could not open: ${failed.join(", ")}` : "", Boolean(failed.length));
  });

  headerInput.addEventListener("change", async () => {
    const file = headerInput.files[0];
    if (!file) return;
    setup.disabled = busy = true;
    try {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Unsupported image");
      header = await optimisePicture(file, "header", 1600, false);
      border.value = header.border;
      byId("headerFilename").textContent = file.name;
      byId("headerSelection").hidden = false;
      status("");
      renderPreview();
    } catch {
      status("Could not open that header. Choose a PNG, JPEG or WebP image.", true);
    } finally {
      headerInput.value = "";
      setup.disabled = busy = false;
      updateButtons();
    }
  });
  byId("removeHeader").addEventListener("click", () => {
    header = null;
    border.value = DEFAULT_BORDER;
    byId("headerSelection").hidden = true;
    renderPreview();
  });

  function downloadFile(blob, suffix) {
    const url = URL.createObjectURL(blob);
    const link = element("a");
    const name = pictureFileStem(gameTitle());
    link.href = url;
    link.download = `${name}-${suffix}`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  const currentGame = () => ({
    title: gameTitle(), layout: Number(layout.value), header, border: border.value, fontData, pictures, boards,
  });
  const nextPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  async function download(calling, twoUp = false) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      status("The PDF library did not load. Check your connection and reload this page.", true);
      return;
    }
    setup.disabled = busy = true;
    status("Preparing PDF...");
    await nextPaint();
    try {
      const pdf = createPicturePdf(jsPDF, currentGame(), calling, twoUp);
      const blob = pdf.output("blob");
      downloadFile(blob, calling ? "calling-cards.pdf" : `${boards.length}-boards${twoUp ? "-2-up" : ""}.pdf`);
      status(`${pdf.getNumberOfPages()} PDF pages · ${(blob.size / 1_000_000).toFixed(2)} MB`);
    } catch (error) {
      console.error(error);
      status("Could not generate the PDF. Your pictures are still loaded.", true);
    } finally {
      setup.disabled = busy = false;
      updateButtons();
    }
  }

  layout.addEventListener("change", rebuildBoards);
  quantity.addEventListener("change", rebuildBoards);
  title.addEventListener("input", renderPreview);
  border.addEventListener("input", renderPreview);
  previewType.addEventListener("change", () => { page = 0; renderPreview(); });
  previous.addEventListener("click", () => { page--; renderPreview(); });
  next.addEventListener("click", () => { page++; renderPreview(); });
  boardsButton.addEventListener("click", () => download(false));
  twoUpButton.addEventListener("click", () => download(false, true));
  callingButton.addEventListener("click", () => download(true));
  callerButton.addEventListener("click", () => {
    try {
      const html = buildOfflineCaller(gameTitle(), pictures, header);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      downloadFile(blob, "bingo-caller.html");
      status(`Offline caller downloaded · ${(blob.size / 1_000_000).toFixed(2)} MB`);
    } catch (error) {
      console.error(error);
      status("Could not generate the offline caller. Your pictures are still loaded.", true);
    }
  });
  allFilesButton.addEventListener("click", async () => {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF || !window.JSZip) {
      status("The PDF or ZIP library did not load. Check your connection and reload this page.", true);
      return;
    }
    setup.disabled = busy = true;
    try {
      const blob = await buildPicturePack(new window.JSZip(), jsPDF, currentGame(), buildOfflineCaller, async label => {
        status(`Preparing ${label.toLowerCase()}...`);
        await nextPaint();
      });
      downloadFile(blob, `${boards.length}-boards.zip`);
      status(`Four files downloaded in one ZIP · ${(blob.size / 1_000_000).toFixed(2)} MB`);
    } catch (error) {
      console.error(error);
      status("Could not create the ZIP. Your pictures are still loaded.", true);
    } finally {
      setup.disabled = busy = false;
      updateButtons();
    }
  });
  pngPackButton.addEventListener("click", async () => {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF || !window.JSZip || !window.html2canvas) {
      status("The PNG export libraries did not load. Check your connection and reload this page.", true);
      return;
    }
    setup.disabled = busy = true;
    status("Preparing PNG artwork...");
    try {
      const game = currentGame();
      await document.fonts.ready;
      const images = await decodePngExportImages(game);
      const blob = await buildPicturePngPack(
        new window.JSZip(), game,
        job => renderPictureSheetPng(game, job, jsPDF, images, writePicturePdf),
        () => captureOfflineCallerPng(buildOfflineCaller(game.title, game.pictures, game.header), window.html2canvas),
        async (index, total) => { status(`Preparing listing image ${index} of ${total}...`); await nextPaint(); },
      );
      downloadFile(blob, "etsy-png-pack.zip");
      status(`Etsy PNG pack downloaded · ${(blob.size / 1_000_000).toFixed(2)} MB`);
    } catch (error) {
      console.error(error);
      status("Could not create the Etsy PNG pack. Your pictures are still loaded.", true);
    } finally {
      setup.disabled = busy = false;
      updateButtons();
    }
  });
  new ResizeObserver(renderPreview).observe(paper);
  rebuildBoards();
  if (cloud) refreshSavedGames().catch(error => {
    console.error(error);
    status("Saved picture games could not load. You can still make and download boards.", true);
  });
}

if (typeof module !== "undefined") {
  module.exports = { labelFromFilename, makePictureBoards, makeCallingPages, containedImage, opaqueBounds, headerBorderColor, boardLabels, restorePictureBoards, writePicturePdf, buildPicturePack };
} else {
  initialisePictureBingo();
}
