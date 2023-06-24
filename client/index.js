/*global require,console,setTimeout */
const opcua = require("node-opcua");
const async = require("async");
require("dotenv").config()
const nodes = require('../assets/config/addressSpace.json');

const subscriptionOptions = {
    maxNotificationsPerPublish: 1000,
    publishingEnabled: true,
    requestedLifetimeCount: 100,
    requestedMaxKeepAliveCount: 10,
    requestedPublishingInterval: 1000
};

const endpointUrl = process.env.SERVER_URL
const client = opcua.OPCUAClient.create({
    endpointMustExist: false
});
client.on("backoff", (retry, delay) =>
    console.log("still trying to connect to ", endpointUrl, ": retry =", retry, "next attempt in ", delay / 1000, "seconds")
);

let opcSession, opcSubscription;

async.series([

    // step 1 : connect to server
    function (callback) {
        client.connect(endpointUrl, function (err) {
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
        client.createSession(function (err, session) {
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

    // step 4 : read a variable with readVariableValue
    // function (callback) {
    //     opcSession.readVariableValue("ns=1;s=temperaturaAcquaIngresso", function (err, dataValue) {
    //         if (!err) {
    //             console.log("\nTemperatura Acqua in Ingresso = ", dataValue.toString());
    //         }
    //         callback(err);
    //     });
    // },

    // step 4' : read a variable with read
    function (callback) {
        const maxAge = 0;
        const nodeToRead = { nodeId: "ns=1;s=caloreDisperso", attributeId: opcua.AttributeIds.Value };
        opcSession.read(nodeToRead, maxAge, function (err, dataValue) {
            if (!err) {
                console.log("\nCalore Disperso = ", dataValue.toString());
            }
            callback(err);
        });
    },

    // step 5: install a subscription and install a monitored item for 10 seconds
    // Crea la subscription: 
    // DOMANDE:
    // 1. Dobbiamo creare una subscription per ogni variabile che vogliamo usare? (CREDO DI SI, per via di riga 110)
    // 2. Come monitoriamo in parallelo tutte queste variabili? Possiamo provare con Promise.all()? Oppure con async.parallel() visto che abbiamo già la libreria
    function (callback) {
        for (const object in nodes) {
            for (const node in nodes[object]) {
                opcSession.createSubscription2(subscriptionOptions, (err, subscription) => {
                    if (err) { return callback(err); }
                    //opcSubscription = subscription;
                    subscription.on("started", () => {
                        console.log("subscription started for 2 seconds - subscriptionId=", opcSubscription.subscriptionId);
                    }).on("keepalive", function () {
                        console.log("subscription keepalive");
                    }).on("terminated", function () {
                        console.log("terminated");
                    });

                    // Install monitored item
                    subscription.monitor({
                        nodeId: opcua.resolveNodeId(`ns=1;s=${node}`),
                        attributeId: opcua.AttributeIds.Value
                    },
                        {
                            samplingInterval: 500,
                            discardOldest: true,
                            queueSize: 10
                        },
                        opcua.TimestampsToReturn.Both
                    ).then((item) => {
                        console.log("-------------------------------------");

                        item.on("changed", function (dataValue) {
                            console.log(`Monitored item changed: ${nodes[object][node]} = `, dataValue.value.value);
                            //Aggiorna IoT Hub
                        });
                    });
                    //callback();
                });
            }
        }

    },
    // async function (callback) {
    //     // install monitored item
    //     const monitoredItem = await opcSubscription.monitor({
    //         nodeId: opcua.resolveNodeId("ns=1;s=potenzaElettrica"),
    //         attributeId: opcua.AttributeIds.Value
    //     },
    //         {
    //             samplingInterval: 100,
    //             discardOldest: true,
    //             queueSize: 10
    //         },
    //         opcua.TimestampsToReturn.Both
    //     );
    //     console.log("-------------------------------------");

    //     monitoredItem.on("changed", function (dataValue) {
    //         console.log("monitored item changed:  Potenza Elettrica = ", dataValue.value.value);
    //         //Aggiorna IoT Hub
    //     });
    // },
    // function (callback) {
    //     // wait a little bit : 30 seconds
    //     setTimeout(() => callback(), 10 * 3000);
    // },
    // // terminate subscription
    // function (callback) {
    //     opcSubscription.terminate(callback);;
    // },
    // // close session
    // function (callback) {
    //     opcSession.close(function (err) {
    //         if (err) {
    //             console.log("closing session failed ?");
    //         }
    //         callback();
    //     });
    // }

],
    function (err) {
        if (err) {
            console.log("Client Failure ", err);
        } else {
            console.log("Done!");
        }
        client.disconnect(function () { });
    });