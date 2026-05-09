// 🔗 URL della tua Web App Apps Script
const WEBAPP_URL = "LA_TUA_WEBAPP_URL"; 
// esempio: "https://script.google.com/macros/s/AKfycbx123456789/exec"


// 👁️ Mostra/Nascondi nei campi del form
function toggleVis(id) {
  const campo = document.getElementById(id);
  campo.type = campo.type === "password" ? "text" : "password";
}


// 👁️ Mostra/Nascondi nello storico
function toggleStorico(id) {
  const el = document.getElementById(id);
  el.classList.toggle("visibile");
}


// 💾 SALVA CREDENZIALE (localStorage + Drive)
async function salva() {
  const cred = {
    username: document.getElementById("username").value,
    password: document.getElementById("password").value,
    pin: document.getElementById("pin").value,
    note: document.getElementById("note").value,
    url: document.getElementById("url").value,
    data: new Date().toLocaleString()
  };

  // 1) salva in locale
  let lista = JSON.parse(localStorage.getItem("credenziali") || "[]");
  lista.push(cred);
  localStorage.setItem("credenziali", JSON.stringify(lista));

  // 2) salva su Drive
  await salvaSuDrive(lista);

  aggiornaUI();
  document.getElementById("status").textContent = "Salvato!";
}


// 📤 POST → Drive
async function salvaSuDrive(lista) {
  try {
    await fetch(WEBAPP_URL, {
      method: "POST",
      body: JSON.stringify(lista),
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("Errore salvataggio Drive:", e);
  }
}


// 📥 LOAD → Drive
async function caricaDaDrive() {
  try {
    const res = await fetch(WEBAPP_URL + "?mode=load");
    const data = await res.json();

    if (Array.isArray(data)) {
      localStorage.setItem("credenziali", JSON.stringify(data));
    }
  } catch (e) {
    console.error("Errore caricamento Drive:", e);
  }
}


// 🔄 Aggiorna interfaccia
function aggiornaUI() {
  const lista = JSON.parse(localStorage.getItem("credenziali") || "[]");
  const ul = document.getElementById("lista");
  ul.innerHTML = "";

  document.getElementById("conteggio").textContent = lista.length + " salvate";

  lista.forEach((c, i) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <div class="riga-top">
        <strong>${c.username}</strong>
        <small>${c.data}</small>
      </div>

      <div class="riga-mid">
        <b>Password:</b> 
        <span id="pw-${i}" class="blur">${c.password}</span>
        <span class="toggle" onclick="toggleStorico('pw-${i}')">👁️</span>
      </div>

      <div class="riga-mid">
        <b>PIN:</b> 
        <span id="pin-${i}" class="blur">${c.pin}</span>
        <span class="toggle" onclick="toggleStorico('pin-${i}')">👁️</span>
      </div>

      <div class="riga-mid">
        <b>URL:</b> ${c.url || "-"}
      </div>

      <div class="riga-note">${c.note}</div>
    `;

    ul.appendChild(li);
  });
}


// 🚀 Avvio app
(async () => {
  await caricaDaDrive(); // carica da Drive all’avvio
  aggiornaUI();          // aggiorna la UI
})();