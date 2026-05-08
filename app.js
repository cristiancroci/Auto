const STORAGE_KEY = "vault-items";
let editingId = null;

const titleInput = document.getElementById("titleInput");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const pinInput = document.getElementById("pinInput");
const notesInput = document.getElementById("notesInput");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const sortSelect = document.getElementById("sortSelect");
const itemsContainer = document.getElementById("itemsContainer");

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function resetForm() {
  editingId = null;
  titleInput.value = "";
  usernameInput.value = "";
  passwordInput.value = "";
  pinInput.value = "";
  notesInput.value = "";
}

/* ORDINAMENTO COMPLETO */
function sortItems(items) {
  const mode = sortSelect.value;

  if (mode === "name-asc") {
    return items.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (mode === "name-desc") {
    return items.sort((a, b) => b.title.localeCompare(a.title));
  }

  if (mode === "recent") {
    return items.sort((a, b) => b.id - a.id);
  }

  if (mode === "oldest") {
    return items.sort((a, b) => a.id - b.id);
  }

  return items;
}

/* RENDER LISTA */
function renderItems() {
  let items = loadItems();
  items = sortItems(items);

  itemsContainer.innerHTML = "";

  if (!items.length) {
    itemsContainer.innerHTML = "<p style='opacity:0.6;font-size:0.8rem;'>Nessuna voce salvata.</p>";
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div class="item-title">${item.title}</div>
      <div style="opacity:0.7;font-size:0.8rem;">
        User: ${item.username || "-"} • PIN: ${item.pin ? "••••" : "-"}
      </div>
      <div class="item-actions">
        <button class="btn-small btn-edit">✏️ Modifica</button>
        <button class="btn-small btn-delete">🗑️ Elimina</button>
      </div>
    `;

    div.querySelector(".btn-edit").onclick = () => startEdit(item.id);
    div.querySelector(".btn-delete").onclick = () => deleteItem(item.id);

    itemsContainer.appendChild(div);
  });
}

/* MODIFICA */
function startEdit(id) {
  const items = loadItems();
  const item = items.find(i => i.id === id);
  if (!item) return;

  editingId = id;

  titleInput.value = item.title;
  usernameInput.value = item.username;
  passwordInput.value = item.password;
  pinInput.value = item.pin;
  notesInput.value = item.notes;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ELIMINA */
function deleteItem(id) {
  if (!confirm("Eliminare questa voce?")) return;
  const items = loadItems().filter(i => i.id !== id);
  saveItems(items);
  renderItems();
}

/* SALVA */
saveBtn.onclick = () => {
  const title = titleInput.value.trim();
  if (!title) {
    alert("Inserisci un titolo");
    return;
  }

  const item = {
    id: editingId || Date.now(),
    title,
    username: usernameInput.value.trim(),
    password: passwordInput.value.trim(),
    pin: pinInput.value.trim(),
    notes: notesInput.value.trim(),
  };

  let items = loadItems();

  if (editingId) {
    items = items.map(i => (i.id === editingId ? item : i));
  } else {
    items.push(item);
  }

  saveItems(items);
  resetForm();
  renderItems();
};

/* ANNULLA */
resetBtn.onclick = resetForm;

/* OCCHI PASSWORD/PIN */
document.querySelectorAll(".eye").forEach(eye => {
  eye.onclick = () => {
    const target = document.getElementById(eye.dataset.target);
    target.type = target.type === "password" ? "text" : "password";
  };
});

/* CAMBIO ORDINAMENTO */
sortSelect.onchange = renderItems;

/* INIZIALIZZA */
renderItems();