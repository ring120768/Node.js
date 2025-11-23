/**
 * Generate QR codes for Railway production URL
 * Creates both PNG and SVG versions
 */

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const RAILWAY_URL = 'https://car-crash-lawyer-ai-production.up.railway.app/';

const qrOptions = {
  errorCorrectionLevel: 'H',
  width: 500,
  margin: 2,
  color: {
    dark: '#0E7490',  // Deep Teal (brand color)
    light: '#FFFFFF'
  }
};

async function generateQRCodes() {
  try {
    console.log('🎯 Generating QR codes for Railway production URL...');
    console.log(`📍 URL: ${RAILWAY_URL}`);
    console.log('');

    // Generate PNG
    const pngPath = path.join(__dirname, 'public', 'railway-qr-code.png');
    await QRCode.toFile(pngPath, RAILWAY_URL, qrOptions);
    console.log(`✅ PNG saved: ${pngPath}`);

    // Generate high-res PNG (for print)
    const pngHiResPath = path.join(__dirname, 'public', 'railway-qr-code-hires.png');
    await QRCode.toFile(pngHiResPath, RAILWAY_URL, { ...qrOptions, width: 1000 });
    console.log(`✅ High-res PNG saved: ${pngHiResPath}`);

    // Generate SVG
    const svgPath = path.join(__dirname, 'public', 'railway-qr-code.svg');
    const svgString = await QRCode.toString(RAILWAY_URL, { ...qrOptions, type: 'svg' });
    fs.writeFileSync(svgPath, svgString);
    console.log(`✅ SVG saved: ${svgPath}`);

    console.log('');
    console.log('🎉 All QR codes generated successfully!');
    console.log('');
    console.log('📦 Files created:');
    console.log('  • railway-qr-code.png (500x500) - For web/social media');
    console.log('  • railway-qr-code-hires.png (1000x1000) - For print');
    console.log('  • railway-qr-code.svg (vector) - For scalable graphics');
    console.log('');
    console.log('🌐 Access via:');
    console.log('  • http://localhost:3000/railway-qr-code.png');
    console.log('  • http://localhost:3000/railway-qr-code-hires.png');
    console.log('  • http://localhost:3000/railway-qr-code.svg');
    console.log('');
    console.log('📱 Test by scanning with your phone camera!');

  } catch (error) {
    console.error('❌ Error generating QR codes:', error.message);
    process.exit(1);
  }
}

generateQRCodes();
