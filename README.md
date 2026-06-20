# Godemodegame Verified Badge

Local Chrome/Chromium extension that visually adds a verified badge for `@godemodegame` on X.

It changes only your browser view. It does not verify the X account on X servers.

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Choose this folder: `/Users/godemodegame/Documents/verified-kris-extenstion`.

The extension runs on `x.com` and `twitter.com`. Hover or click the injected checkmark to see the “Verified account” panel with “Verified since November 2025.” On `/godemodegame/about`, the injected row opens X’s blue-check help page.

## Publish package

Run:

```sh
./scripts/build-release.sh
```

Upload `release/godemodegame-verified-badge-1.0.0.zip` in the Chrome Web Store Developer Dashboard.

Store listing copy is in `STORE_LISTING.md`. The privacy policy draft is in `PRIVACY_POLICY.md`. Generated listing images are in `store-assets/`.
