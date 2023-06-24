/*global require,console,setTimeout */
const opcua = require("node-opcua");
const async = require("async");
require("dotenv").config()
const nodes = require('../assets/config/addressSpace.json');
const iot = require("./modules/iothub")

const subscriptionOptions = {
    maxNotificationsPerPublish: 1000,
    publishingEnabled: true,
    requestedLifetimeCount: 100,
    requestedMaxKeepAliveCount: 10,
    requestedPublishingInterval: 1000
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
clients["Boiler"] = iot.createIotHubClient(process.env.BOILER_KEY);
clients["GeneratoreElettrico"] = iot.createIotHubClient(process.env.GENERATOR_KEY);

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
        for (const object in nodes) {
            for (const node in nodes[object]) {
                opcSession.createSubscription2(subscriptionOptions, (err, subscription) => {
                    if (err) { return callback(err); }

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
                        item.on("changed", function (dataValue) {
                            console.log(`Monitored item changed: ${nodes[object][node]} = `, dataValue.value.value);
                            //Aggiorna IoT Hub
                            path = "/" + nodes[object][node].replaceAll(" ", "")
                            iot.sendEventToIoTHub(clients[object], path, dataValue.value.value)
                            
                        });
                    });

                });
            }
        }

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