// --- Registrazione Service Worker ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .catch(err => console.error('SW registration failed', err));
  });
}

// --- Gestione install prompt ---
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'inline-flex';
});

installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    console.log('App installata');
  }
  deferredPrompt = null;
  installBtn.style.display = 'none';
});

// --- Storage locale (semplice, estendibile a cifratura/IndexedDB) ---
const STORAGE_KEY = 'mia-app-items';

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function renderItems() {
  const container = document.getElementById('itemsContainer');
  const items = loadItems();
  container.innerHTML = '';

  if (!items.length) {
    container.innerHTML = '<p style="opacity:0.7;font-size:0.85rem;">Nessun elemento salvato.</p>';
    return;
  }

  items.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div>
        <span class="key">${item.key}</span><br>
        <span style="opacity:0.8;font-size:0.8rem;">${item.value}</span>
      </div>
      <button data-index="${index}">Elimina</button>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll('button[data-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      const items = loadItems();
      items.splice(idx, 1);
      saveItems(items);
      renderItems();
    });
  });
}

// --- UI logica ---
const keyInput = document.getElementById('keyInput');
const valueInput = document.getElementById('valueInput');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');

saveBtn.addEventListener('click', () => {
  const key = keyInput.value.trim();
  const value = valueInput.value.trim();
  if (!key || !value) return;

  const items = loadItems();
  items.push({ key, value, createdAt: Date.now() });
  saveItems(items);
  keyInput.value = '';
  valueInput.value = '';
  renderItems();
});

clearBtn.addEventListener('click', () => {
  if (!confirm('Sicuro di voler cancellare tutto?')) return;
  saveItems([]);
  renderItems();
});

// Prima render
renderItems();
