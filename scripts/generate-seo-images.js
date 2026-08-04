/**
 * Generates the SEO/social image assets referenced by every page head:
 *   public/favicon.ico          32x32 (PNG-in-ICO container)
 *   public/apple-touch-icon.png 180x180
 *   public/images/og-image.png  1200x630
 *
 * Source: public/images/car-crash-lawyer-ai-450.webp
 * Run: node scripts/generate-seo-images.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PUBLIC = path.join(__dirname, '..', 'public');
const LOGO = path.join(PUBLIC, 'images', 'car-crash-lawyer-ai-450.webp');
const BRAND = '#0B7AB0';

/** Wrap a PNG buffer in a single-image .ico container (PNG-in-ICO, supported since Vista). */
function pngToIco(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);              // reserved
  header.writeUInt16LE(1, 2);              // type: icon
  header.writeUInt16LE(1, 4);              // image count
  header.writeUInt8(size === 256 ? 0 : size, 6);  // width
  header.writeUInt8(size === 256 ? 0 : size, 7);  // height
  header.writeUInt8(0, 8);                 // palette
  header.writeUInt8(0, 9);                 // reserved
  header.writeUInt16LE(1, 10);             // colour planes
  header.writeUInt16LE(32, 12);            // bits per pixel
  header.writeUInt32LE(png.length, 14);    // image size
  header.writeUInt32LE(22, 18);            // offset
  return Buffer.concat([header, png]);
}

async function main() {
  if (!fs.existsSync(LOGO)) throw new Error(`Missing source logo: ${LOGO}`);

  // favicon.ico — 32x32, flattened onto brand blue (ICO has no reliable alpha in all clients)
  const fav = await sharp(LOGO)
    .resize(32, 32, { fit: 'contain', background: BRAND })
    .flatten({ background: BRAND })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), pngToIco(fav, 32));

  // apple-touch-icon.png — 180x180, no transparency (iOS renders alpha as black)
  await sharp(LOGO)
    .resize(180, 180, { fit: 'contain', background: BRAND })
    .flatten({ background: BRAND })
    .png()
    .toFile(path.join(PUBLIC, 'apple-touch-icon.png'));

  // og-image.png — 1200x630: logo left, brand + tagline right
  const logo = await sharp(LOGO).resize(360, 360, { fit: 'inside' }).png().toBuffer();
  const text = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <text x="500" y="270" font-family="Helvetica, Arial, sans-serif" font-size="62"
            font-weight="700" fill="#ffffff">Car Crash Lawyer AI</text>
      <text x="500" y="340" font-family="Helvetica, Arial, sans-serif" font-size="34"
            fill="#e0f2fe">Record crash evidence at the scene.</text>
      <text x="500" y="390" font-family="Helvetica, Arial, sans-serif" font-size="34"
            fill="#e0f2fe">Get a complete UK incident report.</text>
    </svg>`);

  await sharp({
    create: { width: 1200, height: 630, channels: 4, background: BRAND }
  })
    .composite([
      { input: logo, top: 135, left: 90 },
      { input: text, top: 0, left: 0 }
    ])
    .png()
    .toFile(path.join(PUBLIC, 'images', 'og-image.png'));

  console.log('Generated favicon.ico, apple-touch-icon.png, images/og-image.png');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
