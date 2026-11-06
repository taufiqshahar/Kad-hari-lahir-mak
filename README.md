# Kad Hari Lahir Mak — Islamic Floral Elegance

A digital birthday card for Mak from Taufiq (6 November 2026). Built with HTML5, CSS3 and vanilla JavaScript only, with no frameworks or build step.

```
index.html   – structure, content, inline SVG Islamic ornaments (stars, crescent, lanterns)
style.css    – design tokens, layout, animations, responsive and reduced-motion rules
script.js    – envelope opening, effects canvas, gallery lightbox, music, sharing, replay
assets/
  birthday-music.mp3   instrumental Happy Birthday (see Music below)
  images/photo-01.jpg … photo-08.jpg   family photos (originals, unchanged)
  images/thumbs/photo-0X.webp          lightweight gallery thumbnails
  flowers/             real flower photos (corner, garland, bouquet, falling petals) + CREDITS.md
```

## Run locally

Opening `index.html` directly works. A local server matches production more closely:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Music

`assets/birthday-music.mp3` is an instrumental arrangement of *Happy Birthday* (the melody is in the public domain) for harp, celesta, piano, strings and music box. It was rendered with the FluidR3_GM soundfont (MIT licence) and loops on the card. Music never plays when the page loads. It starts (with a gentle fade-in) when Mak taps **Buka Kad Istimewa** or the music button, and the music button can pause it at any time. To use a different song, replace the file and keep the same name. If the file is missing, the button stays hidden so nothing looks broken.

## Photos

To change a photo, replace `assets/images/photo-0X.jpg` (shown full size when tapped) and regenerate its gallery thumbnail `assets/images/thumbs/photo-0X.webp` (shorter side 600px, WebP). The gallery shows the thumbnails so that scrolling stays smooth on phones. If a photo is missing, the card shows a numbered placeholder instead of a broken image. To change how a photo is cropped in its frame, edit the `--pos` value on its `<img>` (for example `--pos: 50% 40%`).

## Flowers

The flowers are real photographs from Wikimedia Commons. Their backgrounds were removed, the colours were softened to the card's dusty-rose palette, and they were arranged into `assets/flowers/*.webp`. Those photos are licensed CC BY-SA, so the credits in `assets/flowers/CREDITS.md`, and the small "Kredit foto bunga" link at the bottom of the card, must stay.

## Deploy (e.g. GitHub Pages)

1. Settings → Pages → Deploy from branch → choose the branch, `/ (root)`.
2. The link-preview tags (`og:url`, `og:image`) already point at `https://taufiqshahar.github.io/Kad-hari-lahir-mak/`. If the card is hosted at a different address, update both tags. WhatsApp only shows the preview photo when the URL is a full URL.

**Privacy:** a public repo or Pages site makes these family photos public. The page has `noindex` so search engines skip it, but anyone with the link can still open it.
