"use strict";

async function buildPicturePngPack(zip, game, renderSheet, captureCaller, onProgress = async () => {}) {
  const jobs = [];
  const number = index => String(index + 1).padStart(2, "0");
  game.boards.slice(0, 20).forEach((board, index) => {
    jobs.push({ path: `full-page/board-${number(index)}.png`, pages: [board], boardStart: index });
  });
  for (let index = 0; index < 2 && index * 2 + 1 < game.boards.length; index++) {
    jobs.push({ path: `two-up/sheet-${number(index)}.png`, pages: game.boards.slice(index * 2, index * 2 + 2), boardStart: index * 2, twoUp: true });
  }
  for (let start = 0; start < game.pictures.length; start += 4) {
    jobs.push({ path: `calling-cards/sheet-${number(start / 4)}.png`, pages: [game.pictures.slice(start, start + 4)], calling: true });
  }
  ["how-to-play", "markers-full-page", "markers-two-up"].forEach((name, index) => {
    jobs.push({ path: `instructions/${name}.png`, guidePage: index + 1 });
  });
  const total = jobs.length + 1;
  for (const [index, job] of jobs.entries()) {
    await onProgress(index + 1, total);
    zip.file(job.path, await renderSheet(job));
  }
  await onProgress(total, total);
  zip.file("offline-caller.png", await captureCaller());
  zip.file("listing-data.json", JSON.stringify({
    version: 1, title: game.title, boardCount: game.boards.length, pictureCount: game.pictures.length,
  }, null, 2));
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}

async function decodePngExportImages(game) {
  const sources = [...new Set([...game.pictures, game.header].filter(Boolean).map(picture => picture.data))];
  const images = new Map();
  for (const source of sources) {
    const image = new Image();
    image.src = source;
    await image.decode();
    images.set(source, image);
  }
  return images;
}

function pngSheetDrawing(canvas, metrics, images) {
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.scale(2, 2);
  let family = "Arial", weight = "bold", size = 13;
  function updateFont() {
    context.font = `${weight} ${size}px "${family}", Arial, sans-serif`;
  }
  return {
    addFileToVFS: (...args) => metrics.addFileToVFS(...args),
    addFont: (...args) => metrics.addFont(...args),
    setFont(name, style) {
      metrics.setFont(name, style);
      family = name === "LilitaOne" ? "Lilita One" : "Arial";
      weight = style;
      updateFont();
    },
    setFontSize(value) {
      metrics.setFontSize(value);
      size = value;
      updateFont();
    },
    splitTextToSize: (...args) => metrics.splitTextToSize(...args),
    getTextWidth: value => metrics.getTextWidth(value),
    setTextColor: (r, g, b) => { context.fillStyle = typeof r === "string" ? r : `rgb(${r},${g},${b})`; },
    setDrawColor: (r, g, b) => { context.strokeStyle = typeof r === "string" ? r : `rgb(${r},${g},${b})`; },
    setLineWidth: value => { context.lineWidth = value; },
    setLineDashPattern: (pattern, offset) => { context.setLineDash(pattern); context.lineDashOffset = offset; },
    line: (x1, y1, x2, y2) => {
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
    },
    rect: (...args) => context.strokeRect(...args),
    text: (value, x, y, options) => {
      context.textAlign = options?.align || "left";
      context.fillText(value, x, y);
    },
    addImage: (data, _format, x, y, width, height) => context.drawImage(images.get(data), x, y, width, height),
  };
}

async function pngBytes(canvas) {
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error("PNG encoding failed")), "image/png");
  });
  return blob.arrayBuffer();
}

