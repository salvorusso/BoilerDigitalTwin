const opcua = require("node-opcua");
const axios = require('axios');
const dtdl = require('../../DTDL/DigitalTwins.json');

//Funzione che crea gli ObjectType
function createObjectType(server) {
    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();

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

            for (const content of type["contents"]) {
                //Se il contentuto è 'Property' devo aggiungere una variabile al tipo appena creato
                if (content["@type"] === 'Property') {
                    var dataType = opcua.DataType.Null;
                    if (content.schema.toLowerCase() === 'double')
                        dataType = opcua.DataType.Double;

                    if (dataType != opcua.DataType.Null) {
                        namespace.addVariable({
                            componentOf: customObject,
                            browseName: content["name"],
                            dataType: dataType,
                            //Senza questo parametro non vengono viste le variabili
                            modellingRule: 'Mandatory',
                        });
                    }
                }
                else if (content["@type"] === 'Relationship') {

                }
            }
        }
    }
}

//Funzione che ha il compito di istanzare gli oggetti leggendo il file DTDL
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
        if (!(digitalTwin.$metadata.tags && digitalTwin.$metadata.tags["ignoreOPCInstance"])) {
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
    
            var variables = obj.getComponents();
            for (const variable of variables) {
                const varName = variable.browseName.name.toCamelCase();
                
                var optionBind = {
                    refreshFunc: function (callback) {
                        callUpdateEndpoint(varName)
                            .then(res => {
                                //console.log(`Value from endpoint:`, res.data);
                                let dataValue = new opcua.DataValue({
                                    value: new opcua.Variant({ dataType: opcua.DataType.Double, value: res.data[varName] }),
                                    serverTimestamp: new Date(),
                                    sourceTimestamp: res.data['sourceTimestamp']
                                });
                                callback(null, dataValue)
                            })
                            .catch(err => {
                                let dataValue = new opcua.DataValue({
                                    statusCode: opcua.StatusCodes.BadNoCommunication,
                                    serverTimestamp: new Date()
                                });
                                callback(null, dataValue);
                            });
                    }
                };
                variable.bindVariable(optionBind, true);
            }
        }
    }
}

function callUpdateEndpoint(path) {
    // console.log("Calling endpoint:", path)
    // URL del simulatore di dati
    return axios.get(`http://localhost:3000/${path}`); 
}

String.prototype.toCamelCase = function () {
    var str = this;
    return str
        .replace(/\s(.)/g, function ($1) { return $1.toUpperCase(); })
        .replace(/\s/g, '')
        .replace(/^(.)/, function ($1) { return $1.toLowerCase(); });
}

module.exports = {
    createObjectType,
    instantiateDigitalTwin
}