#!/usr/bin/env python3
"""Generate the extension's PNG icons without external SVG tooling."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"


def scaled(value: float, size: int) -> int:
    return round(value * size / 128)


def create_icon(size: int) -> None:
    scale = 4
    canvas_size = size * scale
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    def point(value: float) -> int:
        return scaled(value, canvas_size)

    draw.rounded_rectangle(
        (point(6), point(6), point(122), point(122)),
        radius=point(34),
        fill=(27, 131, 153, 255),
    )

    line_width = max(2, point(8))
    draw.arc(
        (point(31), point(32), point(97), point(98)),
        start=205,
        end=335,
        fill=(255, 255, 255, 255),
        width=line_width,
    )
    draw.arc(
        (point(40), point(49), point(88), point(95)),
        start=205,
        end=335,
        fill=(191, 245, 239, 255),
        width=max(2, point(7)),
    )
    draw.arc(
        (point(50), point(64), point(78), point(92)),
        start=205,
        end=335,
        fill=(255, 255, 255, 255),
        width=max(2, point(6)),
    )
    draw.rounded_rectangle(
        (point(31), point(85), point(97), point(94)),
        radius=point(4.5),
        fill=(255, 255, 255, 248),
    )

    image = image.resize((size, size), Image.Resampling.LANCZOS)
    image.save(ASSETS / f"icon-{size}.png", optimize=True)


if __name__ == "__main__":
    for icon_size in (16, 32, 48, 128):
        create_icon(icon_size)
