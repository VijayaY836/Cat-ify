# 🐱 Cat-ify

A Chrome extension (Manifest V3) that replaces every image on a webpage with a random cat photo, fetched live from the free [cataas.com](https://cataas.com) ("Cat as a Service") API.

Browse the web. See cats instead. That's it, that's the extension.

---

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Installation (Developer Mode)](#installation-developer-mode)
- [Usage](#usage)
- [The API](#the-api)
- [Permissions](#permissions)
- [Known Limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [Possible Improvements](#possible-improvements)

---

## Features

- 🖼️ **Automatic replacement** — every `<img>` on a page is swapped for a real cat photo as soon as the page starts loading, no button press required.
- ⚡ **Fast by design** — images are requested at roughly their real display size (not full resolution), the connection to the API is warmed up early via a `preconnect` hint, and replacement happens at `document_start` so cats appear as the page parses rather than after everything finishes loading.
- 🔁 **Handles dynamic content** — a `MutationObserver` watches the page for new images added after the fact (infinite scroll, single-page apps, carousels, etc.) and cat-ifies those too.
- 🛡️ **Resistant to lazy-load libraries** — many sites swap `img.src` themselves after their own placeholder logic runs. Cat-ify detects and overrides this so your cats don't get silently reverted back to the original image.
- 🎲 **Manual re-shuffle** — click the toolbar icon for a "Re-shuffle Cats" button that swaps in a fresh batch of random cats without reloading the page.

## Demo

📺 https://drive.google.com/file/d/1vtgTs1YbBHoITnkstfzgmVlE7_3EV5oV/view?pli=1

The demo shows:
1. Enabling Developer Mode and loading the extension unpacked
2. Visiting a normal webpage and watching images turn into cats as it loads
3. Using the popup's "Re-shuffle Cats" button for a fresh set

## How It Works

Cat-ify has two moving parts:

1. **`content.js`** (a content script) is injected into every page automatically, at `document_start` — before the browser has even finished parsing the page's HTML. It:
   - Adds a `<link rel="preconnect">` hint so the browser opens a connection to `cataas.com` immediately.
   - Finds every `<img>` element and rewrites its `src` to a cataas.com URL, sized close to the image's actual rendered dimensions (rounded to the nearest 100px, capped at 600px) so we're not downloading huge photos for tiny thumbnail slots.
   - Sets `loading="eager"`, `decoding="async"`, and `fetchPriority="high"` on each image so the browser prioritizes loading it right away instead of deferring it.
   - Starts a `MutationObserver` that watches the whole page for:
     - New `<img>` elements being added (e.g. lazy-loaded galleries, infinite scroll)
     - Existing images having their `src` attribute changed by the page's own scripts (common with lazy-load libraries) — if that happens, Cat-ify puts a cat back.

2. **`popup.html` / `popup.js`** power the toolbar popup. Clicking "Re-shuffle Cats" uses `chrome.scripting.executeScript` to inject a one-off function into the current tab that re-randomizes every image's `src`, without needing to reload the page.

Because cataas.com's `/cat` endpoint returns actual image bytes directly (rather than JSON metadata), there's no `fetch()` + parse step needed — an `<img>` tag's `src` can point straight at the API URL and the browser handles the rest.

## Project Structure

```
cat-ify/
├── manifest.json       # Manifest V3 config — permissions, content script, popup
├── content.js           # Auto-replaces images on every page (runs at document_start)
├── popup.html            # Toolbar popup UI
├── popup.js              # Popup logic — manual "re-shuffle" button
├── icons/
│   ├── icon16.png        # Toolbar icon (16x16)
│   ├── icon48.png        # Extensions page icon (48x48)
│   └── icon128.png        # Chrome Web Store / install icon (128x128)
└── README.md             # You are here
```

## Installation (Developer Mode)

Chrome extensions loaded outside the Chrome Web Store must be installed in **Developer Mode**:

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Toggle **Developer mode** on (top-right corner of the page).
4. Click **Load unpacked**.
5. Select the `cat-ify` folder (the top-level folder containing `manifest.json` — not the `icons` subfolder).
6. The extension should now appear in your extensions list with a little cat-face icon.

> **Note:** Keep the folder where it is after loading — Chrome reads the extension live from that location on disk. If you move or delete the folder, the extension will break and you'll need to "Load unpacked" again from its new location.

## Usage

- Just browse normally. Any page you visit will have its images automatically replaced with random cats as it loads.
- Click the Cat-ify icon in your toolbar (pin it via the puzzle-piece icon if it's hidden) and click **Re-shuffle Cats** to get a new random batch on the current tab without reloading.

## The API

Cat-ify uses [**cataas.com**](https://cataas.com) ("Cat as a Service"), a free, public REST API with no key required for light use.

- Base endpoint: `https://cataas.com/cat`
- Hitting this URL directly returns a random cat *image* (not JSON) — the response is the image file itself.
- Supported query parameters used in this project:
  - `width` / `height` — resize the returned image server-side (used to avoid over-fetching large images for small thumbnail slots)
- A unique cache-busting query parameter (timestamp + random string) is appended to each request so the browser doesn't reuse the same cat for every image.

You can verify it's a live API yourself by pasting `https://cataas.com/cat` into your address bar and refreshing — you'll get a different real cat photo each time.

## Permissions

Declared in `manifest.json`:

| Permission | Why it's needed |
|---|---|
| `scripting` | Lets the popup inject the "re-shuffle" function into the active tab on click. |
| `activeTab` | Grants temporary access to the current tab only when the user interacts with the extension (popup click), rather than requesting broad host access. |
| Content script `matches: ["<all_urls>"]` | Allows the image-replacement script to run automatically on any page the user visits. |

No data is collected, stored, or sent anywhere other than the standard image requests to cataas.com.

## Known Limitations

- **cataas.com uptime**: this is a free public API with no uptime guarantee. If it's slow or briefly down, image replacement will be slow or fail. There's no fallback image source built in.
- **Duplicate cats**: rounding image sizes to the nearest 100px means two similarly-sized images may request the exact same URL, and the browser may serve the same cached cat photo for both. This is a deliberate speed/variety trade-off.
- **Some sites resist replacement**: pages with very aggressive custom image-loading frameworks (e.g. canvas-rendered images, CSS `background-image` instead of `<img>` tags) won't be affected, since Cat-ify only targets `<img>` elements.
- **Strict site CSPs**: a small number of sites set a `Content-Security-Policy` that blocks images from third-party domains. On those sites, the browser will refuse to load the cataas.com image regardless of what the extension does.

## Troubleshooting

**Images aren't changing at all**
- Make sure Developer Mode is on and the extension shows as enabled on `chrome://extensions`.
- Refresh the page — the content script only runs on page load, so tabs open before you installed/reloaded the extension won't have it.
- Open DevTools → Console and check for CSP-related errors, which indicate the site itself is blocking third-party images.

**I changed the code but nothing's different**
- Go to `chrome://extensions` and click the reload icon (⟳) on the Cat-ify card, then refresh the page you're testing on.

**Images flash and then disappear**
- This usually means a lazy-load library on the page is overwriting the image `src` after Cat-ify sets it. The `MutationObserver` in `content.js` is designed to catch and reverse this — if you still see it, please open an issue with the URL of the site.

## Possible Improvements

- Add a fallback API (e.g. TheCatAPI) in case cataas.com is unavailable.
- Add an on/off toggle in the popup so users can disable replacement per-site.
- Support replacing CSS `background-image` properties, not just `<img>` tags.
- Cache a small pool of cat URLs locally to reduce duplicate network requests on image-heavy pages.
