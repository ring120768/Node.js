/**
 * Embed QR code into Car Crash Lawyer AI logo
 * Adds QR code to top right corner with white background
 */

const sharp = require('sharp');
const path = require('path');

async function embedQRInLogo() {
  try {
    console.log('🎨 Embedding QR code into logo...');

    // Paths
    const logoPath = process.argv[2] || 'logo-input.png';
    const qrPath = path.join(__dirname, 'public', 'railway-qr-code.png');
    const outputPath = path.join(__dirname, 'public', 'logo-with-qr.png');

    // Load logo to get dimensions
    const logo = sharp(logoPath);
    const logoMetadata = await logo.metadata();

    console.log(`📏 Logo dimensions: ${logoMetadata.width}x${logoMetadata.height}`);

    // QR code size (proportional to logo, but not too large)
    const qrSize = Math.min(Math.floor(logoMetadata.width * 0.18), 200);
    const padding = Math.floor(qrSize * 0.15); // 15% padding
    const borderRadius = Math.floor(qrSize * 0.1); // 10% border radius

    console.log(`📐 QR code size: ${qrSize}x${qrSize} with ${padding}px padding`);

    // Create QR code with white rounded background
    const qrWithBg = await sharp(qrPath)
      .resize(qrSize, qrSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();

    // Get final QR dimensions with background
    const qrFinal = sharp(qrWithBg);
    const qrMetadata = await qrFinal.metadata();

    // Position in top right corner
    const left = logoMetadata.width - qrMetadata.width - Math.floor(logoMetadata.width * 0.03);
    const top = Math.floor(logoMetadata.height * 0.03);

    console.log(`📍 Positioning QR at: (${left}, ${top})`);

    // Composite QR onto logo
    await logo
      .composite([{
        input: qrWithBg,
        left: left,
        top: top
      }])
      .png()
      .toFile(outputPath);

    console.log('✅ Logo with QR code created!');
    console.log(`📁 Saved to: ${outputPath}`);
    console.log('');
    console.log('🌐 Access at: http://localhost:3000/logo-with-qr.png');

  } catch (error) {
    console.error('❌ Error embedding QR code:', error.message);
    if (error.message.includes('Input file')) {
      console.error('\n💡 Please provide the logo file as first argument:');
      console.error('   node embed-qr-in-logo.js /path/to/logo.png');
    }
    process.exit(1);
  }
}

embedQRInLogo();
