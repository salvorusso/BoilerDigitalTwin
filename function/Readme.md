## Agganciare IoT Hub al tuo Digital Twin

Ti servirà una azure function, e dovrai configurarla con i seguenti comandi:


```ps1
az functionapp identity assign --resource-group <your-resource-group> --name <your-function-app-name>
```

Questo restituisce un id da utilizzare del comando successivo

```ps1
az dt role-assignment create --dt-name <your-Azure-Digital-Twins-instance> --assignee "<principal-ID>" --role "Azure Digital Twins Data Owner"
```

Infine, crea il topic per inviare i messaggi da IoT Hub alla tua Azure Function

```ps1
az eventgrid event-subscription create --name <name-for-hub-event-subscription> --event-delivery-schema eventgridschema --source-resource-id /subscriptions/<your-subscription-ID>/resourceGroups/<your-resource-group>/providers/Microsoft.Devices/IotHubs/<your-IoT-hub> --included-event-types Microsoft.Devices.DeviceTelemetry --endpoint-type azurefunction --endpoint /subscriptions/<your-subscription-ID>/resourceGroups/<your-resource-group>/providers/Microsoft.Web/sites/<your-function-app>/functions/<your-function-name>
```


### Riferimenti
- https://learn.microsoft.com/en-us/azure/digital-twins/how-to-ingest-iot-hub-data
- https://learn.microsoft.com/en-us/azure/digital-twins/tutorial-end-to-end
