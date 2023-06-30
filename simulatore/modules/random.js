function getCaloreDisperso() {
    const min = 0.10;
    const max = 0.15;
    const perdita = Math.random() * (max - min) + min;
    //console.log("Perdita", perdita.toFixed(2));
    return perdita
}

function getValoreSensore(valore) {
    const perc = Math.random() * 0.1;
    const segno = Math.random() < 0.5 ? -1 : 1;
    const variazione = valore * perc * segno;
    return valore + variazione
}

module.exports = {
    getCaloreDisperso,
    getValoreSensore
}