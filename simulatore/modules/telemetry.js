const { DefaultAzureCredential } = require("@azure/identity");
const { DigitalTwinsClient } = require("@azure/digital-twins-core");


async function updateData(id, path, value) {
    const url = process.env.DT_URL;
    const credential = new DefaultAzureCredential();
    const serviceClient = new DigitalTwinsClient(url, credential);

    const twinPatch = {
        op: "replace",
        path: path,
        value: value
        };

    await serviceClient.updateDigitalTwin(id, [twinPatch]);
    console.log(`Updated Digital Twin:`, `Path:`, path, `value`, value);
}

module.exports = {
    updateData
}