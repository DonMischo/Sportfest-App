"""
Generates icon.png (256x256) and icon.ico (multi-size) for the Sportfest app.
Run from anywhere:  python assets/make_icon.py
"""
from PIL import Image, ImageDraw
import math, os

OUT = os.path.join(os.path.dirname(__file__))

BLUE   = (37, 99, 235, 255)
WHITE  = (255, 255, 255, 255)
TRANSP = (0, 0, 0, 0)


def draw_runner(draw: ImageDraw.ImageDraw, s: float):
    """Draw a running man silhouette. s = pixels per unit (1 unit = 1/256 of icon)."""
    W = int

    def pt(x, y):
        return (x * s, y * s)

    def line(a, b, w=10):
        draw.line([pt(*a), pt(*b)], fill=WHITE, width=W(w * s))

    def circle(cx, cy, r):
        x0, y0 = cx * s - r * s, cy * s - r * s
        x1, y1 = cx * s + r * s, cy * s + r * s
        draw.ellipse([x0, y0, x1, y1], fill=WHITE)

    # --- Head ---
    circle(152, 52, 20)

    # --- Torso (leaning forward) ---
    line((147, 74), (128, 140), w=13)

    # --- Right arm (pumping forward) ---
    line((142, 90), (168, 108), w=10)
    line((168, 108), (178,  88), w=10)

    # --- Left arm (swinging back) ---
    line((138, 92), (112, 118), w=10)
    line((112, 118), (100, 140), w=10)

    # --- Right leg (stride forward) ---
    line((128, 140), (150, 182), w=12)
    line((150, 182), (172, 204), w=12)

    # --- Left leg (pushing off) ---
    line((128, 140), (108, 178), w=12)
    line((108, 178), ( 92, 205), w=12)


def make_icon(size=256) -> Image.Image:
    img  = Image.new("RGBA", (size, size), TRANSP)
    draw = ImageDraw.Draw(img)
    s    = size / 256

    # Background circle
    pad = int(4 * s)
    draw.ellipse([pad, pad, size - pad, size - pad], fill=BLUE)

    draw_runner(draw, s)
    return img


if __name__ == "__main__":
    # Full-res PNG
    big = make_icon(256)
    big.save(os.path.join(OUT, "icon.png"))
    print("Saved icon.png")

    # Multi-size ICO  (256, 128, 64, 48, 32, 16)
    sizes   = [256, 128, 64, 48, 32, 16]
    resized = [make_icon(s) for s in sizes]
    resized[0].save(
        os.path.join(OUT, "icon.ico"),
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=resized[1:],
    )
    print("Saved icon.ico")

    # Small PNG for HTML favicon (32x32)
    make_icon(32).save(os.path.join(OUT, "favicon.png"))
    print("Saved favicon.png")
