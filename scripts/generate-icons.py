"""Erzeugt die PWA-Icons aus der Geometrie von public/favicon.svg.

Bisher lag nur ein SVG-Favicon vor. iOS ignoriert SVG-Icons beim Hinzufuegen
zum Home-Bildschirm, und Chrome braucht 192/512-PNGs fuer Splashscreen und
Installierbarkeit. Statt eine Bildbibliothek als Abhaengigkeit aufzunehmen,
rastert dieses Skript die simple Geometrie (abgerundetes Rechteck plus
Polylinie mit runden Enden) selbst - inklusive Antialiasing per Supersampling.

Aufruf:  python scripts/generate-icons.py
"""

import math
import struct
import zlib
from pathlib import Path

BACKGROUND = (0x0A, 0x0A, 0x0A)
STROKE = (0xF9, 0x73, 0x16)

# Pfad und Radien in der 32x32-Koordinatenwelt des SVG.
VIEWBOX = 32.0
CORNER_RADIUS = 8.0
STROKE_WIDTH = 2.4
POINTS = [(7, 16), (11, 16), (13, 8), (19, 24), (21, 16), (25, 16)]

SUPERSAMPLE = 4


def write_png(path: Path, width: int, height: int, rows: list[list[tuple[int, int, int, int]]]) -> None:
    raw = b"".join(b"\x00" + bytes(v for px in row for v in px) for row in rows)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def distance_to_segment(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    dx, dy = bx - ax, by - ay
    length_sq = dx * dx + dy * dy
    if length_sq == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / length_sq))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def rounded_rect_signed(x: float, y: float, size: float, radius: float) -> float:
    """Negativ innerhalb, positiv ausserhalb – erlaubt eine Grobpruefung pro Pixel."""
    if radius <= 0:
        return max(-x, x - size, -y, y - size)
    cx = min(max(x, radius), size - radius)
    cy = min(max(y, radius), size - radius)
    return math.hypot(x - cx, y - cy) - radius


def stroke_signed(x: float, y: float, points, half_stroke: float) -> float:
    nearest = min(
        distance_to_segment(x, y, *points[i], *points[i + 1]) for i in range(len(points) - 1)
    )
    return nearest - half_stroke


def coverage(x: float, y: float, cell: float, signed, margin: float) -> float:
    """Grobtest am Pixelmittelpunkt; nur Randpixel werden supersampled."""
    centre = signed(x + cell / 2, y + cell / 2)
    if centre > margin:
        return 0.0
    if centre < -margin:
        return 1.0
    step = cell / SUPERSAMPLE
    hits = 0
    for sy in range(SUPERSAMPLE):
        for sx in range(SUPERSAMPLE):
            if signed(x + (sx + 0.5) * step, y + (sy + 0.5) * step) <= 0:
                hits += 1
    return hits / (SUPERSAMPLE * SUPERSAMPLE)


def render(size: int, *, rounded: bool, content_scale: float) -> list[list[tuple[int, int, int, int]]]:
    """content_scale < 1 schrumpft das Glyph fuer die maskable Safe-Zone."""
    unit = size / VIEWBOX
    radius = CORNER_RADIUS * unit if rounded else 0.0
    half_stroke = (STROKE_WIDTH * unit * content_scale) / 2.0
    offset = size * (1 - content_scale) / 2.0
    scaled = [
        (x * unit * content_scale + offset, y * unit * content_scale + offset) for x, y in POINTS
    ]
    # Diagonale eines Pixels: darueber hinaus ist das Ergebnis eindeutig.
    margin = math.sqrt(2.0)

    rows: list[list[tuple[int, int, int, int]]] = []
    for py in range(size):
        row: list[tuple[int, int, int, int]] = []
        for px in range(size):
            bg = coverage(px, py, 1.0, lambda x, y: rounded_rect_signed(x, y, size, radius), margin)
            if bg <= 0.0:
                row.append((0, 0, 0, 0))
                continue
            fg = coverage(px, py, 1.0, lambda x, y: stroke_signed(x, y, scaled, half_stroke), margin)
            mix = min(1.0, fg)
            colour = tuple(round(BACKGROUND[i] * (1 - mix) + STROKE[i] * mix) for i in range(3))
            row.append((colour[0], colour[1], colour[2], round(255 * bg)))
        rows.append(row)
    return rows


TARGETS = [
    # (Datei, Groesse, abgerundet, Glyph-Skalierung)
    ("icon-192.png", 192, True, 1.0),
    ("icon-512.png", 512, True, 1.0),
    # Maskable: volle Flaeche, Glyph in der inneren Safe-Zone (80 %).
    ("icon-512-maskable.png", 512, False, 0.7),
    # iOS rundet das Home-Bildschirm-Icon selbst ab, daher quadratisch.
    ("apple-touch-icon.png", 180, False, 1.0),
]


def main() -> None:
    out_dir = Path(__file__).resolve().parent.parent / "public"
    for name, size, rounded, scale in TARGETS:
        rows = render(size, rounded=rounded, content_scale=scale)
        write_png(out_dir / name, size, size, rows)
        print(f"{name} ({size}x{size}) geschrieben")


if __name__ == "__main__":
    main()
