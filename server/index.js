const opcua = require("node-opcua");
const utils = require("./modules/address-space-utils")

const server = new opcua.OPCUAServer({
    port: 4334,
    resourcePath: "/UA/LM-32",
    buildInfo: {
        productName: "BensonBoilerOPCUA",
        buildNumber: "1",
        buildDate: new Date()
    }
});

function post_initialize() {
    console.log("Initializing...");
    utils.createObjectType(server);
    utils.instantiateDigitalTwin(server);
    server.start(function () {
        console.log("Server is now listening ... ( press CTRL+C to stop)");
        console.log("Port ", server.endpoints[0].port);
        const endpointUrl = server.endpoints[0].endpointDescriptions()[0].endpointUrl;
        console.log("Primary server endpoint url", endpointUrl);

    });
}
server.initialize(post_initialize);