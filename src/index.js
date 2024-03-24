// EXPRESS SETUP
import express from 'express';
import cors from 'cors';
import { registerDatabaseEndpoints } from './database.js';
import { registerRiotApiEndpoints } from './riotApi.js';
const app = express();
app.use(express.json());
app.use(cors());

registerDatabaseEndpoints(app);
registerRiotApiEndpoints(app);

// INITIALIZATION
const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});