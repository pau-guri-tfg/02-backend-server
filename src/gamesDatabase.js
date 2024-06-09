import { MongoClient, ServerApiVersion } from 'mongodb';
import auth from './auth.js';
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

// games database is harcoded for now
const db = mongoClient.db(process.env.MONGODB_GAMES_DB);

const prefix = '/games';

export function registerDatabaseEndpoints(app) {

  // #region POSTS

  app.post(prefix + '/:gameId/players', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

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
        console.log("201 Created entries in 'players' collection");
        res.status(201).send();
      })
      .catch(e => {
        console.error(e);
        res.status(500).send(e);
      });
  });

  app.patch(prefix + '/:gameId/players', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    const gameId = req.params.gameId;
    const players = req.body;

    // update players
    console.log('Received updated players for game', gameId);

    let promises = [];
    players.forEach(player => {
      promises.push(db.collection('players').updateOne({ gameId, summonerName: player.summonerName }, { $set: player }));
    });

    Promise.all(promises)
      .then(() => {
        console.log("201 Updated entries in 'players' collection");
        res.status(201).send();
      })
      .catch(e => {
        console.error(e);
        res.status(500).send(e);
      });
  });

  app.post(prefix + '/:gameId/gamedata', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

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
        console.log("201 Created entry in 'gamedata' collection");
        res.status(201).send();
      })
      .catch(e => {
        console.error(e);
        res.status(500).send(e);
      });
  });

  app.patch(prefix + '/:gameId/gamedata', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    const gameId = req.params.gameId;
    const gameData = req.body;

    // update gamedata
    console.log('Received updated game data for game', gameId);
    db.collection('gamedata').updateOne({ gameId }, { $set: gameData })
      .then(() => {
        console.log("201 Updated entry in 'gamedata' collection");
        res.status(201).send();
      })
      .catch(e => {
        console.error(e);
        res.status(500).send(e);
      });
  });

  app.put(prefix + '/:gameId/events', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    const gameId = req.params.gameId;
    const events = req.body;

    // insert events (replace old events)
    const eventsWithGameId = { ...events, gameId };

    console.log('Received events for game', gameId);
    db.collection('events').replaceOne({ gameId }, eventsWithGameId, { upsert: true })
      .then(() => {
        console.log("201 Created or updated entry in 'events' collection");
        res.status(201).send();
      })
      .catch(e => {
        console.error(e);
        res.status(500).send(e);
      });
  });

  // #endregion

  // #region GETS

  app.get(prefix + '/:gameId/everything', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    const gameId = req.params.gameId;

    try {
      if (gameId === 'all') {
        const data = await db.collection('gamedata').aggregate([
          {
            $lookup: {
              from: 'players',
              localField: 'gameId',
              foreignField: 'gameId',
              as: 'players'
            }
          },
          {
            $lookup: {
              from: 'events',
              localField: 'gameId',
              foreignField: 'gameId',
              as: 'events'
            }
          },
          {
            $project: {
              gameData: {
                $let: {
                  vars: {
                    root: "$$ROOT",
                  },
                  in: {
                    $arrayToObject: {
                      $filter: {
                        input: { $objectToArray: "$$root" },
                        as: "root",
                        cond: { $not: { $in: ["$$root.k", ["players", "events"]] } }
                      }
                    }
                  }
                }
              },
              players: 1,
              events: 1,
              _id: 0
            }
          },
          {
            $skip: req.query.skip ? parseInt(req.query.skip) : 0
          },
          {
            $limit: req.query.limit ? parseInt(req.query.limit) : 20
          }
        ]).toArray();
        if (data.length === 0) {
          console.log('No games found');
          res.status(404).send("No games found");
          return;
        }
        res.send(data);
      } else {
        const gameData = await db.collection('gamedata').findOne({ gameId });
        if (gameData === null) {
          console.log('Gamedata for game', gameId, 'not found');
          res.status(404).send("Gamedata not found for this game");
          return;
        }
        const players = await db.collection('players').find({ gameId }).toArray();
        if (players.length === 0) {
          console.log('Players for game', gameId, 'not found');
          res.status(404).send("Players not found for this game");
          return;
        }
        const events = await db.collection('events').findOne({ gameId });
        if (events === null) {
          console.log('Events for game', gameId, 'not found');
          res.status(404).send("Events not found for this game");
          return;
        }
        res.send({ gameData, players, events });
      }
    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }
  });

  app.get(prefix + '/:gameId/players', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    const gameId = req.params.gameId;

    try {
      const players = await db.collection('players').find({ gameId }).toArray();
      if (players.length === 0) {
        console.log('Players for game', gameId, 'not found');
        res.status(404).send("Players not found for this game");
        return;
      }
      res.send(players);
    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }
  });
  app.get(prefix + '/:gameId/gamedata', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    const gameId = req.params.gameId;
    let gameData;
    try {
      gameData = await db.collection('gamedata').findOne({ gameId });

      if (gameData === null) {
        console.log('Gamedata for game', gameId, 'not found');
        res.status(404).send("Gamedata not found for this game");
        return;
      }
      res.send(gameData);
    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }
  });
  app.get(prefix + '/:gameId/events', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    const gameId = req.params.gameId;

    try {
      const events = await db.collection('events').findOne({ gameId });
      if (events === null) {
        console.log('Events for game', gameId, 'not found');
        res.status(404).send("Events not found for this game");
        return;
      }
      res.send(events);
    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }
  });

  app.get('/games-by-player/:summonerId/everything', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    const summonerId = req.params.summonerId;

    try {
      const players = await db.collection('players').find({ summonerId }).toArray();
      if (players.length === 0) {
        console.log('Players with summoner ID', summonerId, 'not found');
        res.status(404).send("Player not found for this summoner ID");
        return;
      }

      const games = await db.collection('gamedata').aggregate([
        {
          $match: {
            gameId: { $in: players.map(player => player.gameId) }
          }
        },
        {
          $lookup: {
            from: 'players',
            localField: 'gameId',
            foreignField: 'gameId',
            as: 'players'
          }
        },
        {
          $lookup: {
            from: 'events',
            localField: 'gameId',
            foreignField: 'gameId',
            as: 'events'
          }
        },
        {
          $project: {
            gameData: {
              $let: {
                vars: {
                  root: "$$ROOT",
                },
                in: {
                  $arrayToObject: {
                    $filter: {
                      input: { $objectToArray: "$$root" },
                      as: "root",
                      cond: { $not: { $in: ["$$root.k", ["players", "events"]] } }
                    }
                  }
                }
              }
            },
            players: 1,
            events: 1,
            _id: 0
          }
        },
        {
          $skip: req.query.skip ? parseInt(req.query.skip) : 0
        },
        {
          $limit: req.query.limit ? parseInt(req.query.limit) : 20
        }
      ]).toArray();
      if (games.length === 0) {
        console.log('No games found');
        res.status(404).send("No games found");
        return;
      }
      res.send(games);
    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }
  });

  //#endregion

  // #region SERVER-SENT EVENTS
  app.get(prefix + '/event-stream', (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const collections = ['players', 'gamedata', 'events'];
      let changeStreams = [];
      collections.forEach(collection => {
        const changeStream = db.collection(collection).watch([], { fullDocument: 'updateLookup' });
        changeStream.on('change', change => {
          if (change.operationType !== 'insert' && change.operationType !== 'update' && change.operationType !== 'replace') {
            return;
          }
          res.write(`event: ${collection}\n`);
          //res.write(`data: ${JSON.stringify(change.fullDocument)}\n\n`);
          res.write(`data: ${JSON.stringify(change)}\n\n`);
        });
        changeStreams.push(changeStream);
      });

      console.log('New event stream started');

      req.on('close', () => {
        changeStreams.forEach(changeStream => changeStream.close());
        res.end();
      });

    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    };
  });
  //#endregion
}