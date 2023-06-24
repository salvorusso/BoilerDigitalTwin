cd ./simulatore
start node ./index.js
timeout /T 1 >nul

cd ../server
start node ./index.js
timeout /T 1 >nul

cd ../client
start node ./index.js
timeout /T 1 >nul

exit