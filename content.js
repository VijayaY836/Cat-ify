// content.js — runs as early as possible (see "run_at": "document_start" in manifest.json)
// so images get replaced while the page is still parsing, not after it finishes loading.

(function () {
  const CAT_API = "https://cataas.com/cat";

  // Open the connection to cataas.com immediately, before any image request happens.
  function addPreconnectHint() {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = "https://cataas.com";
    (document.head || document.documentElement).appendChild(link);
  }

  // Round to the nearest 100px so similarly-sized images can reuse cached
  // requests, and cap the max size — no point fetching a huge photo for a
  // small thumbnail slot.
  function roundSize(px, fallback) {
    const val = px && px > 10 ? px : fallback;
    const capped = Math.min(val, 600);
    return Math.max(100, Math.round(capped / 100) * 100);
  }

  function randomCatUrl(img) {
    const width = roundSize(img.clientWidth || img.naturalWidth, 300);
    const height = roundSize(img.clientHeight || img.naturalHeight, 300);
    const cacheBuster = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${CAT_API}?width=${width}&height=${height}&_=${cacheBuster}`;
  }

  function catify(img) {
    if (!img) return;
    img.dataset.catified = "true";
    img.srcset = "";
    img.removeAttribute("data-src"); // stop common lazy-load libraries from swapping it back later
    img.loading = "eager"; // load right away instead of waiting until it's in view
    img.decoding = "async"; // don't block rendering while the image decodes
    if (img.fetchPriority !== undefined) img.fetchPriority = "high";
    img.src = randomCatUrl(img);
  }

  function replaceAllImages(root = document) {
    root.querySelectorAll("img").forEach((img) => {
      if (img.dataset.catified !== "true") catify(img);
    });
  }

  addPreconnectHint();
  replaceAllImages();

  // Watch for two things:
  //  1. New <img> elements being added as the page keeps parsing/rendering
  //  2. Existing cat images getting overwritten by the page's own scripts
  //     (very common with lazy-loading libraries that swap src after load)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target.tagName === "IMG") {
        const img = mutation.target;
        if (!img.src.startsWith(CAT_API)) {
          catify(img); // something reset it — put a cat back
        }
        continue;
      }
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node.tagName === "IMG") {
          if (node.dataset.catified !== "true") catify(node);
        } else if (node.querySelectorAll) {
          replaceAllImages(node);
        }
      });
    }
  });

  const startObserving = () => {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });
  };

  if (document.documentElement) {
    startObserving();
  } else {
    document.addEventListener("DOMContentLoaded", startObserving);
  }
})();