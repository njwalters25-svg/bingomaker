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
  const total = jobs.length + 1;
  for (const [index, job] of jobs.entries()) {
    await onProgress(index + 1, total);
    zip.file(job.path, await renderSheet(job));
  }
  await onProgress(total, total);
  zip.file("offline-caller.png", await captureCaller());
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
    setTextColor: (r, g, b) => { context.fillStyle = `rgb(${r},${g},${b})`; },
    setDrawColor: (r, g, b) => { context.strokeStyle = typeof r === "string" ? r : `rgb(${r},${g},${b})`; },
    setLineWidth: value => { context.lineWidth = value; },
    rect: (...args) => context.strokeRect(...args),
    text: (value, x, y, options) => {
      context.textAlign = options.align;
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

if (typeof module !== "undefined") module.exports = { buildPicturePngPack, renderPictureSheetPng };
