const { DefaultAzureCredential } = require("@azure/identity");
const { DigitalTwinsClient } = require("@azure/digital-twins-core");
const { inspect } = require("util");


async function sendTelemetry(id, path, value) {
    const url = "https://Sample-DT.api.weu.digitaltwins.azure.net";
    const credential = new DefaultAzureCredential();
    const serviceClient = new DigitalTwinsClient(url, credential);

    const twinPatch = {
        op: "replace",
        path: path,
        value: value
        };

    const updatedTwin = await serviceClient.updateDigitalTwin(id, [twinPatch]);
    //console.log(`Updated Digital Twin:`, inspect(updatedTwin));
}

module.exports = {
    sendTelemetry
}