function drawPictureListingCover(context, background, board, boardCount, pictureCount, accent) {
  const scale = Math.max(2000 / background.width, 2000 / background.height);
  const w = background.width * scale, h = background.height * scale;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, 2000, 2000);
  context.drawImage(background, (2000 - w) / 2, (2000 - h) / 2, w, h);

  context.save();
  context.translate(1020, 1310);
  context.rotate(-9 * Math.PI / 180);
  context.shadowColor = "rgba(35, 26, 18, .32)";
  context.shadowBlur = 27;
  context.shadowOffsetX = 16;
  context.shadowOffsetY = 20;
  context.drawImage(board, -790, -1022, 1580, 2044);
  context.restore();

  function label(value, x, y, size, color, maxWidth) {
    context.font = `bold ${size}px Arial, sans-serif`;
    context.fillStyle = color;
    context.textAlign = "center";
    context.fillText(value, x, y, maxWidth);
  }
  label("DIGITAL DOWNLOAD", 1000, 135, 125, "#151515", 1750);

  context.beginPath();
  for (let i = 0; i < 32; i++) {
    const angle = i * Math.PI / 16;
    const radius = i % 2 ? 137 : 169;
    const x = 200 + radius * Math.cos(angle);
    const y = 510 + radius * Math.sin(angle);
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fillStyle = "#37b510";
  context.fill();
  label(`${pictureCount} FUN`, 200, 494, 59, "#151515", 262);
  label("PICTURES", 200, 575, 56, "#151515", 278);

  context.beginPath();
  context.arc(1740, 1724, 203, 0, Math.PI * 2);
  context.fillStyle = accent || "#b32836";
  context.fill();
  const ink = listingAccentInk(context.fillStyle);
  label(String(boardCount), 1740, 1655, 82, ink, 250);
  label("BINGO", 1740, 1750, 80, ink, 318);
  label("CARDS", 1740, 1845, 80, ink, 318);
}

function listingAccentInk(color) {
  const hex = /^#[\da-f]{6}$/i.test(color) ? color.slice(1) : "000000";
  const [r, g, b] = hex.match(/../g).map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? "#000" : "#fff";
}

async function buildPictureListingCover(game, backgroundData, renderBoard) {
  const [background, boardBytes] = await Promise.all([
    loadListingImage(backgroundData), renderBoard(),
  ]);
  const boardUrl = URL.createObjectURL(new Blob([boardBytes], { type: "image/png" }));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 2000;
  try {
    const board = await loadListingImage(boardUrl);
    drawPictureListingCover(canvas.getContext("2d"), background, board, game.boards.length, game.pictures.length, game.border);
    return await new Promise((resolve, reject) => canvas.toBlob(value => {
      if (value) resolve(value);
      else reject(new Error("Cover encoding failed"));
    }, "image/jpeg", 0.94));
  } finally {
    URL.revokeObjectURL(boardUrl);
    canvas.width = canvas.height = 0;
  }
}

function pictureListingPages(count) {
  return [
    ["01-cover", null, [["board-1"]]],
    ["02-whats-included", "What's included?", [
      ["board-1", 90, 280, 440, 620, `${count} full-page boards`],
      ["two-up", 565, 280, 770, 620, `${count} boards, two per page`],
      ["calling-1", 1390, 280, 520, 620, "Calling cards"],
      ["caller", 175, 1070, 1010, 720, "Offline bingo caller"],
      ["guide-1", 1250, 1070, 575, 720, "How to play + markers"],
    ]],
    ["03-unique-boards", `${count} unique bingo boards`, [
      ["board-1", 205, 65, 725, 850], ["board-2", 1070, 65, 725, 850],
      ["board-3", 205, 950, 725, 850], ["board-4", 1070, 950, 725, 850],
    ]],
    ["04-calling-cards", "Printable calling cards", [
      ["calling-1", 75, 315, 920, 1375], ["calling-2", 1005, 315, 920, 1375],
    ], "Four cards per sheet. Cut along the dashed lines."],
    ["05-offline-caller", "Offline bingo caller", [
      ["caller", 120, 320, 1760, 1325],
    ], "Random calls, no repeats, no internet needed."],
    ["06-print-options", "Two print options", [
      ["board-1", 90, 335, 765, 1280, "Full page"],
      ["two-up", 925, 335, 990, 1280, "Two per page"],
    ], "Print the format that works for your group."],
    ["07-instructions-and-markers", "Instructions and bingo markers", [
      ["guide-1", 65, 435, 600, 1080, "How to play"],
      ["guide-2", 700, 435, 600, 1080, "Full-page markers"],
      ["guide-3", 1335, 435, 600, 1080, "Two-per-page markers"],
    ], "Two sizes of bingo markers included."],
    ["08-print-at-home", "Print at home", [
      ["board-5", 125, 755, 810, 1060], ["board-6", 845, 820, 780, 1010],
    ]],
  ];
}

