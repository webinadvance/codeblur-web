const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#00d4ff';
    ctx.fillRect(0, 0, size, size);

    // Inner square
    const padding = size * 0.1;
    ctx.fillStyle = '#000';
    ctx.fillRect(padding, padding, size - 2*padding, size - 2*padding);

    // Code brackets and lines
    ctx.strokeStyle = '#00d4ff';
    ctx.fillStyle = '#00d4ff';
    ctx.lineWidth = size * 0.03;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Left bracket
    ctx.beginPath();
    ctx.moveTo(size * 0.27, size * 0.35);
    ctx.lineTo(size * 0.20, size * 0.50);
    ctx.lineTo(size * 0.27, size * 0.65);
    ctx.stroke();

    // Right bracket
    ctx.beginPath();
    ctx.moveTo(size * 0.73, size * 0.35);
    ctx.lineTo(size * 0.80, size * 0.50);
    ctx.lineTo(size * 0.73, size * 0.65);
    ctx.stroke();

    // Blur lines
    const lineHeight = size * 0.024;
    const radius = lineHeight / 2;

    // Line 1
    ctx.beginPath();
    ctx.roundRect(size * 0.35, size * 0.39, size * 0.16, lineHeight, radius);
    ctx.fill();

    // Line 2
    ctx.beginPath();
    ctx.roundRect(size * 0.35, size * 0.49, size * 0.30, lineHeight, radius);
    ctx.fill();

    // Line 3
    ctx.beginPath();
    ctx.roundRect(size * 0.35, size * 0.59, size * 0.23, lineHeight, radius);
    ctx.fill();

    // Save
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`icons/icon-${size}x${size}.png`, buffer);
    console.log(`Generated icon-${size}x${size}.png`);
});

console.log('All icons generated!');
