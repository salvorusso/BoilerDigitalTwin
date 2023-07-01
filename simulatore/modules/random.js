let currentTemperature = 50;
let maxTemperature = 120;
let criticalTemp = 150;

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
    const result = valore + variazione;
    if(result < 0)
        return result * -1 // Mai negativo
    else
        return result
}

function simulatePressure() {
    const minPressure = 25; // MPa
    const maxPressure = 35; // MPa
    const steamPressure = Math.random() * (maxPressure - minPressure) + minPressure; 
    return steamPressure;
}

function simulateGeneratorTemperature() {
    let temperatureFluctuation = 0.1;
    let temperatureIncrementProbability = 0.9; // 90% di probabilità di incremento
    let temperatureIncrement = 0;
    // Meccanismo di protezione e raffreddamento che raffredda il generatore di 5 gradi
    if (currentTemperature > criticalTemp) {
        currentTemperature += -5;
    }
    if (currentTemperature >= maxTemperature) {
        temperatureIncrementProbability = 0.1; // 10% di probabilità di incremento
    }

    // Incrementa la temperatura solo se la probabilità è soddisfatta
    if (Math.random() <= temperatureIncrementProbability) {
        temperatureIncrement = Math.random() * 5; // Incremento casuale tra 0 e 5 gradi
        currentTemperature += temperatureIncrement;
    }

    // A regime la temperatura fluttua
    if (currentTemperature >= maxTemperature - (maxTemperature * temperatureFluctuation)) {
        temperatureIncrement *= (1 - temperatureFluctuation) + Math.random() * temperatureFluctuation * 2;
    }

    return currentTemperature;
}

module.exports = {
    getCaloreDisperso,
    getValoreSensore,
    simulateGeneratorTemperature,
    simulatePressure
}