function drawPictureListingPage(context, background, page, artwork, accent) {
  const [name, title, slots, footer] = page;
  context.drawImage(background, 0, 0, 2000, 2000);
  function label(text, x, y, size, limit, ink = "#151515") {
    context.font = `bold ${size}px Arial, sans-serif`;
    context.textAlign = "center";
    context.fillStyle = ink;
    context.fillText(text, x, y, limit);
  }
  const included = name === "02-whats-included";
  if (included) label(title, 1000, 178, 110, 1770);
  else if (footer) label(footer, 1000, 205, 68, 1750);
  for (const [key, x, y, w, h, caption] of slots) {
    const source = artwork.get(key);
    const device = key === "caller";
    const inset = device ? 28 : 0;
    const scale = Math.min((w - inset * 2) / source.width, (h - inset * 2) / source.height);
    const width = source.width * scale, height = source.height * scale;
    const left = x + (w - width) / 2, top = y + (h - height) / 2;
    context.save();
    if (name === "08-print-at-home") {
      context.translate(left + width / 2, top + height / 2);
      context.rotate((key === "board-5" ? -10 : 6) * Math.PI / 180);
      context.translate(-left - width / 2, -top - height / 2);
    }
    context.shadowColor = "rgba(35, 26, 18, .32)";
    context.shadowBlur = 25;
    context.shadowOffsetX = 10;
    context.shadowOffsetY = 15;
    if (device) {
      context.fillStyle = "#202124";
      context.beginPath();
      context.roundRect(left - inset, top - inset, width + 2 * inset, height + 2 * inset, 24);
      context.fill();
      context.shadowColor = "transparent";
    }
    context.drawImage(source, left, top, width, height);
    context.restore();
    if (caption) label(caption, x + w / 2, y + h + 66, 52, w);
  }
  if (!included) {
    context.fillStyle = accent || "#b32836";
    context.fillRect(0, 1850, 2000, 150);
    label(title.toUpperCase(), 1000, 1958, 85, 1800, listingAccentInk(context.fillStyle));
  }
}

async function buildPictureListingPack(zip, game, backgroundUrl, renderSheet, captureCaller, progress = async () => {}, makeVideo) {
  const background = await loadListingImage(backgroundUrl);
  const desk = await loadListingImage("picture-listing-desk.jpg");
  const artwork = new Map();
  const pages = pictureListingPages(game.boards.length);
  const remaining = pages.flatMap(page => page[2].map(([key]) => key));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 2000;
  const context = canvas.getContext("2d");
  const slides = [];
  try {
    for (const [index, page] of pages.entries()) {
      await progress(index + 1, pages.length + 1);
      for (const [key] of page[2]) {
        if (artwork.has(key)) continue;
        let bytes;
        if (key === "caller") bytes = await captureCaller();
        else {
          const [kind, number] = key.split("-");
          const offset = Number(number) - 1;
          bytes = await renderSheet(key === "two-up" ? { pages: game.boards.slice(0, 2), twoUp: true }
            : kind === "board" ? { pages: [game.boards[offset]], boardStart: offset }
            : kind === "calling" ? { pages: [game.pictures.slice(offset * 4, offset * 4 + 4)], calling: true }
            : { guidePage: offset + 1 });
        }
        artwork.set(key, await createImageBitmap(new Blob([bytes], { type: "image/png" })));
      }
      if (index === 0) drawPictureListingCover(context, background, artwork.get("board-1"), game.boards.length, game.pictures.length, game.border);
      else drawPictureListingPage(context, page[0] === "08-print-at-home" ? desk : background, page, artwork, game.border);
      const jpg = await new Promise((resolve, reject) => canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error("Listing JPG encoding failed")), "image/jpeg", 0.94));
      const bytes = await jpg.arrayBuffer();
      zip.file(`${page[0]}.jpg`, bytes);
      if (makeVideo) slides.push(bytes);
      for (const [key] of page[2]) {
        remaining.splice(remaining.indexOf(key), 1);
        if (!remaining.includes(key)) {
          artwork.get(key).close();
          artwork.delete(key);
        }
      }
    }
    await progress(pages.length + 1, pages.length + 1);
    const promoUrl = "picture-listing-save-50.jpg";
    let promo;
    if (location.protocol === "file:") {
      // Local pages can display sibling images, but cannot fetch their original bytes.
      context.drawImage(await loadListingImage(promoUrl), 0, 0, canvas.width, canvas.height);
      promo = await new Promise((resolve, reject) => canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error("Final slide encoding failed")), "image/jpeg", 0.98));
    } else {
      const response = await fetch(promoUrl);
      if (!response.ok || !response.headers.get("content-type")?.includes("image/jpeg")) {
        throw new Error("Could not load the Save 50% slide");
      }
      promo = await response.blob();
    }
    const finalSlide = await promo.arrayBuffer();
    zip.file("09-save-50.jpg", finalSlide);
    if (makeVideo) {
      const video = await makeVideo([...slides, finalSlide]);
      if (video) zip.file("listing-video.mp4", video);
    }
    return await zip.generateAsync({ type: "blob", compression: "STORE" });
  } finally {
    for (const source of artwork.values()) source.close();
    canvas.width = canvas.height = 0;
  }
}

