const STORAGE_KEY = 'vault-items';

let editingId = null;
let currentTab = 'all';

const typeSelect = document.getElementById('typeSelect');
const titleInput = document.getElementById('titleInput');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const pinInput = document.getElementById('pinInput');
const notesInput = document.getElementById('notesInput');
const loginFields = document.getElementById('loginFields');
const formTitle = document.getElementById('formTitle');

const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const itemsContainer = document.getElementById('itemsContainer');
const tabs = document.querySelectorAll('.tab');

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

function resetForm() {
  editingId = null;
  formTitle.textContent = 'Nuova voce';
  typeSelect.value = 'login';
  titleInput.value = '';
  usernameInput.value = '';
  passwordInput.value = '';
  pinInput.value = '';
  notesInput.value = '';
  loginFields.style.display = 'block';
}

function renderItems() {
  const items = loadItems();
  itemsContainer.innerHTML = '';

  const filtered = items.filter(item => {
    if (currentTab === 'all') return true;
    return item.type === currentTab;
  });

  if (!filtered.length) {
    itemsContainer.innerHTML = '<div class="list-empty">Nessuna voce salvata.</div>';
    return;
  }

  filtered.forEach(item => {
    const div = document.createElement('div');
    div.className = 'item';

    const title = document.createElement('div');
    title.className = 'item-header';

    const left = document.createElement('div');
    left.innerHTML = `
      <div class="item-title">${item.title || '(Senza titolo)'}</div>
      <div class="item-meta">
        ${item.type === 'login' ? 'Login' : 'Nota'} • ${new Date(item.createdAt).toLocaleString()}
      </div>
    `;

    const right = document.createElement('div');
    right.textContent = item.type === 'login' ? '••••' : 'Nota';

    title.appendChild(left);
    title.appendChild(right);

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    if (item.type === 'login') {
      meta.textContent = `User: ${item.username || '-'} | PIN: ${item.pin ? '••••' : '-'}`;
    } else {
      meta.textContent = item.notes ? item.notes.slice(0, 60) + (item.notes.length > 60 ? '…' : '') : 'Nessuna nota';
    }

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-small btn-edit';
    editBtn.textContent = 'Modifica';
    editBtn.addEventListener('click', () => startEdit(item.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-small btn-delete';
    deleteBtn.textContent = 'Elimina';
    deleteBtn.addEventListener('click', () => deleteItem(item.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    div.appendChild(title);
    div.appendChild(meta);
    div.appendChild(actions);

    itemsContainer.appendChild(div);
  });
}

function startEdit(id) {
  const items = loadItems();
  const item = items.find(i => i.id === id);
  if (!item) return;

  editingId = id;
  formTitle.textContent = 'Modifica voce';

  typeSelect.value = item.type;
  titleInput.value = item.title || '';
  usernameInput.value = item.username || '';
  passwordInput.value = item.password || '';
  pinInput.value = item.pin || '';
  notesInput.value = item.notes || '';

  loginFields.style.display = item.type === 'login' ? 'block' : 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteItem(id) {
  if (!confirm('Eliminare questa voce?')) return;
  const items = loadItems().filter(i => i.id !== id);
  saveItems(items);
  if (editingId === id) resetForm();
  renderItems();
}

saveBtn.addEventListener('click', () => {
  const type = typeSelect.value;
  const title = titleInput.value.trim();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const pin = pinInput.value.trim();
  const notes = notesInput.value.trim();

  if (!title) {
    alert('Inserisci almeno un titolo.');
    return;
  }

  const items = loadItems();

  if (editingId) {
    const idx = items.findIndex(i => i.id === editingId);
    if (idx !== -1) {
      items[idx] = {
        ...items[idx],
        type,
        title,
        username: type === 'login' ? username : '',
        password: type === 'login' ? password : '',
        pin: type === 'login' ? pin : '',
        notes,
        updatedAt: Date.now()
      };
    }
  } else {
    items.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      type,
      title,
      username: type === 'login' ? username : '',
      password: type === 'login' ? password : '',
      pin: type === 'login' ? pin : '',
      notes,
      createdAt: Date.now()
    });
  }

  saveItems(items);
  resetForm();
  renderItems();
});

resetBtn.addEventListener('click', () => {
  resetForm();
});

typeSelect.addEventListener('change', () => {
  loginFields.style.display = typeSelect.value === 'login' ? 'block' : 'none';
});

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    renderItems();
  });
});

// init
resetForm();
renderItems();
