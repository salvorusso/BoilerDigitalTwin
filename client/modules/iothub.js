'use strict';
const protocol = require('azure-iot-device-mqtt').Mqtt;
const client = require('azure-iot-device').Client;
var message = require('azure-iot-device').Message;
require("dotenv").config()

var createIotHubClient = function createIotHubClient(connectioString) {
    return client.fromConnectionString(connectioString, protocol)
}

var sendEventToIoTHub = function sendEventToIoTHub(client, path, value) {
    client.open((err) => {
        connectCallback(err, client, path, value)
    })
}

var connectCallback = function (err, client, path, value) {
    if (err) {
        console.log('Could not connect: ' + err);
    } else {
        //console.log('Client connected');
        //console.log("Path: ", path, " Value:", value)
        var payload = {
            path: path,
            value: value
        }
        var msg = new message(JSON.stringify(payload));
        msg.contentType = "application/json";
        msg.contentEncoding = "utf-8";

        client.sendEvent(msg).then((enqueued) => {
            //console.log(enqueued)
            client.close()
        }).catch((err) => {
            console.error(err)
            client.close()
        })
    }
};

module.exports = {
    createIotHubClient: createIotHubClient,
    sendEventToIoTHub: sendEventToIoTHub
}