const opcua = require("node-opcua");
const axios = require('axios');
const dtdl = require('../../DTDL/DigitalTwins copy.json');

//Funzione che crea gli ObjectType
function createObjectTypeCustom(server) {
    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();

    var customFolder = namespace.addFolder("RootFolder",
        {
            nodeId: "s=ProductionPlant2",
            browseName: "ProductionPlant2",
            displayName: "ProductionPlant2"
        }
    );

    for (const type of dtdl.digitalTwinsModels) {
        if (type["@type"] === "Interface") {
            var array = type["@id"].split(":");
            var browseName = array[array.length - 1].split(";")[0];
            if (!browseName.includes("Type"))
                browseName += "Type";

            const customObject = namespace.addObjectType(
                {
                    browseName: browseName,
                    displayName: browseName
                }
            )

            var variables = [];
            for (const content of type["contents"]) {
                //Se il contentuto è 'Property' devo aggiungere una variabile al tipo appena creato
                if (content["@type"] === 'Property') {
                    var dataType = opcua.DataType.Null;
                    if (content.schema.toLowerCase() === 'double')
                        dataType = opcua.DataType.Double;

                    if (dataType != opcua.DataType.Null) {
                        var variable = namespace.addVariable({
                            componentOf: customObject,
                            browseName: content["name"],
                            dataType: dataType,
                            //Senza questo parametro non vengono viste le variabili
                            modellingRule: 'Mandatory',
                        });
                        variables.push(content["name"]);
                        var optionBind = {
                            refreshFunc: function (callback) {
                                console.log("CIAO")
                                callUpdateEndpoint(content["name"])
                                    .then(res => {
                                        //console.log(`Value from endpoint:`, res.data);
                                        let dataValue = new opcua.DataValue({
                                            value: new opcua.Variant({ dataType: opcua.DataType.Double, value: 20 + 10 * Math.sin(Date.now() / 10000) }),
                                            serverTimestamp: new Date()
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
                    }
                }
                else if (content["@type"] === 'Relationship') {

                }
            }

            const instance = customObject.instantiate({
                organizedBy: customFolder,
                nodeId: "s=" + browseName,
                browseName: browseName
            })
            variables.forEach(variable => {
                //Bisogna fare il bind per ogni variabile assegnata!
                const varName = variable.charAt(0).toLowerCase() + variable.slice(1);
                var optionBind = {
                    refreshFunc: function (callback) {
                        callUpdateEndpoint(varName)
                            .then(res => {
                                //console.log(`Value from endpoint:`, res.data);
                                let dataValue = new opcua.DataValue({
                                    value: new opcua.Variant({ dataType: opcua.DataType.Double, value: 20 + 10 * Math.sin(Date.now() / 10000) }),
                                    serverTimestamp: new Date()
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

                instance[varName].bindVariable(optionBind, true);
            });
        }
        variables = [];
    }
}

function instantiateDigitalTwin(server) {
    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();
    var customFolder = namespace.addFolder("RootFolder",
        {
            nodeId: "s=ProductionPlant",
            browseName: "ProductionPlant",
            displayName: "ProductionPlant"
        }
    );

    for (const digitalTwin of dtdl.digitalTwinsGraph.digitalTwins) {
        console.log(digitalTwin);

        var array = digitalTwin.$metadata.$model.split(":");
        var objType = array[array.length - 1].split(";")[0];
        if (!objType.includes("Type"))
            objType += "Type";

        const type = namespace.findObjectType(objType);
        const obj = type.instantiate({
            organizedBy: customFolder,
            nodeId: "s=" + digitalTwin.$dtId,
            browseName: digitalTwin.$dtId
        });
    }
}

// Funzione per creare le variabili OPC UA per un ObjectType
function createVariables(objectType, properties) {
    const variables = [];

    for (const property of properties) {
        const variable = {
            componentOf: objectType,
            nodeId: `s=${property.name}`,
            browseName: property.name,
            dataType: opcua.DataType[property.schema.toUpperCase()],
            value: {
                get: () => {
                    return new opcua.Variant({
                        dataType: opcua.DataType[property.schema.toUpperCase()],
                        value: 0, // Inserisci qui il valore iniziale desiderato
                    });
                },
            },
        };

        variables.push(variable);
    }

    return variables;
}

// Funzione per creare un ObjectType OPC UA corrispondente a un'interfaccia DTDL
function createObjectType(interfaceId, properties) {
    const objectType = server.engine.addressSpace.addObjectType({
        browseName: interfaceId,
        nodeId: `s=${interfaceId}`,
    });

    const variables = createVariables(objectType, properties);

    for (const variable of variables) {
        server.engine.addressSpace.addVariable({
            ...variable,
            modellingRule: "Mandatory",
        });
    }

    return objectType;
}

// Funzione per creare le istanze degli oggetti DTDL come sottogruppi degli ObjectType corrispondenti
function createDigitalTwinsInstances() {
    const rootFolder = server.engine.addressSpace.findNode("RootFolder");

    if (!rootFolder) {
        console.error("Errore: RootFolder non trovata nello spazio degli indirizzi OPC UA.");
        return;
    }

    for (const digitalTwin of jsonData.digitalTwinsGraph.digitalTwins) {
        const model = jsonData.digitalTwinsModels.find((m) => m["@id"] === digitalTwin.$metadata.$model);

        if (model && model["@type"] === "Interface") {
            const dtId = digitalTwin.$dtId;
            const objectType = server.engine.addressSpace.findObjectType(model["@id"]);

            if (objectType) {
                const instance = server.engine.addressSpace.addObject({
                    organizedBy: rootFolder,
                    browseName: dtId,
                    nodeId: `s=${dtId}`,
                    typeDefinition: objectType.nodeId,
                });

                for (const property of model.contents.filter((content) => content["@type"] === "Property")) {
                    server.engine.addressSpace.addVariable({
                        componentOf: instance,
                        nodeId: `s=${property.name}`,
                        browseName: property.name,
                        dataType: opcua.DataType[property.schema.toUpperCase()],
                        value: {
                            get: () => {
                                return new opcua.Variant({
                                    dataType: opcua.DataType[property.schema.toUpperCase()],
                                    value: 0, // Inserisci qui il valore iniziale desiderato
                                });
                            },
                        },
                    });
                }
            }
        }
    }

    console.log("Spazio degli indirizzi OPC UA creato con successo!");
}

// Avvia il server OPC UA e crea lo spazio degli indirizzi
// server.start(function () {
//     createDigitalTwinsInstances();
// });

function callUpdateEndpoint(path) {
    console.log("Calling endpoint:", path)
    return axios.get(`http://localhost:3000/${path}`); // URL del simulatore di dati
}

String.prototype.toCamelCase = function (str) {
    return str
        .replace(/\s(.)/g, function ($1) { return $1.toUpperCase(); })
        .replace(/\s/g, '')
        .replace(/^(.)/, function ($1) { return $1.toLowerCase(); });
}

camelize = function camelize(str) {
    return str.replace(/\W+(.)/g, function (match, chr) {
        return chr.toUpperCase();
    });
}

module.exports = {
    createDigitalTwinsInstances,
    createObjectTypeCustom,
    instantiateDigitalTwin
}