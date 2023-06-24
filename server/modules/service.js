const opcua = require("node-opcua");
const axios = require('axios');

// Mappa dei nodi osservati dal server
// Al primo livello troviamo gli oggetti
// Dentro, le chiavi indicano le loro variabili
// Il valore indica il BrowseName
const nodes = require('./addressSpace.json')

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
            var variable = namespace.addVariable(generateVariable(obj, nodes[object][node], node));

            var optionBind = {
                refreshFunc: function (callback) {
                    callUpdateEndpoint(node)
                    .then(res => {
                        console.log(`Value from endpoint:`, res.data);
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

            console.log(`Added Node: \n{\n nodeId: 'ns=1;s=${node}', \n BrowseName: '${nodes[object][node]}'\n}`);
        }
    }
}

function callUpdateEndpoint(path) {
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