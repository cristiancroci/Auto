function toggleVis(id) {
  const campo = document.getElementById(id);
  campo.type = campo.type === "password" ? "text" : "password";
}

function toggleStorico(id) {
  const el = document.getElementById(id);
  el.classList.toggle("visibile");
}

function salva() {
  const cred = {
    username: document.getElementById("username").value,
    password: document.getElementById("password").value,
    pin: document.getElementById("pin").value,
    note: document.getElementById("note").value,
    url: document.getElementById("url").value,
    data: new Date().toLocaleString()
  };

  let lista = JSON.parse(localStorage.getItem("credenziali") || "[]");
  lista.push(cred);
  localStorage.setItem("credenziali", JSON.stringify(lista));

  aggiornaUI();
  document.getElementById("status").textContent = "Salvato!";
}

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

aggiornaUI();