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

    // check if players with this gameId already exist
    try {
      const existingPlayers = await db.collection('players').find({ gameId }).toArray();

      if (existingPlayers.length > 0) {
        console.log('Players for game', gameId, 'already exist');
        res.status(409).send("Players already exist for this game. Use PATCH to update.");
        return;
      }
    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }

    // insert players
    const playersWithGameId = players.map(player => ({ ...player, gameId }));

    console.log('Received new players for game', gameId);
    db.collection('players').insertMany(playersWithGameId)
      .then(() => {
        console.log("201 Created");
        res.status(201).send();
      })
      .catch(e => {
        console.error(e);
        res.status(500).send(e);
      });
  });

  app.patch(prefix + '/games/:gameId/players', async (req, res) => {
    const gameId = req.params.gameId;
    const players = req.body;

    // update players
    console.log('Received updated players for game', gameId, players);

    let promises = [];
    players.forEach(player => {
      promises.push(db.collection('players').updateOne({ gameId, summonerName: player.summonerName }, { $set: player }));
    });

    Promise.all(promises)
      .then(() => {
        console.log("201 Created");
        res.status(201).send();
      })
      .catch(e => {
        console.error(e);
        res.status(500).send(e);
      });
  });

  app.post(prefix + '/games/:gameId/gamedata', async (req, res) => {
    const gameId = req.params.gameId;
    const gameData = req.body;

    // check if gamedata with this gameId already exists
    try {
      const gameData = await db.collection('gamedata').findOne({ gameId });

      if (gameData !== null) {
        console.log('Gamedata for game', gameId, 'already exist');
        res.status(409).send("Gamedata already exists for this game. Use PATCH to update.");
        return;
      }
    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }

    // insert gamedata
    const gamedataWithGameId = { ...gameData, gameId };

    console.log('Received new gamedata for game', gameId);
    db.collection('gamedata').insertOne(gamedataWithGameId)
      .then(() => {
        console.log("201 Created");
        res.status(201).send();
      })
      .catch(e => {
        console.error(e);
        res.status(500).send(e);
      });
  });

  app.patch(prefix + '/games/:gameId/gamedata', async (req, res) => {
    const gameId = req.params.gameId;
    const gameData = req.body;

    // update gamedata
    console.log('Received updated game data for game', gameId, gameData);
    db.collection('gamedata').updateOne({ gameId }, { $set: gameData })
      .then(() => {
        console.log("201 Created");
        res.status(201).send();
      })
      .catch(e => {
        console.error(e);
        res.status(500).send(e);
      });
  });

  app.put(prefix + '/games/:gameId/events', async (req, res) => {
    const gameId = req.params.gameId;
    const events = req.body;

    // insert events (replace old events)
    const eventsWithGameId = { ...events, gameId };

    console.log('Received events for game', gameId, events);
    db.collection('events').replaceOne({ gameId }, eventsWithGameId, { upsert: true })
      .then(() => {
        console.log("201 Created");
        res.status(201).send();
      })
      .catch(e => {
        console.error(e);
        res.status(500).send(e);
      });
  });
}