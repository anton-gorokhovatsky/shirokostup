#!/usr/bin/env python3
"""Generate deterministic responsive JPEG, WebP, and AVIF portfolio imagery."""

from pathlib import Path

from PIL import Image, ImageOps


SOURCE_DIR = Path(__file__).resolve().parents[1] / "assets" / "images"
OUTPUT_DIR = SOURCE_DIR / "responsive"
TARGET_WIDTHS = (480, 800, 1280)
MODERN_FORMATS = {
    "webp": {"format": "WEBP", "quality": 80, "method": 6},
    "avif": {"format": "AVIF", "quality": 54, "speed": 6},
}


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)

    for source in sorted(SOURCE_DIR.glob("*.jpg")):
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")

        widths = sorted({width for width in TARGET_WIDTHS if width < image.width} | {image.width})
        for width in widths:
            height = round(image.height * width / image.width)
            resized = image.resize((width, height), Image.Resampling.LANCZOS)

            if width < image.width:
                jpeg_target = OUTPUT_DIR / f"{source.stem}-{width}.jpg"
                resized.save(
                    jpeg_target,
                    "JPEG",
                    quality=82,
                    optimize=True,
                    progressive=True,
                    subsampling=2,
                )
                print(f"{jpeg_target.relative_to(SOURCE_DIR.parent.parent)} {width}x{height}")

            for extension, options in MODERN_FORMATS.items():
                modern_target = OUTPUT_DIR / f"{source.stem}-{width}.{extension}"
                resized.save(modern_target, **options)
                print(f"{modern_target.relative_to(SOURCE_DIR.parent.parent)} {width}x{height}")


if __name__ == "__main__":
    main()
