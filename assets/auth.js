function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'item';
}

function buildScanUrl(item, location, category) {
  const suffix = [slugify(category), slugify(item), slugify(location)]
    .filter(Boolean)
    .join('-');
  return `https://minibartracker.space/scan/${suffix}`;
}

function loadSavedQrCodes() {
  try {
    return JSON.parse(localStorage.getItem('supplyhubQrCodes') || '[]');
  } catch (error) {
    return [];
  }
}

function saveQrCode(scanUrl) {
  const items = loadSavedQrCodes();
  const nextItems = [{ url: scanUrl, createdAt: new Date().toISOString() }, ...items].slice(0, 8);
  localStorage.setItem('supplyhubQrCodes', JSON.stringify(nextItems));
  return nextItems;
}

function renderSavedQrCodes(listEl) {
  if (!listEl) return;
  const items = loadSavedQrCodes();
  if (!items.length) {
    listEl.innerHTML = '<div class="saved-qr-item">No saved QR codes yet.</div>';
    return;
  }
  listEl.innerHTML = items
    .map((entry) => {
      const date = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Unknown date';
      return `<div class="saved-qr-item"><div>${entry.url}</div><div class="saved-qr-meta">Generated: ${date}</div><div class="saved-qr-preview"><canvas data-saved-qr="${entry.url}" width="120" height="120"></canvas></div></div>`;
    })
    .join('');

  listEl.querySelectorAll('canvas[data-saved-qr]').forEach((canvasEl) => {
    const value = canvasEl.getAttribute('data-saved-qr');
    if (typeof QRious !== 'undefined') {
      new QRious({
        element: canvasEl,
        value,
        size: 120,
        background: '#ffffff',
        foreground: '#07121f'
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('qrToggle');
  const panel = document.getElementById('qrPanel');
  const form = document.getElementById('qrForm');
  const result = document.getElementById('qrResult');
  const payloadEl = document.getElementById('qrPayload');
  const canvas = document.getElementById('qrCanvas');
  const savedQrList = document.getElementById('savedQrList');
  const savedQrToggle = document.getElementById('savedQrToggle');
  const savedQrPanel = document.getElementById('savedQrPanel');
  const printQrBtn = document.getElementById('printQrBtn');
  const locationQrSelect = document.getElementById('locationQrSelect');
  const locationQrBtn = document.getElementById('generateLocationQrBtn');
  const locationQrResult = document.getElementById('locationQrResult');
  const locationQrUrl = document.getElementById('locationQrUrl');
  const locationQrCanvas = document.getElementById('locationQrCanvas');

  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
    });
  }

  if (savedQrToggle && savedQrPanel) {
    savedQrToggle.addEventListener('click', () => {
      const expanded = savedQrToggle.getAttribute('aria-expanded') === 'true';
      savedQrToggle.setAttribute('aria-expanded', String(!expanded));
      savedQrPanel.hidden = expanded;
    });
  }

  if (!form || !result || !payloadEl || !canvas) return;

  if (locationQrBtn && locationQrSelect && locationQrResult && locationQrUrl && locationQrCanvas) {
    locationQrBtn.addEventListener('click', () => {
      const locationName = locationQrSelect.value.trim();
      const scanUrl = `https://minibartracker.space/scan/location-${slugify(locationName)}`;
      locationQrUrl.textContent = scanUrl;
      locationQrResult.textContent = 'Location QR generated.';
      locationQrResult.style.color = 'var(--success)';
      if (typeof QRious !== 'undefined') {
        new QRious({
          element: locationQrCanvas,
          value: scanUrl,
          size: 220,
          background: '#ffffff',
          foreground: '#07121f'
        });
      }
    });
  }

  if (printQrBtn) {
    printQrBtn.addEventListener('click', () => {
      const url = payloadEl.textContent.trim();
      const printWindow = window.open('', '_blank', 'width=700,height=900');
      if (!printWindow) return;

      printWindow.document.write(`<!doctype html><html><head><title>Print QR</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:24px} .box{display:inline-block;padding:24px;border:1px solid #ccc;border-radius:12px} img{max-width:280px;height:auto} .url{margin-top:12px;font-size:12px;word-break:break-all}</style></head><body><div class="box"><h2>QR Code</h2><img src="${canvas.toDataURL('image/png')}" alt="QR Code" /><div class="url">${url || 'No QR generated yet.'}</div></div><script>window.onload=function(){window.print();window.close();};</script></body></html>`);
      printWindow.document.close();
    });
  }

  renderSavedQrCodes(savedQrList);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const item = document.getElementById('qrItem').value.trim();
    const location = document.getElementById('qrLocation').value.trim();
    const category = document.getElementById('qrCategory').value.trim();
    const scanUrl = buildScanUrl(item, location, category);

    const savedCodes = saveQrCode(scanUrl);
    payloadEl.textContent = scanUrl;
    result.textContent = 'Scan-ready QR generated for minibartracker.space.';
    result.style.color = 'var(--success)';

    if (typeof QRious !== 'undefined') {
      new QRious({
        element: canvas,
        value: scanUrl,
        size: 220,
        background: '#ffffff',
        foreground: '#07121f'
      });
    } else {
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillText('QR library unavailable', 20, 110);
    }

    renderSavedQrCodes(savedQrList);
  });
});
