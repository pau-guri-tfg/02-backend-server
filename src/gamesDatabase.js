import auth from './auth.js';

export function registerGamesDatabaseEndpoints(app, mongoClient) {
  const db = mongoClient.db(process.env.MONGODB_GAMES_DB);
  const prefix = '/games';

  // #region POSTS

  app.post(prefix + '/:gameId/players', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    const gameId = req.params.gameId;
    const players = req.body;
    console.log('POST /games/' + gameId + '/players');

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
    console.log('PATCH /games/' + gameId + '/players');

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
    const gamedata = req.body;
    console.log('POST /games/' + gameId + '/gamedata');

    // check if gamedata with this gameId already exists
    try {
      const gamedata = await db.collection('gamedata').findOne({ gameId });

      if (gamedata !== null) {
        console.log('Gamedata for game', gameId, 'already exist');
        res.status(409).send("Gamedata already exists for this game. Use PATCH to update.");
        return;
      }
    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }

    // insert gamedata
    const gamedataWithGameId = { ...gamedata, gameId };

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
    const gamedata = req.body;
    console.log('PATCH /games/' + gameId + '/gamedata');

    // update gamedata
    console.log('Received updated game data for game', gameId);
    db.collection('gamedata').updateOne({ gameId }, { $set: gamedata })
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
    console.log('PUT /games/' + gameId + '/events');

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
    console.log('GET /games/' + gameId + '/everything');

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
              gamedata: {
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
              events: { $arrayElemAt: ["$events", 0] },
              _id: 0
            }
          },
          {
            $sort: { "gamedata.gameStartTime": -1 }
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
        const gamedata = await db.collection('gamedata').findOne({ gameId });
        if (gamedata === null) {
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
        res.send({ gamedata, players, events });
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
    console.log('GET /games/' + gameId + '/players');

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
    console.log('GET /games/' + gameId + '/gamedata');

    try {
      if (gameId === 'all') {
        const gamedata = await db.collection('gamedata').find().toArray();
        if (gamedata.length === 0) {
          console.log('No gamedata found');
          res.status(404).send("No gamedata found");
          return;
        }
        res.send(gamedata);
      } else {
        const gamedata = await db.collection('gamedata').findOne({ gameId });

        if (gamedata === null) {
          console.log('Gamedata for game', gameId, 'not found');
          res.status(404).send("Gamedata not found for this game");
          return;
        }
        res.send(gamedata);
      }
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
    console.log('GET /games/' + gameId + '/events');

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
    console.log('GET /games-by-player/' + summonerId + '/everything');

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
            gamedata: {
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
            events: { $arrayElemAt: ["$events", 0] },
            _id: 0
          }
        },
        {
          $sort: { "gamedata.gameStartTime": -1 }
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

  app.get('/games-by-player/:summonerId/players', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    const summonerId = req.params.summonerId;
    console.log('GET /games-by-player/' + summonerId + '/players');

    try {
      const players = await db.collection('players').find({ summonerId }).toArray();
      if (players.length === 0) {
        console.log('Players with summoner ID', summonerId, 'not found');
        res.status(404).send("Player not found for this summoner ID");
        return;
      }
      res.send(players);
    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }
  });

  app.get('/games-by-champion/all/players', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    console.log('GET /games-by-champion/all/players');

    try {
      const games = await db.collection('players').aggregate([
        {
          $group: {
            _id: "$championName",
            count: { $sum: 1 },
            players: { $push: "$$ROOT" }
          }
        },
        {
          $project: {
            _id: 0,
            championName: "$_id",
            count: 1,
            players: 1
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $skip: req.query.skip ? parseInt(req.query.skip) : 0
        },
        {
          $limit: req.query.limit ? parseInt(req.query.limit) : 50
        },
      ]).toArray();
      if (games.length === 0) {
        console.log('No champions found');
        res.status(404).send("No champions found");
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

    console.log('GET /games/event-stream');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const collections = ['players', 'gamedata', 'events'];
    let changeStreams = [];

    const createChangeStream = (collection) => {
      const changeStream = db.collection(collection).watch([], { fullDocument: 'updateLookup' });
      changeStream.on('change', change => {
        if (change.operationType !== 'insert' && change.operationType !== 'update' && change.operationType !== 'replace') {
          return;
        }
        res.write(`event: ${collection}\n`);
        res.write(`data: ${JSON.stringify(change)}\n\n`);
      });

      changeStream.on('error', (error) => {
        console.error(`Error in change stream for ${collection}:`, error);
        // Retry creating the change stream after an error
        changeStream.close();
        setTimeout(() => {
          changeStreams = changeStreams.filter(cs => cs !== changeStream);
          changeStreams.push(createChangeStream(collection));
          console.log(`Retrying change stream for ${collection}`);
        }, 5000);
      });

      return changeStream;
    };

    try {
      collections.forEach(collection => {
        changeStreams.push(createChangeStream(collection));
      });

      console.log('New event stream started');

      req.on('close', () => {
        changeStreams.forEach(changeStream => changeStream.close());
        res.end();
      });

    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }
  });
  //#endregion
}