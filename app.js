const scriptURL = "LA_TUA_WEBAPP_URL"; 
// esempio: "https://script.google.com/macros/s/AKfycbx123456789/exec"

let lista = [];

/* MOSTRA o NASCONDE password e pin */
function toggleVis(id) {
  const campo = document.getElementById(id);
  campo.type = campo.type === "password" ? "text" : "password";
}

/* SALVA SU DRIVE */
async function salva() {
  const cred = {
    username: document.getElementById("username").value,
    password: document.getElementById("password").value,
    pin: document.getElementById("pin").value,
    note: document.getElementById("note").value,
    url: document.getElementById("url").value,
    data: new Date().toLocaleString()
  };

  lista.push(cred);
  localStorage.setItem("credenziali", JSON.stringify(lista));

  try {
    await fetch(scriptURL, {
      method: "POST",
      body: JSON.stringify(lista),
      headers: { "Content-Type": "application/json" }
    });
    document.getElementById("status").textContent = "✅ Salvato su Drive";
  } catch (e) {
    document.getElementById("status").textContent = "❌ Errore salvataggio";
  }

  aggiornaUI();
}

/* CARICA DA DRIVE */
async function caricaDaDrive() {
  try {
    const res = await fetch(scriptURL + "?mode=load");
    const data = await res.json();
    if (Array.isArray(data)) {
      lista = data;
      localStorage.setItem("credenziali", JSON.stringify(lista));
      document.getElementById("status").textContent = "📂 Caricato da Drive";
    }
  } catch (e) {
    document.getElementById("status").textContent = "⚠️ Errore caricamento";
  }

  aggiornaUI();
}

/* AGGIORNA INTERFACCIA */
function aggiornaUI() {
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

/* MOSTRA/NASCONDE NELLO STORICO */
function toggleStorico(id) {
  const el = document.getElementById(id);
  el.classList.toggle("visibile");
}

/* AVVIO APP */
(async () => {
  await caricaDaDrive();
})();