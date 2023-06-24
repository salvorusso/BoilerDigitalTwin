/*global require,setInterval,console */
const opcua = require("node-opcua");
const service = require("./modules/service")

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
    service.constructAddressSpace(server);
    server.start(function () {
        console.log("Server is now listening ... ( press CTRL+C to stop)");
        console.log("Port ", server.endpoints[0].port);
        const endpointUrl = server.endpoints[0].endpointDescriptions()[0].endpointUrl;
        console.log("Primary server endpoint url", endpointUrl);

        //Una alternativa rispetto alla versione attuale è quella di aggiornare "in background" i valori delle variabili, chiamando le API esposte dal simulatore
        // Aggiorna i valori in batch
        // setInterval(() => {
        //     service.updateVariables(server)
        // }, 1000)
    });
}
server.initialize(post_initialize);