const URL = "YOUR_SCRIPT_URL";

let entries = [];

function load() {
  fetch(URL + "?action=load")
    .then(r => r.json())
    .then(data => {
      entries = data;
      render();
    });
}

function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  entries.forEach((e, i) => {
    list.innerHTML += `
      <div class="entry">
        <b>${e.title}</b><br>
        User: ${e.username}<br>
        Pass: ${e.password}<br>
        PIN: ${e.pin}<br>
        URL: ${e.url}<br>
        Note: ${e.note}<br>
        <button onclick="removeEntry(${i})">Elimina</button>
      </div>
    `;
  });
}

function addEntry() {
  entries.push({
    title: document.getElementById("title").value,
    username: document.getElementById("username").value,
    password: document.getElementById("password").value,
    pin: document.getElementById("pin").value,
    url: document.getElementById("url").value,
    note: document.getElementById("note").value
  });

  render();
}

function removeEntry(i) {
  entries.splice(i, 1);
  render();
}

function save() {
  const data = encodeURIComponent(JSON.stringify(entries));

  fetch(URL + "?action=save&data=" + data)
    .then(r => r.json())
    .then(res => {
      alert("Salvato su Drive");
    });
}

load();