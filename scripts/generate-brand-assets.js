const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function generateAll() {
  const rootDir = path.resolve(__dirname, '..');
  const svgPath = path.join(rootDir, 'guarapuava_digital_logo.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  console.log('1. Copying SVG files...');
  fs.copyFileSync(svgPath, path.join(rootDir, 'logo.svg'));
  fs.copyFileSync(svgPath, path.join(rootDir, 'src/app/icon.svg'));
  fs.copyFileSync(svgPath, path.join(rootDir, 'public/logo.svg'));
  fs.copyFileSync(svgPath, path.join(rootDir, 'public/icon.svg'));

  console.log('2. Generating Apple Touch Icon (180x180 with 154px centered logo)...');
  const appleLogo = await sharp(svgPath, { density: 300 })
    .resize(154, 154)
    .png()
    .toBuffer();

  const appleIconBuffer = await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: appleLogo, top: 13, left: 13 }])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(rootDir, 'src/app/apple-icon.png'), appleIconBuffer);
  fs.writeFileSync(path.join(rootDir, 'public/apple-icon.png'), appleIconBuffer);

  console.log('3. Generating PWA Icons (192x192 and 512x512 with safe area)...');
  const pwaLogo192 = await sharp(svgPath, { density: 300 })
    .resize(164, 164)
    .png()
    .toBuffer();

  const pwa192Buffer = await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: pwaLogo192, top: 14, left: 14 }])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(rootDir, 'public/icon-192x192.png'), pwa192Buffer);

  const pwaLogo512 = await sharp(svgPath, { density: 300 })
    .resize(440, 440)
    .png()
    .toBuffer();

  const pwa512Buffer = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: pwaLogo512, top: 36, left: 36 }])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(rootDir, 'public/icon-512x512.png'), pwa512Buffer);

  console.log('4. Generating 32x32 Favicon PNG...');
  await sharp(svgPath, { density: 300 })
    .resize(32, 32)
    .png()
    .toFile(path.join(rootDir, 'public/icon-32x32.png'));

  console.log('5. Generating Favicon ICO...');
  const tmpFaviconPng = path.join(rootDir, '.temp_favicon_48.png');
  await sharp(svgPath, { density: 300 })
    .resize(48, 48)
    .png()
    .toFile(tmpFaviconPng);

  const appIco = path.join(rootDir, 'src/app/favicon.ico');
  const pubIco = path.join(rootDir, 'public/favicon.ico');
  execSync(`sips -s format ico "${tmpFaviconPng}" --out "${appIco}"`);
  fs.copyFileSync(appIco, pubIco);
  fs.unlinkSync(tmpFaviconPng);

  console.log('6. Generating OpenGraph Social Share Card (1200x630)...');
  const rawSvgInner = svgContent
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<svg[^>]*>/gi, '')
    .replace(/<\/svg>/gi, '');

  const ogCardSvg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#181a1e" />
        <stop offset="100%" stop-color="#111215" />
      </linearGradient>
      <radialGradient id="ogGlow" cx="50%" cy="38%" r="48%">
        <stop offset="0%" stop-color="#FF4C46" stop-opacity="0.16" />
        <stop offset="60%" stop-color="#FF4C46" stop-opacity="0.04" />
        <stop offset="100%" stop-color="#181a1e" stop-opacity="0" />
      </radialGradient>
      <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#000000" flood-opacity="0.45" />
      </filter>
    </defs>

    <!-- Fundo Escuro Neumórfico -->
    <rect width="1200" height="630" fill="url(#ogBg)" />
    <circle cx="600" cy="225" r="340" fill="url(#ogGlow)" />

    <!-- Moldura Sutil de Cartão -->
    <rect x="28" y="28" width="1144" height="574" rx="28" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="2" />

    <!-- Logo Centralizada com Sombra Suave (210x210 a partir de 182x182) -->
    <g filter="url(#dropShadow)">
      <g transform="translate(495, 115) scale(1.1538)">
        ${rawSvgInner}
      </g>
    </g>

    <!-- Títulos e Tipografia -->
    <text x="600" y="415" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="48" font-weight="700" letter-spacing="-1">Guarapuava Digital</text>
    
    <text x="600" y="468" text-anchor="middle" fill="#a0a6b1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="24" font-weight="400">Notícias e Vagas de Emprego de Hoje</text>

    <!-- Badge Pill -->
    <g transform="translate(475, 510)">
      <rect width="250" height="40" rx="20" fill="rgba(255, 76, 70, 0.12)" stroke="rgba(255, 76, 70, 0.35)" stroke-width="1.5" />
      <circle cx="24" cy="20" r="5" fill="#FF4C46" />
      <text x="38" y="26" fill="#FF6B66" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="600" letter-spacing="0.6">ATUALIZADO EM TEMPO REAL</text>
    </g>
  </svg>
  `;

  const ogBuffer = await sharp(Buffer.from(ogCardSvg)).png().toBuffer();
  fs.writeFileSync(path.join(rootDir, 'src/app/opengraph-image.png'), ogBuffer);
  fs.writeFileSync(path.join(rootDir, 'public/og-image.png'), ogBuffer);

  console.log('All brand assets successfully generated!');
}

generateAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
