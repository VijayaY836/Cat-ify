document.getElementById("reshuffle").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      function roundSize(px, fallback) {
        const val = px && px > 10 ? px : fallback;
        const capped = Math.min(val, 600);
        return Math.max(100, Math.round(capped / 100) * 100);
      }

      document.querySelectorAll("img").forEach((img) => {
        const width = roundSize(img.clientWidth || img.naturalWidth, 300);
        const height = roundSize(img.clientHeight || img.naturalHeight, 300);
        const cacheBuster = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        img.srcset = "";
        img.removeAttribute("data-src");
        img.loading = "eager";
        if (img.fetchPriority !== undefined) img.fetchPriority = "high";
        img.src = `https://cataas.com/cat?width=${width}&height=${height}&_=${cacheBuster}`;
      });
    },
  });
});