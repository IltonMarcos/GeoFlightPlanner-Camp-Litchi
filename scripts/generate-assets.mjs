#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

async function ensureSharp() {
  try {
    const sharp = await import('sharp')
    return sharp.default || sharp
  } catch (err) {
    console.error('\n[gen:assets] Missing dependency: sharp\n')
    console.error('Install with:')
    console.error('  npm i -D sharp')
    process.exitCode = 1
    throw err
  }
}

function parseArgs(argv) {
  const args = { logo: null, bg: '#2563EB', text: 'GFP', name: 'GeoFlightPlannerCamp' }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--logo') args.logo = argv[++i]
    else if (a === '--bg') args.bg = argv[++i]
    else if (a === '--text') args.text = argv[++i]
    else if (a === '--name') args.name = argv[++i]
  }
  return args
}

function iconSVG({ size, bg, text }) {
  const radius = Math.round(size * 0.18)
  const fontSize = Math.round(size * 0.42)
  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1E3A8A" />
        <stop offset="60%" stop-color="${bg}" />
        <stop offset="100%" stop-color="#60A5FA" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#g)" />
    <text x="50%" y="54%" text-anchor="middle" font-family="PT Sans, Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#fff" letter-spacing="-2">${text}</text>
  </svg>`
}

function screenshotSVG({ width, height, bg, text, name }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0B1022" />
        <stop offset="50%" stop-color="#0F172A" />
        <stop offset="100%" stop-color="#111827" />
      </linearGradient>
      <linearGradient id="brand" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1E3A8A" />
        <stop offset="60%" stop-color="${bg}" />
        <stop offset="100%" stop-color="#60A5FA" />
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <rect width="40" height="40" fill="none" />
        <path d="M40 0H0M0 40V0" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)" />
    <g transform="translate(64,64)">
      <rect width="160" height="160" rx="28" ry="28" fill="url(#brand)" />
      <text x="80" y="110" text-anchor="middle" font-family="PT Sans, Arial, Helvetica, sans-serif" font-size="72" font-weight="800" fill="#fff">${text}</text>
      <g transform="translate(208,24)">
        <text x="0" y="72" font-family="PT Sans, Arial, Helvetica, sans-serif" font-size="72" font-weight="800" fill="#fff">${name}</text>
        <text x="0" y="120" font-family="PT Sans, Arial, Helvetica, sans-serif" font-size="36" fill="rgba(255,255,255,0.85)">Plan, edit and export drone flight CSVs.</text>
      </g>
    </g>
    <g transform="translate(64,280)">
      <g>
        <rect x="0" y="0" width="${width - 128}" height="${height - 440}" rx="24" ry="24" fill="#0B1220" stroke="#1F2937" />
        <rect x="1" y="1" width="${width - 130}" height="${height - 442}" rx="23" ry="23" fill="url(#grid)" opacity="0.6" />
        <text x="24" y="${height - 480}" font-family="PT Sans, Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="rgba(255,255,255,0.9)">Map preview - CSV import - Export</text>
      </g>
    </g>
  </svg>`
}

async function writePNG(sharp, svg, outPath, width, height) {
  const buf = await sharp(Buffer.from(svg)).resize(width, height, { fit: 'cover' }).png().toBuffer()
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, buf)
  console.log('[gen:assets]', outPath)
}

async function main() {
  const args = parseArgs(process.argv)
  const sharp = await ensureSharp()

  const projectRoot = process.cwd()
  const pub = (p) => path.join(projectRoot, 'public', p)

  if (args.logo) {
    const logoPath = path.resolve(args.logo)
    const img = sharp(logoPath).flatten({ background: '#00000000' })
    await fs.mkdir(pub('icons'), { recursive: true })
    await img.resize(192, 192).png().toFile(pub('icons/icon-192x192.png'))
    console.log('[gen:assets]', pub('icons/icon-192x192.png'))
    await img.resize(512, 512).png().toFile(pub('icons/icon-512x512.png'))
    console.log('[gen:assets]', pub('icons/icon-512x512.png'))
    await img.resize(180, 180).png().toFile(pub('apple-touch-icon.png'))
    console.log('[gen:assets]', pub('apple-touch-icon.png'))
  } else {
    await writePNG(sharp, iconSVG({ size: 192, bg: args.bg, text: args.text }), pub('icons/icon-192x192.png'), 192, 192)
    await writePNG(sharp, iconSVG({ size: 512, bg: args.bg, text: args.text }), pub('icons/icon-512x512.png'), 512, 512)
    await writePNG(sharp, iconSVG({ size: 180, bg: args.bg, text: args.text }), pub('apple-touch-icon.png'), 180, 180)
  }

  await writePNG(sharp, screenshotSVG({ width: 1080, height: 1920, bg: args.bg, text: args.text, name: args.name }), pub('screenshots/screenshot-1080x1920.png'), 1080, 1920)
  await writePNG(sharp, screenshotSVG({ width: 1280, height: 720, bg: args.bg, text: args.text, name: args.name }), pub('screenshots/screenshot-1280x720.png'), 1280, 720)

  console.log('\n[gen:assets] Done.')
}

main().catch((err) => {
  if (!process.exitCode) process.exitCode = 1
  console.error(err?.stack || err?.message || String(err))
})

