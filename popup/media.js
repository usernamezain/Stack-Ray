// media.js - Scrapes and displays all image and SVG vector assets for interactive downloads

async function runMediaScraper() {
  const container = document.getElementById("media-results");
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Scraping page media assets...</div>';

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !tab.id) {
    container.innerHTML = '<div class="error">No active tab context found.</div>';
    return;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const assets = [];
        
        // 1. Gather img tag sources
        const imgs = Array.from(document.querySelectorAll("img"));
        imgs.forEach((img) => {
          if (img.src && (img.src.startsWith("http") || img.src.startsWith("data:"))) {
            let filename = "image.png";
            try {
              if (img.src.startsWith("http")) {
                filename = img.src.substring(img.src.lastIndexOf("/") + 1).split("?")[0] || "image.png";
              } else {
                const mime = img.src.split(";")[0].split(":")[1] || "image/png";
                const ext = mime.split("/")[1] || "png";
                filename = `base64-data.${ext}`;
              }
            } catch (e) {}

            assets.push({
              src: img.src,
              name: filename,
              width: img.naturalWidth || img.clientWidth || 0,
              height: img.naturalHeight || img.clientHeight || 0,
              type: "Image"
            });
          }
        });

        // 2. Gather background-images from DOM nodes styles
        const allElements = Array.from(document.querySelectorAll("*"));
        allElements.forEach((el) => {
          const style = window.getComputedStyle(el);
          const bg = style.backgroundImage;
          if (bg && bg !== "none" && bg.includes("url(")) {
            let cleanUrl = "";
            try {
              // Extract url from url("...") or url(...)
              const matches = bg.match(/url\((['"]?)(.*?)\1\)/);
              if (matches && matches[2]) {
                cleanUrl = matches[2];
                // Make absolute if relative
                if (cleanUrl.startsWith("//")) {
                  cleanUrl = window.location.protocol + cleanUrl;
                } else if (cleanUrl.startsWith("/")) {
                  cleanUrl = window.location.origin + cleanUrl;
                } else if (!cleanUrl.startsWith("http") && !cleanUrl.startsWith("data:")) {
                  cleanUrl = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1) + cleanUrl;
                }
              }
            } catch (e) {}

            if (cleanUrl && (cleanUrl.startsWith("http") || cleanUrl.startsWith("data:"))) {
              let filename = "bg.png";
              if (cleanUrl.startsWith("http")) {
                filename = cleanUrl.substring(cleanUrl.lastIndexOf("/") + 1).split("?")[0] || "bg.png";
              }
              assets.push({
                src: cleanUrl,
                name: filename,
                width: el.clientWidth || 0,
                height: el.clientHeight || 0,
                type: "CSS BG"
              });
            }
          }
        });

        // 3. Gather inline SVG structures
        const svgs = Array.from(document.querySelectorAll("svg"));
        svgs.forEach((svg, idx) => {
          try {
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svg);
            const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
            assets.push({
              src: src,
              name: `vector-icon-${idx + 1}.svg`,
              width: svg.clientWidth || svg.viewBox?.baseVal?.width || 24,
              height: svg.clientHeight || svg.viewBox?.baseVal?.height || 24,
              type: "SVG Code",
              isSvgCode: true
            });
          } catch (e) {}
        });

        // De-duplicate items based on source URL
        const unique = [];
        const seen = new Set();
        assets.forEach(a => {
          if (a.src && !seen.has(a.src)) {
            seen.add(a.src);
            unique.push(a);
          }
        });

        return unique.slice(0, 100); // Limit to top 100 images for popup DOM memory safety
      }
    });

    const mediaList = results && results[0] ? results[0].result : [];
    if (mediaList.length === 0) {
      container.innerHTML = '<div class="info-line" style="font-size:11px;color:#737373;padding:8px;">No image or vector assets found on this page.</div>';
      return;
    }

    // Render visual gallery
    let html = `<div class="media-gallery">`;
    mediaList.forEach((media, idx) => {
      const ext = media.isSvgCode ? "SVG" : media.name.split(".").pop().toUpperCase().slice(0, 4) || "IMG";
      
      html += `
        <div class="media-asset-card" data-src="${encodeURIComponent(media.src)}" data-name="${media.name}">
          <input type="checkbox" class="media-asset-select" checked data-idx="${idx}" />
          <div class="media-preview-container">
            <img class="media-preview-img" src="${media.src}" alt="${media.name}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 width=%2224%22 height=%2224%22 fill=%22%23cccccc%22><rect width=%2224%22 height=%2224%22 fill=%22%23f3f4f6%22/><text x=%2250%%22 y=%2250%%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%228%22 fill=%22%23888888%22>${ext}</text></svg>'" />
          </div>
          <div class="media-asset-details">
            <div class="media-asset-name" title="${media.name}">${media.name}</div>
            <div class="media-asset-meta">
              <span>${media.width} × ${media.height} px</span>
              <span class="security-badge secure" style="padding:1px 4px; font-size:8px;">${ext}</span>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;

    window.scrapedMediaAssets = mediaList;

  } catch (err) {
    container.innerHTML = `<div class="error">Failed to scrape media assets: ${err.message}</div>`;
  }
}

// Bulk downloading function
async function downloadScrapedMedia(all = false) {
  const mediaList = window.scrapedMediaAssets;
  if (!mediaList || mediaList.length === 0) return;

  const cards = Array.from(document.querySelectorAll(".media-asset-card"));
  
  for (const card of cards) {
    const select = card.querySelector(".media-asset-select");
    const isChecked = select ? select.checked : false;
    
    if (all || isChecked) {
      const rawSrc = decodeURIComponent(card.getAttribute("data-src"));
      const name = card.getAttribute("data-name");

      try {
        if (rawSrc.startsWith("data:")) {
          const link = document.createElement("a");
          link.href = rawSrc;
          link.download = name;
          link.click();
        } else {
          // Fetch as blob to bypass extension file security and get correct filenames
          const res = await fetch(rawSrc);
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = name;
          link.click();
          URL.revokeObjectURL(blobUrl);
        }
      } catch (err) {
        console.error("Failed to download image asset:", rawSrc, err);
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnDownloadAll = document.getElementById("btn-media-download-all");
  if (btnDownloadAll) {
    btnDownloadAll.addEventListener("click", () => {
      downloadScrapedMedia(false);
    });
  }
});
