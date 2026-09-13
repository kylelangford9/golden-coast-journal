import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const width = 1200;
const height = 630;
const overlay = Buffer.from(`
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#07192f" stop-opacity="0.96"/>
        <stop offset="0.62" stop-color="#07192f" stop-opacity="0.72"/>
        <stop offset="1" stop-color="#07192f" stop-opacity="0.14"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#shade)"/>
    <rect x="70" y="74" width="86" height="8" fill="#b64c2f"/>
    <text x="70" y="142" fill="#f7f0e5" font-family="Georgia, serif" font-size="30" letter-spacing="5">THE</text>
    <text x="66" y="242" fill="#ffffff" font-family="Georgia, serif" font-size="90" font-weight="700">Golden Coast</text>
    <text x="66" y="335" fill="#ffffff" font-family="Georgia, serif" font-size="90" font-weight="700">Journal</text>
    <text x="70" y="407" fill="#f2c7ae" font-family="Arial, sans-serif" font-size="28" letter-spacing="2">INDEPENDENT · CLEAR · CALIFORNIA</text>
    <line x1="70" y1="474" x2="630" y2="474" stroke="#f7f0e5" stroke-opacity="0.55"/>
    <text x="70" y="522" fill="#f7f0e5" font-family="Arial, sans-serif" font-size="20">REAL PHOTOGRAPH · SANTA BARBARA, CALIFORNIA</text>
    <text x="70" y="559" fill="#f7f0e5" fill-opacity="0.82" font-family="Arial, sans-serif" font-size="17">Photo: Clayton Cardinalli / Unsplash</text>
  </svg>
`);

await sharp(fileURLToPath(new URL('../public/california-coast.jpg', import.meta.url)))
  .resize(width, height, { fit: 'cover', position: 'centre' })
  .composite([{ input: overlay }])
  .png({ compressionLevel: 9, palette: true })
  .toFile(fileURLToPath(new URL('../public/og.png', import.meta.url)));
