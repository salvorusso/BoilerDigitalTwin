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
let flussoMassicoAcqua = 120; // kg/s (valore letto dal sensore)
let temperaturaIniziale = 25; // °C (valore letto dal sensore)
let temperaturaFinale = 300; // °C (valore letto dal sensore)
let caloreDisperso = 0; // %
let efficienza = 100; // %
let potenza = 0; // kW

function sendTelemetry(){
    //Update Digital Twin
    if(process.env.UPDATE_DT == 'true'){
        telemetry.updateData('BensonBoiler', '/TemperaturaAcquaIngresso', temperaturaIniziale)
        telemetry.updateData('BensonBoiler', '/CaloreDisperso', caloreDisperso)
        telemetry.updateData('BensonBoiler', '/Efficienza', efficienza)
        telemetry.updateData('BensonBoiler', '/FlussoAcquaIngresso', flussoMassicoAcqua)
        telemetry.updateData('BensonBoiler', '/TemperaturaVaporeUscita', temperaturaFinale)
        telemetry.updateData('GeneratoreElettrico', '/PotenzaElettrica', (potenza/1000))    
    }
}

function simulazione() {
    flussoMassicoAcqua = random.getValoreSensore(flussoMassicoAcqua); 
    console.log("\nFlusso Acqua", flussoMassicoAcqua.toFixed(2),"kg/s");
    temperaturaIniziale = random.getValoreSensore(temperaturaIniziale); 
    console.log("Temperatura Acqua", temperaturaIniziale.toFixed(2),"°C\n");
    
    // Parametri in uscita
    temperaturaFinale = random.getValoreSensore(300); 
    
    // Calcolo del calore fornito all'acqua
    // Q = mcΔT
    const caloreFornito = flussoMassicoAcqua * caloreSpecificoAcqua * (temperaturaFinale - temperaturaIniziale); // J
    console.log("Calore fornito", caloreFornito.toFixed(2), "J");
    
    // Calcolo del calore del disperso (assumendo una fluttuazione casuale)
    // Dipende da: perdita di calore nei fumi secchi, irraggiamento, combustibile incombusto ecc...
    // Si rimanda implementazione termodinamica di rendimento generatore di vapore: https://www.docenti.unina.it/webdocenti-be/allegati/materiale-didattico/648947
    caloreDisperso = random.getCaloreDisperso() * caloreFornito; // 15% del calore fornito
    console.log("Calore disperso", caloreDisperso.toFixed(2), "J");
    
    // Calcolo dell'efficienza della caldaia
    efficienza = (1 - (caloreDisperso / caloreFornito))*100;
    
    console.log("Temperatura vapore in uscita:", temperaturaFinale.toFixed(2), "°C\n");
    console.log("Efficienza della caldaia:", efficienza.toFixed(2), "%");
    
    // Calcolo energia termica convertita in lavoro
    // W = efficienza * Q
    const lavoro = efficienza/100 * caloreFornito; // J/s ~ W
    console.log("Energia termica convertita in lavoro:", lavoro.toFixed(2), "J");
    
    // Calcolo potenza generata dal motore
    // Per semplicità, calcoliamo la potenza come P=W/t
    // Supponiamo un motore ideale privo di perdite, in un tempo t=1s
    potenza = lavoro/1;
    console.log("Potenza:", (potenza/1000).toFixed(2),"kW");
    console.log("...\n");
    sendTelemetry(); 
}

console.log("Simulation interval:", process.env.PERIOD, "ms")
console.log("Starting Benson Boiler simulation... (Ctrl + C to exit...)\n...")
setInterval(simulazione, process.env.PERIOD);