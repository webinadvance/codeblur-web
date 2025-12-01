#!/usr/bin/env python3
from PIL import Image, ImageDraw
import os

# Create icons directory if it doesn't exist
os.makedirs('icons', exist_ok=True)

sizes = [72, 96, 128, 144, 152, 192, 384, 512]

for size in sizes:
    # Create image
    img = Image.new('RGB', (size, size), '#00d4ff')
    draw = ImageDraw.Draw(img)

    # Inner square
    padding = int(size * 0.1)
    draw.rectangle(
        [padding, padding, size - padding, size - padding],
        fill='#000000'
    )

    # Code brackets
    line_width = max(2, int(size * 0.03))

    # Left bracket
    left_x = int(size * 0.20)
    left_outer_x = int(size * 0.27)
    top_y = int(size * 0.35)
    middle_y = int(size * 0.50)
    bottom_y = int(size * 0.65)

    draw.line([(left_outer_x, top_y), (left_x, middle_y)], fill='#00d4ff', width=line_width)
    draw.line([(left_x, middle_y), (left_outer_x, bottom_y)], fill='#00d4ff', width=line_width)

    # Right bracket
    right_x = int(size * 0.80)
    right_outer_x = int(size * 0.73)

    draw.line([(right_outer_x, top_y), (right_x, middle_y)], fill='#00d4ff', width=line_width)
    draw.line([(right_x, middle_y), (right_outer_x, bottom_y)], fill='#00d4ff', width=line_width)

    # Blur lines
    line_height = max(2, int(size * 0.024))
    line1_y = int(size * 0.39)
    line2_y = int(size * 0.49)
    line3_y = int(size * 0.59)
    start_x = int(size * 0.35)

    draw.rounded_rectangle(
        [start_x, line1_y, start_x + int(size * 0.16), line1_y + line_height],
        radius=line_height//2,
        fill='#00d4ff'
    )
    draw.rounded_rectangle(
        [start_x, line2_y, start_x + int(size * 0.30), line2_y + line_height],
        radius=line_height//2,
        fill='#00d4ff'
    )
    draw.rounded_rectangle(
        [start_x, line3_y, start_x + int(size * 0.23), line3_y + line_height],
        radius=line_height//2,
        fill='#00d4ff'
    )

    # Save
    filename = f'icons/icon-{size}x{size}.png'
    img.save(filename, 'PNG')
    print(f'Generated {filename}')

print('All icons generated!')
