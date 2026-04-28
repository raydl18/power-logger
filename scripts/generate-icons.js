// scripts/generate-icons.js
// Run: node scripts/generate-icons.js
// Generates PWA icons at 192×192 and 512×512 from an SVG source.

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const svgSource = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
  <rect width="100" height="100" rx="18" fill="#0a0a0a"/>
  <!-- Bar -->
  <rect x="32" y="46" width="36" height="8" rx="2" fill="#fafafa"/>
  <!-- Left weight plates -->
  <rect x="18" y="38" width="6" height="24" rx="2" fill="#fafafa"/>
  <rect x="12" y="41" width="6" height="18" rx="2" fill="#fafafa"/>
  <!-- Right weight plates -->
  <rect x="76" y="38" width="6" height="24" rx="2" fill="#fafafa"/>
  <rect x="82" y="41" width="6" height="18" rx="2" fill="#fafafa"/>
  <!-- "W" mark in center -->
  <text x="50" y="72" text-anchor="middle" font-family="Courier New, monospace"
        font-size="14" font-weight="bold" fill="#0a0a0a">WRK</text>
</svg>
`;

const sizes = [192, 512];
const iconsDir = path.join(process.cwd(), "public", "icons");

async function generateIcons() {
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const buf = Buffer.from(svgSource);

  for (const size of sizes) {
    const outPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(buf).resize(size, size).png().toFile(outPath);
    console.log(`✓ Generated ${outPath}`);
  }

  // Also write the raw SVG for use as maskable icon
  fs.writeFileSync(path.join(iconsDir, "icon.svg"), svgSource.trim());
  console.log("✓ Wrote icon.svg");
}

generateIcons().catch((err) => {
  console.error("Icon generation failed:", err.message);
  process.exit(1);
});
