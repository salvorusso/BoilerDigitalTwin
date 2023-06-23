/*global require,console,setTimeout */
const opcua = require("node-opcua");
const async = require("async");
require("dotenv").config()

// const endpointUrl = "opc.tcp://<hostname>:4334/UA/MyLittleServer";
//const endpointUrl = "opc.tcp://" + require("os").hostname() + ":4334/UA/LM-32";
const endpointUrl = process.env.SERVER_URL
const client = opcua.OPCUAClient.create({
    endpointMustExist: false
});
client.on("backoff", (retry, delay) =>
    console.log("still trying to connect to ", endpointUrl, ": retry =", retry, "next attempt in ", delay / 1000, "seconds")
);


let opcSession, opcSubscription;

async.series([

    // step 1 : connect to
    function (callback) {
        client.connect(endpointUrl, function (err) {
            if (err) {
                console.log(" cannot connect to endpoint :", endpointUrl);
            } else {
                console.log("connected !");
            }
            callback(err);
        });
    },

    // step 2 : createSession
    function (callback) {
        client.createSession(function (err, session) {
            if (err) {
                return callback(err);
            }
            opcSession = session;
            callback();
        });
    },

    // step 3 : browse
    function (callback) {
        opcSession.browse("RootFolder", function (err, browseResult) {
            if (!err) {
                console.log("Browsing rootfolder: ");
                for (let reference of browseResult.references) {
                    console.log(reference.browseName.toString(), reference.nodeId.toString());
                }
            }
            callback(err);
        });
    },

    // step 4 : read a variable with readVariableValue
    function (callback) {
        opcSession.readVariableValue("ns=1;s=temperaturaAcquaIngresso", function (err, dataValue) {
            if (!err) {
                console.log(" Temperatura Acqua in Ingresso = ", dataValue.toString());
            }
            callback(err);
        });
    },

    // step 4' : read a variable with read
    function (callback) {
        const maxAge = 0;
        const nodeToRead = { nodeId: "ns=1;s=caloreDisperso", attributeId: opcua.AttributeIds.Value };

        opcSession.read(nodeToRead, maxAge, function (err, dataValue) {
            if (!err) {
                console.log(" Calore Disperso = ", dataValue.toString());
            }
            callback(err);
        });
    },

    // step 5: install a subscription and install a monitored item for 10 seconds
    function (callback) {
        const subscriptionOptions = {
            maxNotificationsPerPublish: 1000,
            publishingEnabled: true,
            requestedLifetimeCount: 100,
            requestedMaxKeepAliveCount: 10,
            requestedPublishingInterval: 1000
        };
        opcSession.createSubscription2(subscriptionOptions, (err, subscription) => {

            if (err) { return callback(err); }

            opcSubscription = subscription;

            opcSubscription.on("started", () => {
                console.log("subscription started for 2 seconds - subscriptionId=", opcSubscription.subscriptionId);
            }).on("keepalive", function () {
                console.log("subscription keepalive");
            }).on("terminated", function () {
                console.log("terminated");
            });
            callback();
        });
    },
    async function (callback) {
        // install monitored item
        const monitoredItem = await opcSubscription.monitor({
            nodeId: opcua.resolveNodeId("ns=1;s=potenzaElettrica"),
            attributeId: opcua.AttributeIds.Value
        },
            {
                samplingInterval: 100,
                discardOldest: true,
                queueSize: 10
            },
            opcua.TimestampsToReturn.Both
        );
        console.log("-------------------------------------");

        monitoredItem.on("changed", function (dataValue) {
            console.log("monitored item changed:  Potenza Elettrica = ", dataValue.value.value);
            //Aggiorna IoT Hub
        });
    },
    function (callback) {
        // wait a little bit : 10 seconds
        setTimeout(() => callback(), 10 * 1000);
    },
    // terminate session
    function (callback) {
        opcSubscription.terminate(callback);;
    },
    // close session
    function (callback) {
        opcSession.close(function (err) {
            if (err) {
                console.log("closing session failed ?");
            }
            callback();
        });
    }

],
    function (err) {
        if (err) {
            console.log(" failure ", err);
        } else {
            console.log("done!");
        }
        client.disconnect(function () { });
    });