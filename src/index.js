// EXPRESS SETUP
import express from 'express';
import cors from 'cors';
import { registerDatabaseEndpoints } from './gamesDatabase.js';
import { registerRiotApiEndpoints } from './riotApi.js';
const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' }));

registerDatabaseEndpoints(app);
// ! registerRiotApiEndpoints(app); deprecated

// ping
app.get('/ping', (req, res) => {
  console.log(new Date().toLocaleTimeString() + ' - ping');
  res.send(new Date().toLocaleTimeString() + ' - pong');
});

// INITIALIZATION
const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});