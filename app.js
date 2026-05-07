const API_URL = "https://script.google.com/macros/s/AKfycbz6rQ7tNegXiXyHTB4LzWXJO_y136g4NTIdf2-u4ctjO2svMLzgqBaUfzcp_mHENn8bQg/exec";

const tipoEl = document.getElementById("tipo");
const dataEl = document.getElementById("data");
const kmEl = document.getElementById("km");
const ricambiEl = document.getElementById("ricambi");
const manodoperaEl = document.getElementById("manodopera");
const titoloEl = document.getElementById("titolo");
const noteEl = document.getElementById("note");

const listaEl = document.getElementById("lista");
const conteggioEl = document.getElementById("conteggio");
const totaleSpesoEl = document.getElementById("totale-speso");
const statoEl = document.getElementById("stato");
const ultimoSalvataggioEl = document.getElementById("ultimo-salvataggio");

let interventi = [];

// -----------------------------
// CARICAMENTO DA GOOGLE DRIVE
// -----------------------------
async function caricaDaDrive() {
  try {
    const res = await fetch(API_URL);
    interventi = await res.json();
    localStorage.setItem("interventi", JSON.stringify(interventi));
    mostraLista();
    aggiornaStato("Dati sincronizzati da Drive");
  } catch (e) {
    aggiornaStato("Offline: uso dati locali");
    interventi = JSON.parse(localStorage.getItem("interventi")) || [];
    mostraLista();
  }
}

// -----------------------------
// SALVATAGGIO SU GOOGLE DRIVE
// -----------------------------
async function salvaSuDrive() {
  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(interventi)
    });
    aggiornaStato("Salvato su Drive");
  } catch (e) {
    aggiornaStato("Offline: salverò più tardi");
  }
}

// -----------------------------
// FUNZIONI APP
// -----------------------------
function salva() {
  const ric = Number(ricambiEl.value || 0);
  const man = Number(manodoperaEl.value || 0);

  const nuovo = {
    id: Date.now(),
    tipo: tipoEl.value || "—",
    data: dataEl.value || "",
    km: kmEl.value || "",
    ricambi: ric,
    manodopera: man,
    totale: ric + man,
    titolo: titoloEl.value || "",
    note: noteEl.value || ""
  };

  interventi.push(nuovo);
  localStorage.setItem("interventi", JSON.stringify(interventi));

  mostraLista();
  salvaSuDrive();

  pulisciCampi();
  ultimoSalvataggioEl.textContent = new Date().toLocaleString();
}

function pulisciCampi() {
  tipoEl.value = "";
  dataEl.value = "";
  kmEl.value = "";
  ricambiEl.value = "";
  manodoperaEl.value = "";
  titoloEl.value = "";
  noteEl.value = "";
}

function nuovo() {
  pulisciCampi();
  aggiornaStato("Nuovo intervento");
}

function svuotaTutto() {
  if (!confirm("Vuoi davvero cancellare tutto?")) return;
  interventi = [];
  localStorage.setItem("interventi", "[]");
  mostraLista();
  salvaSuDrive();
}

function elimina(id) {
  if (!confirm("Eliminare questo intervento?")) return;
  interventi = interventi.filter(i => i.id !== id);
  localStorage.setItem("interventi", JSON.stringify(interventi));
  mostraLista();
  salvaSuDrive();
}

function modifica(id) {
  const i = interventi.find(x => x.id === id);
  if (!i) return;

  tipoEl.value = i.tipo;
  dataEl.value = i.data;
  kmEl.value = i.km;
  ricambiEl.value = i.ricambi;
  manodoperaEl.value = i.manodopera;
  titoloEl.value = i.titolo;
  noteEl.value = i.note;

  interventi = interventi.filter(x => x.id !== id);
  localStorage.setItem("interventi", JSON.stringify(interventi));
  mostraLista();
  salvaSuDrive();

  aggiornaStato("Modifica in corso");
}

function mostraLista() {
  listaEl.innerHTML = "";
  let totale = 0;

  interventi.forEach((i) => {
    totale += i.totale;

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="riga-top">
        <span>${formatData(i.data)} · ${i.km} km</span>
        <span class="tag">${i.tipo}</span>
      </div>
      <div class="riga-mid">
        <strong>${i.titolo}</strong>
      </div>
      <div class="riga-bot">
        <span>Ricambi €${formatEuro(i.ricambi)} · Manodopera €${formatEuro(i.manodopera)} · Totale €${formatEuro(i.totale)}</span>
        <div class="azioni">
          <button onclick="modifica(${i.id})">Modifica</button>
          <button onclick="elimina(${i.id})">Elimina</button>
        </div>
      </div>
      ${i.note ? `<div class="riga-note">${i.note}</div>` : ""}
    `;
    listaEl.appendChild(li);
  });

  conteggioEl.textContent = `${interventi.length} interventi`;
  totaleSpesoEl.textContent = formatEuro(totale);
}

function formatEuro(v) {
  return Number(v || 0).toFixed(2);
}

function formatData(d) {
  if (!d) return "—";
  const [y, m, g] = d.split("-");
  return `${g}/${m}/${y}`;
}

function aggiornaStato(msg) {
  statoEl.textContent = msg;
}

// -----------------------------
// AVVIO
// -----------------------------
caricaDaDrive();
