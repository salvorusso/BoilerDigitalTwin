/*global require,console,setTimeout */
const opcua = require("node-opcua");
const async = require("async");
require("dotenv").config()
const iot = require("./modules/iothub")
const dtdl = require('../DTDL/DigitalTwins copy.json');

const subscriptionOptions = {
    maxNotificationsPerPublish: 1000,
    publishingEnabled: true,
    /*
    Il "requestedLifetimeCount" indica al server quanti campioni di dati vuoi che vengano conservati nella cache per ogni valore monitorato.
    Quando la cache raggiunge il limite specificato da "requestedLifetimeCount", i campioni più vecchi vengono scartati per fare spazio ai nuovi campioni che arrivano.
    */
    requestedLifetimeCount: 1000,
    /*
    Il parametro "requestedMaxKeepAliveCount"
    specifica il numero massimo di messaggi "KeepAlive" che il client richiede dal server durante una sessione di comunicazione.
    */
    requestedMaxKeepAliveCount: 10,
    /*
    Il "requestedPublishingInterval" indica al server la frequenza desiderata di invio dei dati per una subscription.
    Viene espresso in millisecondi e rappresenta l'intervallo di tempo tra le notifiche di pubblicazione successive inviate dal server al client.

    !!!!!!!!!!!
    Abbiamo messo un valore molto alto perchè mantenendo un valore troppo alto, riceviamo da IotHub il seguente errore, causato da un numero elevato di messaggi inviati (stiamo usando il free tier):
        IotHubQuotaExceeded;Total number of messages on the IoT Hub exceeded the allocated quota. 
    !!!!!!!!!!!
    */
    requestedPublishingInterval: 5000
};

const endpointUrl = process.env.SERVER_URL
const opcClient = opcua.OPCUAClient.create({
    endpointMustExist: false
});
opcClient.on("backoff", (retry, delay) =>
    console.log("still trying to connect to ", endpointUrl, ": retry =", retry, "next attempt in ", delay / 1000, "seconds")
);

let opcSession, opcSubscription;

//Create IoTHub clients
const clients = {}
clients["BensonBoiler1"] = iot.createIotHubClient(process.env.BOILER1_KEY);
clients["BensonBoiler2"] = iot.createIotHubClient(process.env.BOILER2_KEY);
clients["BensonBoiler3"] = iot.createIotHubClient(process.env.BOILER3_KEY);
clients["BensonBoiler4"] = iot.createIotHubClient(process.env.BOILER4_KEY);
clients["BensonBoiler5"] = iot.createIotHubClient(process.env.BOILER5_KEY);
clients["BensonBoiler6"] = iot.createIotHubClient(process.env.BOILER6_KEY);
clients["GeneratoreElettrico1"] = iot.createIotHubClient(process.env.GENERATOR1_KEY);
clients["GeneratoreElettrico2"] = iot.createIotHubClient(process.env.GENERATOR2_KEY);
clients["GeneratoreElettrico3"] = iot.createIotHubClient(process.env.GENERATOR3_KEY);
clients["GeneratoreElettrico4"] = iot.createIotHubClient(process.env.GENERATOR4_KEY);
clients["GeneratoreElettrico5"] = iot.createIotHubClient(process.env.GENERATOR5_KEY);
clients["GeneratoreElettrico6"] = iot.createIotHubClient(process.env.GENERATOR6_KEY);

async.series([

    // step 1 : connect to server
    function (callback) {
        opcClient.connect(endpointUrl, function (err) {
            if (err) {
                console.log("Cannot connect to endpoint :", endpointUrl);
            } else {
                console.log("Connected to server", endpointUrl);
            }
            callback(err);
        });
    },

    // step 2 : create session
    function (callback) {
        opcClient.createSession(function (err, session) {
            if (err) {
                return callback(err);
            }
            opcSession = session;
            callback();
        });
    },

    // step 3 : Browse the folder
    function (callback) {
        opcSession.browse("ns=1;s=ProductionPlant", function (err, browseResult) {
            if (!err) {
                console.log("Browsing folder: ");
                for (let reference of browseResult.references) {
                    console.log("\t" + reference.browseName.toString(), reference.nodeId.toString());
                }
            }
            callback(err);
        });
    },

    // step 4' : read a variable with read
    // function (callback) {
    //     const maxAge = 0;
    //     const nodeToRead = { nodeId: "ns=1;s=caloreDisperso", attributeId: opcua.AttributeIds.Value };
    //     opcSession.read(nodeToRead, maxAge, function (err, dataValue) {
    //         if (!err) {
    //             console.log("\nCalore Disperso = ", dataValue.toString());
    //         }
    //         callback(err);
    //     });
    // },

    // step 5: install a subscription and install a monitored item
    function (callback) {
        opcSession.createSubscription2(subscriptionOptions, (err, subscription) => {
            if (err) { return callback(err); }
            subscription.on("started", () => {
                console.log("subscription started for 2 seconds - subscriptionId=", opcSubscription.subscriptionId);
            }).on("keepalive", function () {
                console.log("subscription keepalive");
            }).on("terminated", function () {
                console.log("terminated");
            });

            for (const digitalTwin of dtdl.digitalTwinsGraph.digitalTwins) {
                if (!(digitalTwin.$metadata.tags && digitalTwin.$metadata.tags["ignoreOPCInstance"])) {
                    const model = dtdl.digitalTwinsModels.find(m => m["@id"] === digitalTwin.$metadata.$model);

                    for (const prop of model.contents) {
                        if (prop["@type"] === "Property") {
                            // Install monitored item
                            subscription.monitor({
                                nodeId: opcua.resolveNodeId(`ns=1;s=${digitalTwin.$dtId}-${prop.name}`),
                                attributeId: opcua.AttributeIds.Value
                            },
                                {
                                    samplingInterval: 500,
                                    discardOldest: true,
                                    queueSize: 10
                                },
                                opcua.TimestampsToReturn.Both
                            ).then((item) => {
                                item.on("changed", function (dataValue) {
                                    console.log(`Subscription '${subscription.subscriptionId}'; Monitored item '${this.monitoredItemId}' changed: '${digitalTwin.$dtId}-${prop.name}' = ${dataValue.value.value}`);
                                    //Aggiorna IoT Hub
                                    path = "/" + prop.name
                                    iot.sendEventToIoTHub(clients[digitalTwin.$dtId], path, dataValue.value.value)
                                });
                            });
                        }
                    }
                }
            }
        });

    },

],
    function (err) {
        if (err) {
            console.log("Client Failure ", err);
        } else {
            console.log("Done!");
        }
        opcClient.disconnect(function () { });
    });