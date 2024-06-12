// EXPRESS SETUP
import express from 'express';
import cors from 'cors';
import { registerGamesDatabaseEndpoints } from './gamesDatabase.js';
import { registerRiotApiEndpoints } from './riotApi.js';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { registerVisitorsDatabaseEndpoints } from './visitorsDatabase.js';
const app = express();
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'https://tfg-pau-guri.netlify.app'],
  optionsSuccessStatus: 200
}));

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}
const mongoClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

registerGamesDatabaseEndpoints(app, mongoClient);
registerVisitorsDatabaseEndpoints(app, mongoClient);
registerRiotApiEndpoints(app);

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