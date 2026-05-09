// 🔗 URL della tua Web App Apps Script
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxCVy64NeuTg5z-BkhAc5zCoDqA8AXmCSTqm-l3va8uypY5aSWR6yYhpTUMxQDNa7nW/exec"; 
// esempio: "https://script.google.com/macros/s/AKfycbx123456789/exec"


/* -------------------------------------------------------
   👁️ MOSTRA / NASCONDI (form)
------------------------------------------------------- */
function toggleVis(id) {
  const campo = document.getElementById(id);
  campo.type = campo.type === "password" ? "text" : "password";
}



/* -------------------------------------------------------
   👁️ MOSTRA / NASCONDI (storico)
------------------------------------------------------- */
function toggleStorico(id) {
  const el = document.getElementById(id);
  el.classList.toggle("visibile");
}


/* -------------------------------------------------------
   💾 SALVA (nuovo o modifica)
------------------------------------------------------- */
async function salva() {
  let lista = JSON.parse(localStorage.getItem("credenziali") || "[]");

  const cred = {
    username: document.getElementById("username").value,
    password: document.getElementById("password").value,
    pin: document.getElementById("pin").value,
    note: document.getElementById("note").value,
    url: document.getElementById("url").value,
    data: new Date().toLocaleString()
  };

  // 🔧 Se stiamo modificando una credenziale
  if (window.modIndex !== undefined) {
    lista[window.modIndex] = cred;
    window.modIndex = undefined;
    document.getElementById("status").textContent = "Modificato!";
  } else {
    lista.push(cred);
    document.getElementById("status").textContent = "Salvato!";
  }

  // Salva in locale
  localStorage.setItem("credenziali", JSON.stringify(lista));

  // Salva su Drive
  await salvaSuDrive(lista);

  aggiornaUI();
}


/* -------------------------------------------------------
   📤 SALVA SU DRIVE (POST)
------------------------------------------------------- */
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


/* -------------------------------------------------------
   📥 CARICA DA DRIVE (GET)
------------------------------------------------------- */
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


/* -------------------------------------------------------
   ✏️ MODIFICA CREDENZIALE
------------------------------------------------------- */
function modifica(index) {
  const lista = JSON.parse(localStorage.getItem("credenziali") || "[]");
  const c = lista[index];

  document.getElementById("username").value = c.username;
  document.getElementById("password").value = c.password;
  document.getElementById("pin").value = c.pin;
  document.getElementById("note").value = c.note;
  document.getElementById("url").value = c.url;

  window.modIndex = index;

  document.getElementById("status").textContent = "Modifica in corso…";
}


/* -------------------------------------------------------
   🗑️ ELIMINA CREDENZIALE
------------------------------------------------------- */
async function elimina(index) {
  let lista = JSON.parse(localStorage.getItem("credenziali") || "[]");

  if (!confirm("Vuoi eliminare questa credenziale?")) return;

  lista.splice(index, 1);

  localStorage.setItem("credenziali", JSON.stringify(lista));
  await salvaSuDrive(lista);

  aggiornaUI();
}


/* -------------------------------------------------------
   🔄 AGGIORNA INTERFACCIA
------------------------------------------------------- */
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

      <div class="azioni">
        <button onclick="modifica(${i})">✏️ Modifica</button>
        <button onclick="elimina(${i})">🗑️ Elimina</button>
      </div>
    `;

    ul.appendChild(li);
  });
}


/* -------------------------------------------------------
   🚀 AVVIO APP
------------------------------------------------------- */
(async () => {
  await caricaDaDrive(); // carica da Drive all’avvio
  aggiornaUI();          // aggiorna la UI
})();