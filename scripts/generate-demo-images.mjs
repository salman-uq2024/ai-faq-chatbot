#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const outputDir = path.join(process.cwd(), "public");

createDemoScreenshot({
  filename: "demo-landing.png",
  width: 640,
  height: 360,
  background: [226, 239, 255],
  accents: [
    { x: 40, y: 40, width: 220, height: 24, color: [37, 99, 235] },
    { x: 40, y: 90, width: 380, height: 48, color: [15, 23, 42] },
    { x: 40, y: 150, width: 340, height: 18, color: [71, 85, 105] },
    { x: 40, y: 190, width: 340, height: 18, color: [71, 85, 105] },
    { x: 40, y: 250, width: 180, height: 90, color: [59, 130, 246] },
    { x: 240, y: 250, width: 180, height: 90, color: [191, 219, 254] },
    { x: 440, y: 70, width: 160, height: 220, color: [255, 255, 255] },
  ],
});

createDemoScreenshot({
  filename: "demo-admin.png",
  width: 640,
  height: 360,
  background: [248, 250, 252],
  accents: [
    { x: 40, y: 32, width: 560, height: 60, color: [15, 23, 42] },
    { x: 40, y: 112, width: 320, height: 180, color: [255, 255, 255] },
    { x: 380, y: 112, width: 220, height: 80, color: [226, 232, 240] },
    { x: 380, y: 208, width: 220, height: 84, color: [37, 99, 235] },
    { x: 40, y: 308, width: 560, height: 20, color: [148, 163, 184] },
  ],
});

function createDemoScreenshot({ filename, width, height, background, accents }) {
  const png = new PNG({ width, height, filterType: -1 });

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (width * y + x) << 2;
      const gradientFactor = y / height;
      png.data[idx] = background[0] * (1 - gradientFactor) + 255 * gradientFactor * 0.08;
      png.data[idx + 1] = background[1] * (1 - gradientFactor) + 255 * gradientFactor * 0.08;
      png.data[idx + 2] = background[2] * (1 - gradientFactor) + 255 * gradientFactor * 0.08;
      png.data[idx + 3] = 255;
    }
  }

  for (const accent of accents) {
    drawRect(png, accent.x, accent.y, accent.width, accent.height, accent.color);
  }

  const buffer = PNG.sync.write(png);
  writeFileSync(path.join(outputDir, filename), buffer);
}

function drawRect(png, startX, startY, boxWidth, boxHeight, color) {
  for (let y = startY; y < startY + boxHeight; y += 1) {
    for (let x = startX; x < startX + boxWidth; x += 1) {
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
      const idx = (png.width * y + x) << 2;
      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = 255;
    }
  }
}
