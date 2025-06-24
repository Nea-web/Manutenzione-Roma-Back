# NEA Backend

Backend per l'applicazione NEA (Nea Event Agency), un sistema completo per la gestione di eventi e servizi.

### Tecnologie Utilizzate
- **Node.js & Express**: Framework per il server
- **MongoDB**: Database NoSQL per la persistenza dei dati
- **JWT**: Autenticazione e gestione delle sessioni
- **Google OAuth**: Autenticazione tramite Google
- **Cloudinary**: Gestione e storage delle immagini
- **Nodemailer**: Sistema di email transazionali
- **CORS**: Gestione delle richieste cross-origin

### Funzionalità Principali
- Autenticazione utenti (locale e Google OAuth)
- Gestione categorie e servizi per eventi
- Sistema di prenotazioni e appuntamenti
- Upload e gestione immagini tramite Cloudinary
- Sistema di email per notifiche e comunicazioni
- API RESTful per la gestione dei contenuti

## Sviluppo Locale

### Prerequisiti
- Node.js (versione 14 o superiore)
- npm (incluso con Node.js)
- MongoDB installato localmente o un database MongoDB Atlas
- Account Cloudinary per la gestione delle immagini
- Account Google Cloud Platform per OAuth

### Installazione

1. Clona il repository
```bash
git clone <repository-url>
cd backend
```

2. Installa le dipendenze
```bash
npm install
```

3. Crea un file `.env` nella root del progetto con le seguenti variabili:
```
PORT=5000
NODE_ENV=development
MONGODB_URI=your_local_or_atlas_mongodb_uri
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=24h
COOKIE_SECRET=your_cookie_secret
COOKIE_EXPIRE=24
CLOUDINARY_NAME=your_cloudinary_name
API_KEY=your_cloudinary_api_key
API_SECRET=your_cloudinary_api_secret
CLOUDINARY_URL=your_cloudinary_url
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_gmail
SMTP_PASS=your_app_specific_password
SMTP_FROM=Your Name <your_gmail>
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

4. Avvia il server in modalità sviluppo
```bash
npm run dev
```

Il server sarà disponibile all'indirizzo `http://localhost:5000`

### Script Disponibili

```bash
npm run dev      # Avvia il server in modalità sviluppo con nodemon
npm start        # Avvia il server in modalità produzione
npm test         # Esegue i test
```

### API Endpoints

#### Autenticazione (`/api/auth`)
- `POST /register`: Registrazione nuovo utente
- `POST /login`: Login utente
- `GET /google`: Autenticazione con Google
- `GET /logout`: Logout utente

#### Categorie (`/api/categories`)
- `GET /`: Lista tutte le categorie
- `POST /`: Crea nuova categoria
- `PUT /:id`: Aggiorna categoria esistente
- `DELETE /:id`: Elimina categoria

#### Servizi (`/api/services`)
- `GET /`: Lista tutti i servizi
- `POST /`: Crea nuovo servizio
- `PUT /:id`: Aggiorna servizio
- `DELETE /:id`: Elimina servizio

#### Appuntamenti (`/api/appointments`)
- `GET /`: Lista appuntamenti utente
- `POST /`: Crea nuovo appuntamento
- `PUT /:id`: Aggiorna appuntamento
- `DELETE /:id`: Cancella appuntamento

#### Post e Contenuti (`/api/posts`)
- `GET /`: Lista tutti i post
- `POST /`: Crea nuovo post
- `PUT /:id`: Aggiorna post
- `DELETE /:id`: Elimina post

#### Upload (`/api/upload`)
- `POST /`: Upload immagini su Cloudinary

# Deploy Backend su Render.com

Questa guida fornisce i passaggi necessari per deployare il backend su Render.com.

## Prerequisiti

