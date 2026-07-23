#!/usr/bin/env python3
"""Generate deterministic responsive JPEG derivatives for portfolio imagery."""

from pathlib import Path

from PIL import Image, ImageOps


SOURCE_DIR = Path(__file__).resolve().parents[1] / "assets" / "images"
OUTPUT_DIR = SOURCE_DIR / "responsive"
TARGET_WIDTHS = (480, 800, 1280)


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)

    for source in sorted(SOURCE_DIR.glob("*.jpg")):
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")

        for width in TARGET_WIDTHS:
            if width >= image.width:
                continue

            height = round(image.height * width / image.width)
            target = OUTPUT_DIR / f"{source.stem}-{width}.jpg"
            resized = image.resize((width, height), Image.Resampling.LANCZOS)
            resized.save(
                target,
                "JPEG",
                quality=82,
                optimize=True,
                progressive=True,
                subsampling=2,
            )
            print(f"{target.relative_to(SOURCE_DIR.parent.parent)} {width}x{height}")


if __name__ == "__main__":
    main()
