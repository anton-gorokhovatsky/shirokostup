# ABC Areal

The site uses Dinamo's ABC Areal Variable 1.007, supplied by the site owner, for its sans-serif text.
The existing serif display family remains independent. One unmodified WOFF2 (181,516 bytes) provides
weights 400–700, a real slant axis, and the `DRKM` axis used for light text on dark surfaces.
System, Light and Dark modes resolve the axis through CSS; permanently light or dark labels use
the setting for their own surface. Arial and Helvetica remain loading/failure fallbacks.

Source: [Areal by Dinamo and Are.na](https://are.al.are.na/),
[free font download](https://abcdinamo.com/free/areal),
[Dinamo Licensing Terms](https://abcdinamo.com/licenses), version 2.51, §§9.5, 9.12 and 10.
Web embedding and self-hosting are allowed; redistribution in a public repository is not.
The WOFF2 is therefore ignored by Git and restored privately for the verified Pages artifact.
Do not commit font binaries, the full download bundle, or desktop font formats.

## Local setup

Obtain the licensed ABC Areal download from the owner or Dinamo. Copy the original file
`ABC Areal/WOFF2/ABCArealVariable.woff2` to:

```
assets/fonts/ABCArealVariable-97fb33de45.woff2
```

Run `pnpm run fonts:prepare` to verify it. The expected SHA-256 is
`97fb33de45adbe9b429bd6f766b2c1ec38682a078b4ddb8ce5a08ec794b36f68`.
Do not substitute a newer version without checking typography and updating the verified hash.

## CI and ownership transfer

The repository's seven Actions secrets, `AREAL_WEBFONT_1` through `AREAL_WEBFONT_7`, hold the
original WOFF2 as base64, split in order into at most 35,000 characters per part (leaving
room for the API's encryption and encoding overhead). `scripts/prepare-fonts.mjs` restores and verifies the file before
the quality gate. It never prints the encoded data. These secrets must be transferred or
recreated when moving to a new repository; a Git clone alone does not contain the font.
Fork pull requests cannot read these secrets and require the maintainer to run the gate
on a reviewed branch in this repository.

The browser downloads the font only from this site's own domain. `font-display: swap`
keeps text readable during loading or a failed request. The versioned URL is preloaded
on both the home page and the 404 page. This supplied family has no Cyrillic coverage;
future Russian text will use the fallback family unless a suitable font is added.
