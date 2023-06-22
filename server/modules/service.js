const opcua = require("node-opcua");
const http = require('http');

function getValue(path) {
    http.get(`http://localhost:3000${path}`, (res) => {
        if (res.statusCode !== 200) {
          console.error(`Did not get an OK from the server. Code: ${res.statusCode}`);
          res.resume();
          return;
        }
      
        let data = '';
      
        res.on('data', (chunk) => {
            data += chunk;
        });
      
        res.on('close', () => {
          console.log('Retrieved all data');
          console.log(JSON.parse(data));
          console.log("fuck ", JSON.parse(data).caloreDisperso)
          return JSON.parse(data).caloreDisperso
        });
      });
}

function generateVariable(object, browseName, value) {
return {
    componentOf: object,
    browseName: browseName,
    dataType: "Double",
    value: {
        get: function () {
            return new opcua.Variant({dataType: opcua.DataType.Double, value: getValue(value) });
        }
    }   
}
}

function construct_my_address_space(server) {

    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();

    //declare a new object
    const device = namespace.addObject({
        organizedBy: addressSpace.rootFolder.objects,
        browseName: "MyDevice"
    });

    const boiler = namespace.addObject({
        organizedBy: addressSpace.rootFolder.objects,
        browseName: "Boiler"
    });

    let temperaturaAcqua = 25;
    namespace.addVariable({
        componentOf: boiler,
        browseName: "Temperatura Acqua in Ingresso",
        dataType: "Double",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Double, value: temperaturaAcqua });
            }
        }
    })

    let caloreDisperso = 20000;
    namespace.addVariable(generateVariable(boiler, "Calore Disperso", "/CaloreDisperso"))
    // namespace.addVariable({
    //     componentOf: boiler,
    //     browseName: "Calore Disperso",
    //     dataType: "Double",
    //     value: {
    //         get: function () {
    //             return new opcua.Variant({dataType: opcua.DataType.Double, value: caloreDisperso });
    //         }
    //     }        
    // })

    // add some variables
    // add a variable named MyVariable1 to the newly created folder "MyDevice"
    let variable1 = 1;
    
    // emulate variable1 changing every 500 ms
    setInterval(function(){  variable1+=1; }, 500);
    
    namespace.addVariable({
        componentOf: device,
        browseName: "MyVariable1",
        dataType: "Double",
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Double, value: variable1 });
            }
        }
    });
    
    // add a variable named MyVariable2 to the newly created folder "MyDevice"
    let variable2 = 10.0;
    
    namespace.addVariable({
    
        componentOf: device,
    
        nodeId: "ns=1;b=1020FFAA", // some opaque NodeId in namespace 4
    
        browseName: "MyVariable2",
    
        dataType: "Double",    
    
        value: {
            get: function () {
                return new opcua.Variant({dataType: opcua.DataType.Double, value: variable2 });
            },
            set: function (variant) {
                variable2 = parseFloat(variant.value);
                return opcua.StatusCodes.Good;
            }
        }
    });
    const os = require("os");
    /**
     * returns the percentage of free memory on the running machine
     * @return {double}
     */
    function available_memory() {
        // var value = process.memoryUsage().heapUsed / 1000000;
        const percentageMemUsed = os.freemem() / os.totalmem() * 100.0;
        return percentageMemUsed;
    }
    namespace.addVariable({
    
        componentOf: device,
    
        nodeId: "s=free_memory", // a string nodeID
        browseName: "FreeMemory",
        dataType: "Double",    
        value: {
            get: function () {return new opcua.Variant({dataType: opcua.DataType.Double, value: available_memory() });}
        }
    });
}

module.exports = {
    construct_my_address_space
}