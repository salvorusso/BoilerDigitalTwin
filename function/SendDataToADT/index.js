const { DefaultAzureCredential } = require("@azure/identity");
const { DigitalTwinsClient } = require("@azure/digital-twins-core");

module.exports = async function (context, eventGridEvent) {
    context.log(typeof eventGridEvent);
    context.log(eventGridEvent);

    const url = "https://Sample-DT.api.weu.digitaltwins.azure.net";
    const credential = new DefaultAzureCredential();
    const serviceClient = new DigitalTwinsClient(url, credential);

    var message = JSON.stringify(eventGridEvent.data);
    message = JSON.parse(message);

    //Il deviceId deve coincidere con l'id del digital twin
    var deviceId = message["systemProperties"]["iothub-connection-device-id"].toString();
    var path = message.body.path
    var value = message.body.value

    const twinPatch = {
        op: "replace",
        path: path,
        value: value
    };

    await serviceClient.updateDigitalTwin(deviceId, [twinPatch]);
    console.log(`Updated Digital Twin:`, `Path:`, path, `value`, value);
};