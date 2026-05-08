const STORAGE_KEY = "vault-items";
let editingId = null;
let sortAsc = true;

const titleInput = document.getElementById("titleInput");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const pinInput = document.getElementById("pinInput");
const notesInput = document.getElementById("notesInput");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const sortBtn = document.getElementById("sortBtn");
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

function renderItems() {
  const items = loadItems();
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

function deleteItem(id) {
  if (!confirm("Eliminare questa voce?")) return;
  const items = loadItems().filter(i => i.id !== id);
  saveItems(items);
  renderItems();
}

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

resetBtn.onclick = resetForm;

/* ORDINAMENTO */
sortBtn.onclick = () => {
  const items = loadItems();

  items.sort((a, b) => {
    if (a.title.toLowerCase() < b.title.toLowerCase()) return sortAsc ? -1 : 1;
    if (a.title.toLowerCase() > b.title.toLowerCase()) return sortAsc ? 1 : -1;
    return 0;
  });

  sortAsc = !sortAsc;
  saveItems(items);
  renderItems();
};

/* OCCHI PASSWORD/PIN */
document.querySelectorAll(".eye").forEach(eye => {
  eye.onclick = () => {
    const target = document.getElementById(eye.dataset.target);
    target.type = target.type === "password" ? "text" : "password";
  };
});

renderItems();