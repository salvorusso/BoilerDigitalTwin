const random = require('./modules/random')

// Costanti termodinamiche
const caloreSpecificoAcqua = 4.81; // kJ/kg·°C
const caloreSpecificoVapore = 1.9 // kJ/kg·°C
const costanteGas = 8.314; // J/(mol·K)
const massaMolareAcqua = 18.015; // g/mol


// Parametri di progettazione
//const temperaturaCombustione = 1500; // °C
const pressioneIniziale = 20; // MPa ~ 200 Bar

function simulazione() {
    const flussoMassicoAcqua = random.getValoreSensore(120); // kg/s (valore letto dal sensore)
    console.log("\nFlusso Acqua", flussoMassicoAcqua.toFixed(2),"kg/s")
    const temperaturaIniziale = random.getValoreSensore(25); // °C (valore letto dal sensore)
    console.log("Temperatura Acqua", temperaturaIniziale.toFixed(2),"°C\n")
    
    // Parametri in uscita
    const temperaturaFinale = random.getValoreSensore(300); // °C (valore letto dal sensore)
    
    // Calcolo del calore fornito all'acqua
    // Q = mcΔT
    const caloreFornito = flussoMassicoAcqua * caloreSpecificoAcqua * (temperaturaFinale - temperaturaIniziale); // J
    console.log("Calore fornito", caloreFornito.toFixed(2), "J")
    
    // Calcolo del calore del disperso (assumendo una fluttuazione casuale)
    // Dipende da: perdita di calore nei fumi secchi, irraggiamento, combustibile incombusto ecc...
    // Si rimanda implementazione termodinamica di rendimento generatore di vapore: https://www.docenti.unina.it/webdocenti-be/allegati/materiale-didattico/648947
    const caloreDisperso = random.getCaloreDisperso() * caloreFornito; // 15% del calore fornito
    console.log("Calore disperso", caloreDisperso.toFixed(2), "J")
    
    // Calcolo dell'efficienza della caldaia
    const efficienza = (1 - (caloreDisperso / caloreFornito))*100;
    
    console.log("Temperatura finale del vapore:", temperaturaFinale.toFixed(2), "°C\n");
    console.log("Efficienza della caldaia:", efficienza.toFixed(2), "%");
    
    // Calcolo energia termica convertita in lavoro
    // W = efficienza * Q
    const lavoro = efficienza/100 * caloreFornito; // J/s ~ W
    console.log("Energia termica convertita in lavoro:", lavoro.toFixed(2), "J")
    
    // Calcolo potenza generata dal motore
    // Per semplicità, calcoliamo la potenza come P=W/t
    // Supponiamo un motore ideale privo di perdite, in un tempo t=1s
    const potenza = lavoro/1;
    console.log("Potenza:", (potenza/1000).toFixed(2),"kW");
    console.log("...\n")
}

simulazione()
setInterval(simulazione, 10000);