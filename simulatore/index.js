const random = require('./modules/random')
const telemetry = require('./modules/telemetry')
require("dotenv").config()
// Costanti termodinamiche
const caloreSpecificoAcqua = 4.81; // kJ/kg·°C
const caloreSpecificoVapore = 1.9 // kJ/kg·°C
const costanteGas = 8.314; // J/(mol·K)
const massaMolareAcqua = 18.015; // g/mol

// Parametri di progettazione
const pressioneIniziale = 20; // MPa ~ 200 Bar

// Grandezze osservate
let flussoAcquaIngresso = 120; // kg/s (valore letto dal sensore)
let temperaturaAcquaIngresso = 25; // °C (valore letto dal sensore)
let temperaturaVaporeUscita = 300; // °C (valore letto dal sensore)
let caloreDisperso = 0; // %
let efficienza = 100; // %
let potenzaElettrica = 0; // kW

function sendTelemetry() {
    //Update Digital Twin
    if (process.env.UPDATE_DT == 'true') {
        telemetry.updateData('BensonBoiler', '/TemperaturaAcquaIngresso', temperaturaAcquaIngresso)
        telemetry.updateData('BensonBoiler', '/CaloreDisperso', caloreDisperso)
        telemetry.updateData('BensonBoiler', '/Efficienza', efficienza)
        telemetry.updateData('BensonBoiler', '/FlussoAcquaIngresso', flussoAcquaIngresso)
        telemetry.updateData('BensonBoiler', '/TemperaturaVaporeUscita', temperaturaVaporeUscita)
        telemetry.updateData('GeneratoreElettrico', '/PotenzaElettrica', (potenzaElettrica / 1000))
    }
}

function simulazione() {
    flussoAcquaIngresso = random.getValoreSensore(flussoAcquaIngresso);
    console.log("\nFlusso Acqua", flussoAcquaIngresso.toFixed(2), "kg/s");
    temperaturaAcquaIngresso = random.getValoreSensore(temperaturaAcquaIngresso);
    console.log("Temperatura Acqua", temperaturaAcquaIngresso.toFixed(2), "°C\n");

    // Parametri in uscita
    temperaturaVaporeUscita = random.getValoreSensore(300);

    // Calcolo del calore fornito all'acqua
    // Q = mcΔT
    const caloreFornito = flussoAcquaIngresso * caloreSpecificoAcqua * (temperaturaVaporeUscita - temperaturaAcquaIngresso); // J
    console.log("Calore fornito", caloreFornito.toFixed(2), "J");

    // Calcolo del calore del disperso (assumendo una fluttuazione casuale)
    // Dipende da: perdita di calore nei fumi secchi, irraggiamento, combustibile incombusto ecc...
    // Si rimanda implementazione termodinamica di rendimento generatore di vapore: https://www.docenti.unina.it/webdocenti-be/allegati/materiale-didattico/648947
    caloreDisperso = random.getCaloreDisperso() * caloreFornito; // 15% del calore fornito
    console.log("Calore disperso", caloreDisperso.toFixed(2), "J");

    // Calcolo dell'efficienza della caldaia
    efficienza = (1 - (caloreDisperso / caloreFornito)) * 100;

    console.log("Temperatura vapore in uscita:", temperaturaVaporeUscita.toFixed(2), "°C\n");
    console.log("Efficienza della caldaia:", efficienza.toFixed(2), "%");

    // Calcolo energia termica convertita in lavoro
    // W = efficienza * Q
    const lavoro = efficienza / 100 * caloreFornito; // J/s ~ W
    console.log("Energia termica convertita in lavoro:", lavoro.toFixed(2), "J");

    // Calcolo potenzaElettrica generata dal motore
    // Per semplicità, calcoliamo la potenzaElettrica come P=W/t
    // Supponiamo un motore ideale privo di perdite, in un tempo t=1s
    potenzaElettrica = lavoro / 1;
    console.log("Potenza:", (potenzaElettrica / 1000).toFixed(2), "kW");
    console.log("...\n");
    sendTelemetry();
}

// Server http per esporre le variabili
const express = require('express')
const app = express()
const port = 3000

app.get('/temperaturaAcquaIngresso', (req, res) => {
    res.send({
        temperaturaAcquaIngresso,
        sourceTimestamp: new Date()
    })
})
app.get('/caloreDisperso', (req, res) => {
    res.send({
        caloreDisperso,
        sourceTimestamp: new Date()
    })
})
app.get('/efficienza', (req, res) => {
    res.send({
        efficienza,
        sourceTimestamp: new Date()
    })
})
app.get('/flussoAcquaIngresso', (req, res) => {
    res.send({
        flussoAcquaIngresso,
        sourceTimestamp: new Date()
    })
})
app.get('/temperaturaVaporeUscita', (req, res) => {
    res.send({
        temperaturaVaporeUscita,
        sourceTimestamp: new Date()
    })
})
app.get('/potenzaElettrica', (req, res) => {
    res.send({
        potenzaElettrica,
        sourceTimestamp: new Date()
    })
})
app.listen(port, () => {
    console.log("Starting Benson Boiler simulation... (Ctrl + C to exit...)\n...")
    console.log(`Server listening on port ${port}`)
    console.log("Simulation interval:", process.env.PERIOD, "ms\n...")
    setInterval(simulazione, process.env.PERIOD);
})