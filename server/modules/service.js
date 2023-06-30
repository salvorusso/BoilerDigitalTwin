const opcua = require("node-opcua");
const axios = require('axios');

// Mappa dei nodi osservati dal server
// Al primo livello troviamo gli oggetti
// Dentro, le chiavi indicano le loro variabili
// Il valore indica il BrowseName
const nodes = require('../../assets/config/addressSpace.json');

const typeDefinitions = {
    "Boiler": {
        browseName: "Boiler Type"
    },
    "Generatore Elettrico": {
        browseName: "Generatore Elettrico Type"
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

    var customFolder = namespace.addFolder("RootFolder",
        {
            nodeId: "s=ProductionPlantOld",
            browseName: "ProductionPlantOld"
        }
    );

    var i = 0;
    for (const object in nodes) {
        // Add type definitions to namespace
        const type = namespace.addObjectType(typeDefinitions[object])

        namespace.addVariable({
            componentOf: type,
            browseName: 'Temperature',
            dataType: opcua.DataType.Double,
            nodeId: "s=Temperature" + i, //IDENTIFICATORE CON STRINGA
            modellingRule: 'Mandatory',
        });

        // Instantiate Objects
        const obj = type.instantiate({
            organizedBy: customFolder,
            nodeId: "s=" + object.charAt(0).toLowerCase() + object.slice(1).replaceAll(" ", ""),
            browseName: object
        });

        for (const node in nodes[object]) {
            var variable = namespace.addVariable(generateVariable(obj, nodes[object][node], node));

            var optionBind = {
                refreshFunc: function (callback) {
                    callUpdateEndpoint(node)
                        .then(res => {
                            //console.log(`Value from endpoint:`, res.data);
                            let dataValue = new opcua.DataValue({
                                value: new opcua.Variant({ dataType: opcua.DataType.Double, value: res.data[node] }),
                                serverTimestamp: new Date(),
                                sourceTimestamp: res.data['sourceTimestamp']
                            });
                            callback(null, dataValue)
                        })
                        .catch(err => {
                            /*
                            const varb = addressSpace.findNode(`ns=1;s=${node}`)
                            varb.setValueFromSource(new opcua.Variant({ dataType: opcua.DataType.Double, value: 0 }), opcua.StatusCodes.BadNoDataAvailable);
                            callback(null, dataValue);
                            */

                            // TODO: handle error
                            callback(err)
                            // let dataValue = new opcua.DataValue({
                            //     value: new opcua.Variant({ dataType: opcua.DataType.Double, value: 0 }),
                            //     statusCode: opcua.StatusCodes.BadNoDataAvailable,
                            //     serverTimestamp: new Date()
                            // });
                            // callback(null, dataValue)
                        });
                }
            };
            variable.bindVariable(optionBind, true);

            console.log(`------------------------------------------------------\nAdded Node to object '${object}': \nnodeId: 'ns=1;s=${node}', \nbrowseName: '${nodes[object][node]}'\n------------------------------------------------------\n`);
        }
        i++;
    }
}

function callUpdateEndpoint(path) {
    console.log("Calling endpoint:", path)
    return axios.get(`http://localhost:3000/${path}`); // URL del simulatore di dati
}

// async function updateVariable(server, path) {
//     try {
//         const response = await axios.get(`http://localhost:3000/${path}`); // URL del simulatore di dati
//         const value = response.data[path];

//         const variable = server.engine.addressSpace.findNode(`ns=1;s=${path}`);
//         variable.setValueFromSource(new opcua.Variant({ dataType: opcua.DataType.Double, value }));
//     } catch (error) {
//         console.error("Errore durante la richiesta HTTP:", error);
//     }
// }

// async function updateVariables(server) {
//     for (const object in nodes) {
//         for (const node in nodes[object]) {
//             updateVariable(server, node)
//         }
//     }
// }

module.exports = {
    constructAddressSpace,
    nodes
}