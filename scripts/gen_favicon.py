"""Generate favicon.ico, apple-touch-icon.png, logo.png, logo@2x.png
using pure Pillow — no cairosvg, no SVG rendering.
Draws the same lightning-bolt logo as the navbar SVG."""

from PIL import Image, ImageDraw
import os, math

OUT_DIR = "/home/z/my-project/public"
BG_COLOR = (79, 70, 229)  # #4f46e5
BOLT_COLOR = (255, 255, 255)  # white

# Lightning bolt polygon — normalized to 0-1 range (fits in a unit square)
# Matches the SVG path: M19 4L10 18h6l-3 10 9-14h-6l3-10z
# but centered and padded slightly
BOLT_POINTS = [
    (0.59375, 0.125),   # 19/32, 4/32  — top of bolt
    (0.3125,  0.5625),  # 10/32, 18/32 — left notch bottom
    (0.5,     0.5625),  # 16/32, 18/32 — right side of notch
    (0.40625, 0.875),   # 13/32, 28/32 — bottom tip
    (0.6875,  0.4375),  # 22/32, 14/32 — right notch bottom
    (0.5,     0.4375),  # 16/32, 14/32 — left side of notch
]


def create_logo(size: int) -> Image.Image:
    """Create the lightning bolt logo at the given pixel size."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw rounded rectangle background
    radius = int(size * 0.25)
    draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=radius, fill=BG_COLOR)

    # Scale bolt points to actual pixel size
    pad = size * 0.08  # slight padding
    inner = size - 2 * pad
    points = [(pad + px * inner, pad + py * inner) for px, py in BOLT_POINTS]

    draw.polygon(points, fill=BOLT_COLOR)

    return img


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    # apple-touch-icon (180x180)
    apple = create_logo(180)
    apple_path = os.path.join(OUT_DIR, "apple-touch-icon.png")
    apple.save(apple_path, "PNG")
    print(f"Saved {apple_path}")

    # favicon.ico (multi-size: 16, 32, 48)
    base = create_logo(256)
    sizes = [(16, 16), (32, 32), (48, 48)]
    ico_images = [base.resize(s, Image.LANCZOS) for s in sizes]
    ico_path = os.path.join(OUT_DIR, "favicon.ico")
    ico_images[0].save(ico_path, format="ICO", sizes=sizes)
    print(f"Saved {ico_path}")

    # logo.png (68px) and logo@2x.png (136px)
    for name, px in [("logo.png", 68), ("logo@2x.png", 136)]:
        logo = create_logo(px)
        logo.save(os.path.join(OUT_DIR, name), "PNG")
        print(f"Saved {os.path.join(OUT_DIR, name)}")

    # icon-192.png for PWA
    icon192 = create_logo(192)
    icon192.save(os.path.join(OUT_DIR, "icon-192.png"), "PNG")
    print(f"Saved {os.path.join(OUT_DIR, 'icon-192.png')}")

    print("Done!")


if __name__ == "__main__":
    main()