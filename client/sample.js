const async = require('async');

// Funzione per inizializzare la connessione
function initializeConnection(callback) {
  // Simulazione di inizializzazione della connessione
  setTimeout(function() {
    console.log('Connessione inizializzata');
    callback(null, 'Connessione');
  }, 2000);
}

// Funzione per eseguire operazioni in parallelo
function executeParallelFunctions(callback) {
  // Funzioni da eseguire in parallelo
  const asyncFunctions = [
    function(callback) {
      setTimeout(function() {
        console.log('Prima funzione parallela');
        callback(null, 'Risultato 1');
      }, 1000);
    },
    function(callback) {
      setTimeout(function() {
        console.log('Seconda funzione parallela');
        callback(null, 'Risultato 2');
      }, 1500);
    }
  ];

  async.parallel(asyncFunctions, function(error, results) {
    if (error) {
      callback(error);
    } else {
      console.log('Risultati funzioni parallele:', results);
      callback(null, 'Operazioni parallele completate');
    }
  });
}

// Funzione per eseguire una serie di funzioni asincrone
async.series([
  initializeConnection,
  executeParallelFunctions,
  function(callback) {
    // Altre operazioni da eseguire in sequenza
    setTimeout(function() {
      console.log('Terza funzione in serie');
      callback(null, 'Risultato 3');
    }, 500);
  }
], function(error, results) {
  if (error) {
    console.error(error);
  } else {
    console.log('Risultati finali:', results);
  }
});
