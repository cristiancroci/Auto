function aggiungi() {
    const tipo = document.getElementById("tipo").value;
    const data = document.getElementById("data").value;
    const km = document.getElementById("km").value;
    const note = document.getElementById("note").value;

    if (!tipo || !data || !km) {
        alert("Compila tutti i campi obbligatori");
        return;
    }

    const li = document.createElement("li");
    li.textContent = `${data} - ${tipo} - ${km} km - ${note}`;
    document.getElementById("lista").appendChild(li);

    salva();
}

function salva() {
    const lista = document.getElementById("lista").innerHTML;
    localStorage.setItem("manutenzioni", lista);
}

window.onload = () => {
    const salvato = localStorage.getItem("manutenzioni");
    if (salvato) {
        document.getElementById("lista").innerHTML = salvato;
    }
};
