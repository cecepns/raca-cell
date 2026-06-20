import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const frontendAssets = path.join(root, "..", "frontend", "src", "assets");
const assetsDir = path.join(root, "assets");

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function createIcon() {
  const size = 1024;
  const logoSize = Math.round(size * 0.58);
  const logo = await sharp(path.join(frontendAssets, "logo-icon.png"))
    .resize(logoSize, logoSize, { fit: "contain", background: WHITE })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: WHITE,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(assetsDir, "icon.png"));

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: WHITE,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(assetsDir, "adaptive-icon.png"));

  console.log("Created icon.png & adaptive-icon.png");
}

async function createSplash() {
  const width = 1284;
  const height = 2778;
  const maxLogoWidth = Math.round(width * 0.72);
  const maxLogoHeight = Math.round(height * 0.42);

  const logo = await sharp(path.join(frontendAssets, "logo.png"))
    .resize(maxLogoWidth, maxLogoHeight, { fit: "inside", background: WHITE })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: WHITE,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(assetsDir, "splash.png"));

  console.log("Created splash.png");
}

await createIcon();
await createSplash();
