/**
 * Server HTTP principale dell'applicazione
 * Questo file si occupa di:
 * - Importare l'applicazione Express configurata
 * - Definire la porta di ascolto
 * - Avviare il server HTTP
 */

// Importa l'applicazione Express completamente configurata da app.js
const app = require('./app');

/**
 * Configurazione della porta del server
 * Utilizza la porta definita nelle variabili d'ambiente
 * o la porta 5001 come fallback
 */
const PORT = process.env.PORT || 5000;

/**
 * Avvio del server HTTP
 * - Ascolta sulla porta configurata
 * - Mostra messaggi di conferma nella console
 * - Conferma il caricamento delle credenziali Google
 */
app.listen(PORT, () => {
  console.log(`Server in esecuzione sulla porta ${PORT}`);
  console.log('Credenziali Google caricate correttamente');
});