async function recordPictureListingVideo(slides, onStart) {
  const mimeType = ["video/mp4;codecs=avc1.420034", "video/mp4"].find(type => globalThis.MediaRecorder?.isTypeSupported(type));
  if (!mimeType || !slides.length) return null;
  const canvas = document.createElement("canvas");
  if (!canvas.captureStream) return null;
  canvas.width = 1080;
  canvas.height = 1080;
  const context = canvas.getContext("2d");
  const images = [];
  let stream, recorder, timer, interrupted = false;
  try {
    for (const slide of slides) images.push(await createImageBitmap(new Blob([slide], { type: "image/jpeg" })));
    function show(image) {
      context.fillStyle = "#f4f1ed";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    show(images[0]);
    stream = canvas.captureStream(30);
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
    const chunks = [];
    const recording = new Promise((resolve, reject) => {
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = event => reject(event.error);
      recorder.onstop = () => resolve(!interrupted && chunks.length ? new Blob(chunks, { type: "video/mp4" }) : null);
    });
    onStart();
    recorder.start();
    const start = performance.now();
    timer = setInterval(() => {
      if (recorder.state !== "recording") return;
      if (document.hidden) {
        interrupted = true;
        recorder.stop();
        return;
      }
      const index = Math.floor((performance.now() - start) / 1500);
      if (index >= images.length) recorder.stop();
      else show(images[index]);
    }, 30);
    return await recording;
  } catch (error) {
    console.warn("Could not record Etsy listing MP4", error);
    return null;
  } finally {
    clearInterval(timer);
    if (recorder?.state === "recording") recorder.stop();
    stream?.getTracks().forEach(track => track.stop());
    images.forEach(image => image.close());
    canvas.width = canvas.height = 0;
  }
}

async function loadListingImage(source) {
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}

async function renderPictureSheetPng(game, job, JsPdf, images, drawSheet) {
  const canvas = document.createElement("canvas");
  canvas.width = job.twoUp ? 1584 : 1224;
  canvas.height = job.twoUp ? 1224 : 1584;
  try {
    const metrics = new JsPdf({ unit: "pt" });
    drawSheet(pngSheetDrawing(canvas, metrics, images), { ...game, ...job });
    return await pngBytes(canvas);
  } finally {
    canvas.width = canvas.height = 0;
  }
}

async function captureOfflineCallerPng(html, capture) {
  const iframe = document.createElement("iframe");
  iframe.title = "Offline caller export";
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.style.cssText = "position:fixed;left:-20000px;top:0;width:1440px;height:900px;border:0;pointer-events:none";
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Caller preview did not load")), 10000);
      iframe.addEventListener("load", () => { clearTimeout(timer); resolve(); }, { once: true });
      // html2canvas creates its own temporary frame inside the capture document.
      // Only this internal copy omits the offline file's restrictive policy.
      iframe.srcdoc = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, "");
      document.body.append(iframe);
    });
    const caller = iframe.contentDocument;
    const next = caller.getElementById("next-call");
    const game = JSON.parse(caller.getElementById("game-data").textContent);
    for (let i = 0; i < Math.min(4, game.pictures.length); i++) next.click();
    const visibleImages = [...caller.images].filter(image => !image.hidden && image.src);
    await Promise.all(visibleImages.map(image => {
      image.loading = "eager";
      return image.decode();
    }));
    const stage = caller.querySelector(".stage");
    stage.style.height = `${stage.getBoundingClientRect().height}px`;
    // Canvas capture does not consistently honour object-fit.
    for (const image of visibleImages) {
      const box = image.getBoundingClientRect();
      const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
      image.style.width = `${image.naturalWidth * scale}px`;
      image.style.height = `${image.naturalHeight * scale}px`;
      image.style.minHeight = "0";
    }
    const canvas = await capture(caller.body, {
      width: 1440, height: 900, windowWidth: 1440, windowHeight: 900,
      scale: 1, backgroundColor: "#f3f7f6", logging: false,
    });
    try {
      return await pngBytes(canvas);
    } finally {
      canvas.width = canvas.height = 0;
    }
  } finally {
    iframe.remove();
  }
}

if (typeof module !== "undefined") module.exports = { buildPicturePngPack, buildPictureListingPack, renderPictureSheetPng, drawPictureListingCover, drawPictureListingPage, pictureListingPages };
