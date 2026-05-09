const scriptURL = "https://script.google.com/macros/s/AKfycbzvoxf5nhX8mdnnTGuREGKWIjBNvtmB4EZZ5jAlng11GgfR3yt2YtF1ZS1JvIJ42q0O/exec";

let lista = [];

/* MOSTRA o NASCONDE password e pin */
function toggleVis(id) {
  const campo = document.getElementById(id);
  campo.type = campo.type === "password" ? "text" : "password";
}

/* MOSTRA/NASCONDE NELLO STORICO */
function toggleStorico(id) {
  const el = document.getElementById(id);
  el.classList.toggle("visibile");
}

/* SANIFICA TESTO PER EVITARE ERRORI JSON */
function sanitize(txt) {
  if (!txt) return "";
  return txt
    .replace(/[\u0000-\u001F\u007F]/g, "") // caratteri invisibili
    .replace(/\uFFFD/g, "")               // caratteri invalidi
    .trim();
}

/* SALVA SU DRIVE */
async function salva() {
  const cred = {
    username: sanitize(document.getElementById("username").value),
    password: sanitize(document.getElementById("password").value),
    pin: sanitize(document.getElementById("pin").value),
    note: sanitize(document.getElementById("note").value),
    url: sanitize(document.getElementById("url").value),
    data: new Date().toLocaleString()
  };

  lista.push(cred);
  localStorage.setItem("credenziali", JSON.stringify(lista));

  try {
    const res = await fetch(scriptURL, {
      method: "POST",
      body: JSON.stringify(lista),
      headers: { "Content-Type": "application/json" }
    });

    const out = await res.json();

    if (out.ok) {
      document.getElementById("status").textContent = "✅ Salvato su Drive";
    } else {
      document.getElementById("status").textContent = "❌ Errore: " + out.error;
    }
  } catch (e) {
    document.getElementById("status").textContent = "❌ Errore salvataggio: " + e;
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

/* AVVIO APP */
(async () => {
  await caricaDaDrive();
})();