const SCRIPT_URL = "YOUR_SCRIPT_URL"; // es: https://script.google.com/macros/s/XXX/exec

let entries = [];

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

function load() {
  fetch(SCRIPT_URL + "?action=load")
    .then(r => r.text())
    .then(t => {
      try {
        entries = JSON.parse(t || "[]");
      } catch (e) {
        entries = [];
      }
      render();
    })
    .catch(err => {
      console.error("Errore load:", err);
    });
}

function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  entries.forEach((e, i) => {
    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `
      <b>${escapeHtml(e.title)}</b><br>
      User: ${escapeHtml(e.username)}<br>
      Pass: ${escapeHtml(e.password)}<br>
      PIN: ${escapeHtml(e.pin)}<br>
      URL: ${escapeHtml(e.url)}<br>
      Note: ${escapeHtml(e.note)}<br>
      <button onclick="removeEntry(${i})">Elimina</button>
    `;
    list.appendChild(div);
  });
}

function addEntry() {
  const title = document.getElementById("title").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const pin = document.getElementById("pin").value.trim();
  const url = document.getElementById("url").value.trim();
  const note = document.getElementById("note").value.trim();

  if (!title && !username && !password) return;

  entries.push({ title, username, password, pin, url, note });

  document.getElementById("title").value = "";
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("pin").value = "";
  document.getElementById("url").value = "";
  document.getElementById("note").value = "";

  render();
}

function removeEntry(i) {
  entries.splice(i, 1);
  render();
}

function save() {
  const data = encodeURIComponent(JSON.stringify(entries));

  fetch(SCRIPT_URL + "?action=save&data=" + data)
    .then(r => r.text())
    .then(t => {
      try {
        const res = JSON.parse(t);
        if (res.ok) {
          alert("Salvato su Drive");
        } else {
          alert("Errore salvataggio");
        }
      } catch (e) {
        alert("Salvato (risposta non standard)");
      }
    })
    .catch(err => {
      console.error("Errore save:", err);
      alert("Errore di rete");
    });
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

load();