- Un account su [Render.com](https://render.com)
- Un account MongoDB Atlas per il database
- Un account Cloudinary per la gestione dei file multimediali

## Passaggi per il Deploy

1. Accedi al tuo account Render.com
2. Clicca su "New +" e seleziona "Web Service"
3. Connetti il tuo repository GitHub
4. Configura il servizio:
   - **Name**: Scegli un nome per il tuo servizio
   - **Environment**: Node
   - **Region**: Scegli la regione più vicina a te
   - **Branch**: main (o la tua branch principale)
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`

## Environment Variables

Configura le seguenti variabili d'ambiente nel pannello "Environment" di Render:

```
PORT=10000
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=your_callback_url
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=24h
COOKIE_SECRET=your_cookie_secret
COOKIE_EXPIRE=24
CLOUDINARY_NAME=your_cloudinary_name
API_KEY=your_cloudinary_api_key
API_SECRET=your_cloudinary_api_secret
CLOUDINARY_URL=your_cloudinary_url
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_email
SMTP_PASS=your_smtp_password
SMTP_FROM=your_smtp_from_name
CORS_ORIGIN=your_frontend_url
FRONTEND_URL=your_frontend_url
```

### Descrizione delle Variabili

- `PORT`: La porta su cui il server ascolterà (Render gestirà automaticamente il port forwarding)
- `NODE_ENV`: Ambiente di esecuzione (production per il deploy)
- `MONGODB_URI`: URI di connessione al database MongoDB Atlas
- `GOOGLE_CLIENT_ID`: ID Client per l'autenticazione Google OAuth
- `GOOGLE_CLIENT_SECRET`: Secret Client per l'autenticazione Google OAuth
- `GOOGLE_CALLBACK_URL`: URL di callback per l'autenticazione Google OAuth
- `JWT_SECRET`: Chiave segreta per la generazione dei token JWT
- `JWT_EXPIRE`: Tempo di scadenza dei token JWT
- `COOKIE_SECRET`: Chiave segreta per la firma dei cookie
- `COOKIE_EXPIRE`: Tempo di scadenza dei cookie in ore
- `CLOUDINARY_NAME`: Nome del cloud Cloudinary
- `API_KEY`: API Key di Cloudinary
- `API_SECRET`: API Secret di Cloudinary
- `CLOUDINARY_URL`: URL completo di Cloudinary
- `SMTP_HOST`: Host del server SMTP per l'invio delle email
- `SMTP_PORT`: Porta del server SMTP
- `SMTP_SECURE`: Utilizzo di connessione sicura per SMTP
- `SMTP_USER`: Email utente per l'autenticazione SMTP
- `SMTP_PASS`: Password per l'autenticazione SMTP
- `SMTP_FROM`: Nome e indirizzo del mittente delle email
- `CORS_ORIGIN`: URL del frontend per le policy CORS
- `FRONTEND_URL`: URL del frontend dell'applicazione

## Configurazione Google OAuth

1. Vai alla [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuovo progetto o seleziona uno esistente
3. Abilita le API di Google+ e configura la schermata di consenso OAuth
4. Crea le credenziali OAuth 2.0:
   - Tipo: Applicazione Web
   - Origini JavaScript autorizzate: URL del tuo frontend
   - URI di reindirizzamento autorizzati: URL del tuo backend + `/api/auth/google/callback`
5. Copia il Client ID e Client Secret nelle variabili d'ambiente di Render
6. **Importante**: Dopo il deploy, aggiorna l'URI di reindirizzamento in Google Cloud Console con l'URL di Render (es: `https://tuo-servizio.onrender.com/api/auth/google/callback`)
7. Aggiorna anche la variabile `GOOGLE_CALLBACK_URL` in Render con il nuovo URL

## Configurazione SMTP (Gmail)

1. Accedi al tuo account Gmail
2. Vai alle impostazioni di sicurezza dell'account Google
3. Abilita la verifica in due passaggi se non è già attiva
4. Genera una "Password per le app":
   - Seleziona "App" e scegli "Altra"
   - Dai un nome all'app (es. "NEA Backend")
   - Usa la password generata come `SMTP_PASS`
5. Configura le variabili SMTP in Render con le credenziali Gmail

## Configurazione Database

1. Crea un nuovo cluster su MongoDB Atlas
2. Configura il Network Access per permettere connessioni da qualsiasi IP (0.0.0.0/0)
3. Crea un utente database con le appropriate permissioni
4. Copia l'URI di connessione e inseriscilo nelle variabili d'ambiente di Render

## Configurazione Cloudinary

1. Accedi al tuo account Cloudinary
2. Vai nel Dashboard
3. Copia le credenziali (Cloud Name, API Key, API Secret)
4. Inserisci questi valori nelle variabili d'ambiente di Render

## Deploy

1. Clicca su "Create Web Service"
2. Render inizierà automaticamente il processo di deploy
3. Il primo deploy potrebbe richiedere alcuni minuti
4. Una volta completato, il servizio sarà accessibile all'URL fornito da Render

## Monitoraggio

- Puoi monitorare i log del servizio dalla dashboard di Render
- Controlla la sezione "Logs" per debugging
- Monitora l'utilizzo delle risorse nella sezione "Metrics"

## Troubleshooting

Se incontri problemi durante il deploy:

1. Verifica che tutte le variabili d'ambiente siano configurate correttamente
2. Controlla i log per eventuali errori
3. Assicurati che il database sia accessibile dall'IP del servizio Render
4. Verifica che le credenziali Cloudinary siano corrette

## Note Aggiuntive

- Il servizio si riavvierà automaticamente in caso di crash
- Render fornisce SSL/HTTPS automaticamente
- Il servizio viene scalato automaticamente in base al carico
- Dopo il deploy del frontend su Netlify, aggiorna le seguenti variabili in Render:
  - `CORS_ORIGIN`: URL del frontend su Netlify (es: `https://tua-app.netlify.app`)
  - `FRONTEND_URL`: Lo stesso URL del frontend su Netlify
