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
                    if (typeof content.schema === 'string') {
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
                    else if (content.name === "Properties") {
                        for (const field of content.schema.fields) {
                            const model = namespace.addVariable({
                                propertyOf: customObject,
                                browseName: field.name,
                                dataType: opcua.DataType.String,
                                modellingRule: 'Mandatory'
                            });
                            if (!!field.comment) {
                                model.setValueFromSource({
                                    dataType: opcua.DataType.String,
                                    value: field.comment,
                                });
                            }
                        }
                    }
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
        if (!(digitalTwin.$metadata.tags && digitalTwin.$metadata.tags["ignoreOPC"])) {
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
                if (variable.nodeClass === opcua.NodeClass.Variable) {
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
}

//Funzione con il compito di creare le relazioni
function createRelationships(server) {
    const addressSpace = server.engine.addressSpace;

    for (const rel of dtdl.digitalTwinsGraph.relationships) {
        var targetNode = addressSpace.findNode(`ns=1;s=${rel.$targetId}`);

        if (!(rel.$metadata && rel.$metadata.tags && rel.$metadata.tags["ignoreOPC"])
            && rel.$metadata && rel.$metadata.tags["sourceModel"] && rel.$metadata.tags["targetModel"]) {

            targetNode.addReference({
                referenceType: rel.$metadata.tags["inverseReferenceType"],
                nodeId: `ns=1;s=${rel.$sourceId}`
            });
        }
    }
}

//Funzione con il compito di creare le relazioni
// function createRelationshipsNUOVA(server) {
//     const addressSpace = server.engine.addressSpace;
//     const namespace = addressSpace.getOwnNamespace();

//     for (const relationship of dtdl.digitalTwinsGraph.relationships) {
//         // var sourceNode = addressSpace.findNode(`ns=1;s=${relationship.$sourceId}`);
//         // var targetNode = addressSpace.findNode(`ns=1;s=${relationship.$targetId}`);

//         if (relationship.$metadata && relationship.$metadata.tags && relationship.$metadata.tags["sourceModel"] && relationship.$metadata.tags["targetModel"]) {
//             var sourceObjTypeName = composeObjectTypeName(relationship.$metadata.tags["sourceModel"])
//             var targetObjTypeName = composeObjectTypeName(relationship.$metadata.tags["targetModel"])

//             const sourceType = namespace.findObjectType(sourceObjTypeName);
//             const targetType = namespace.findObjectType(targetObjTypeName);

//             sourceType.addReference({
//                 referenceType: relationship.$metadata.tags["referenceType"],
//                 nodeId: `ns=1;s=${targetObjTypeName}`
//             });

//             targetType.addReference({
//                 referenceType: relationship.$metadata.tags["inverseReferenceType"],
//                 nodeId: `ns=1;s=${sourceObjTypeName}`
//             });
//         }
//         // var array = digitalTwin.$metadata.$model.split(":");
//         // var objType = array[array.length - 1].split(";")[0];
//         // if (!objType.includes("Type"))
//         //     objType += "Type";

//         // if (!(relationship.$metadata && relationship.$metadata.tags && relationship.$metadata.tags["ignoreOPC"])) {
//         //     sourceNode.addReference({
//         //         referenceType: "IsPhysicallyConnectedTo",
//         //         nodeId: `ns=1;s=${relationship.$targetId}`
//         //     }
//         //     );

//         //     targetNode.addReference({
//         //         referenceType: "IsPhysicallyConnectedTo",
//         //         nodeId: `ns=1;s=${relationship.$sourceId}`
//         //     });
//         // }
//     }
// }

function composeObjectTypeName(jsonModelName) {
    var array = jsonModelName.split(":");
    var objType = array[array.length - 1].split(";")[0];
    if (!objType.includes("Type"))
        objType += "Type";

    return objType;
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
    instantiateDigitalTwin,
    createRelationships
}