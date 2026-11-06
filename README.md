# Kad Hari Lahir Mak — Islamic Floral Elegance

A digital birthday card for Mak (6 November 2026). Built with HTML5, CSS3 and vanilla JavaScript only, with no frameworks or build step.

```
index.html   – structure, content, inline SVG artwork (flowers, lanterns, Islamic ornaments)
style.css    – design tokens, layout, animations, responsive and reduced-motion rules
script.js    – envelope opening, effects canvas, gallery lightbox, music, sharing, replay
assets/
  birthday-music.mp3   ← add your own (see below)
  images/photo-01.jpg … photo-08.jpg
```

## Run locally

Opening `index.html` directly works. A local server matches production more closely:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Music

There is **no music file in the repo yet**. Put any MP3 at `assets/birthday-music.mp3` and the music button appears on its own. Music never autoplays. It starts only when someone taps the button. While the file is missing, the button stays hidden so nothing looks broken.

## Photos

To change a photo, replace `assets/images/photo-0X.jpg` and keep the same filename. If a photo is missing, the card shows a numbered placeholder instead of a broken image. To change how a photo is cropped in its frame, edit the `--pos` value on its `<img>` (for example `--pos: 50% 40%`). Captions are in the `data-caption` and `aria-label` attributes on each `.photo` button.

## Deploy (e.g. GitHub Pages)

1. Settings → Pages → Deploy from branch → choose the branch, `/ (root)`.
2. After it is live, change `og:image` in `index.html` to the full URL, e.g. `https://<user>.github.io/<repo>/assets/images/photo-08.jpg`. WhatsApp only shows the photo preview when this is a full URL.

**Privacy:** a public repo or Pages site makes these family photos public. The page has `noindex` so search engines skip it, but anyone with the link can still open it.
