import { MongoClient, ServerApiVersion } from 'mongodb';
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
mongoClient.on('commandStarted', event => {
  console.log(event);
});

// games database is harcoded for now
const db = mongoClient.db(process.env.MONGODB_GAMES_DB);

const prefix = '/database';

export function registerDatabaseEndpoints(app) {
  app.post(prefix + '/games/:gameId/players', async (req, res) => {
    const gameId = req.params.gameId;
    const players = req.body;
    console.log('Received new players for game', gameId, players);
  });

  app.patch(prefix + '/games/:gameId/players', async (req, res) => {
    const gameId = req.params.gameId;
    const players = req.body;
    console.log('Received updated players for game', gameId, players);
  });

  app.post(prefix + '/games/:gameId/gamedata', async (req, res) => {
    const gameId = req.params.gameId;
    const gameData = req.body;
    console.log('Received new game data for game', gameId, gameData);
  });

  app.patch(prefix + '/games/:gameId/gamedata', async (req, res) => {
    const gameId = req.params.gameId;
    const gameData = req.body;
    console.log('Received updated game data for game', gameId, gameData);
  });

  app.put(prefix + '/games/:gameId/events', async (req, res) => {
    const gameId = req.params.gameId;
    const events = req.body;
    console.log('Received events for game', gameId, events);
  });
}