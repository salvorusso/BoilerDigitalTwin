const opcua = require("node-opcua");
const axios = require('axios');

// Mappa dei nodi osservati dal server
// Il valore indica il BrowseName
const nodes = {
    "Boiler": {
        caloreDisperso: "Calore Disperso",
        temperaturaAcquaIngresso: "Temperatura Acqua in Ingresso",
        caloreDisperso: "Calore Disperso",
        efficienza: "Efficienza",
        flussoAcquaIngresso: "Flusso Acqua in Ingresso",
        temperaturaVaporeUscita: "Temperatura Vapore in Uscita"
    },
    "Generatore Elettrico": {
        potenzaElettrica: "Potenza Elettrica"
    }

}

function generateVariable(object, browseName, value) {
    return {
        componentOf: object,
        browseName: browseName,
        dataType: "Double",
        nodeId: `s=${value}`,
    }
}

function constructAddressSpace(server) {
    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();

    for (const object in nodes) {
        const obj = namespace.addObject({
            organizedBy: addressSpace.rootFolder.objects,
            browseName: object
        })
        for (const node in nodes[object]) {
            namespace.addVariable(generateVariable(obj, nodes[object][node], node))
            console.log(`Added Node: nodeId:ns=1;s=${node} , BrowseName:${nodes[object][node]}`);
        }
    }
}

async function updateVariable(server, path) {
    try {
        const response = await axios.get(`http://localhost:3000/${path}`); // URL del simulatore di dati
        const value = response.data[path];

        // Aggiorna il valore della variabile OPC UA
        const variable = server.engine.addressSpace.findNode(`ns=1;s=${path}`);
        variable.setValueFromSource(new opcua.Variant({ dataType: opcua.DataType.Double, value }));
    } catch (error) {
        console.error("Errore durante la richiesta HTTP:", error);
    }
}

async function updateVariables(server) {
    for (const object in nodes) {
        for (const node in nodes[object]) {
            updateVariable(server, node)
        }
    }
}

module.exports = {
    constructAddressSpace,
    updateVariables,
    nodes
}