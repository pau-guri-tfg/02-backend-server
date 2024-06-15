import moment from 'moment';
import auth from './auth.js';

// import { MongoClient, ServerApiVersion } from 'mongodb';
// export function registerVisitorsDatabaseEndpoints(app) {
//   const mongoClient = new MongoClient(uri, {
//     serverApi: {
//       version: ServerApiVersion.v1,
//       strict: true,
//       deprecationErrors: true,
//     }
//   });

export function registerVisitorsDatabaseEndpoints(app, mongoClient) {
  const db = mongoClient.db(process.env.MONGODB_VISITORS_DB);
  const prefix = '/visitors';

  app.post(prefix + '/visit', (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    console.log("POST /visitors/visit/");
    const visitor = req.body;

    db.collection("visits").insertOne(visitor)
      .then(() => {
        console.log("201 Created entry in visits collection");
        res.status(201).send();
      })
      .catch(e => {
        console.error(e);
        res.status(500).send(e);
      });
  });

  app.get(prefix + '/:screen', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    const screen = req.params.screen;
    const timeframe = req.query.timeframe;
    const toTimestamp = req.query.toTimestamp;
    if (!timeframe || !toTimestamp || !screen) {
      res.status(400).send('Missing query parameters');
      return;
    }
    console.log("GET /visitors/" + screen);

    try {
      const data = await fetchVisitsByTime(db, screen === "everything" ? null : screen, toTimestamp, timeframe, req.query.limit, req.query.offset);
      if (data.length === 0) {
        console.log('No visits found');
        res.status(404).send("No visits found");
        return;
      }
      res.send(data);
    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }
  });

  app.get(prefix + '/live/:gameId', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    const gameId = req.params.gameId;
    console.log("GET /visitors/live/" + gameId);

    try {
      const data = await fetchLiveVisitsByGame(db, gameId === "all" ? null : gameId, req.query.limit, req.query.offset);
      if (data.length === 0) {
        console.log('No live visits found');
        res.status(404).send("No live visits found");
        return;
      }
      res.send(data);
    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }
  });

  app.get(prefix + '/summoner/:gameName/:tagLine', async (req, res) => {
    if (!auth(req)) {
      res.status(401).send('Unauthorized');
      return;
    }

    const gameName = req.params.gameName;
    const tagLine = req.params.tagLine;
    console.log("GET /visitors/summoner/" + gameName + "/" + tagLine);

    try {
      const data = await fetchSummonerVisitsBySummoner(db, gameName === "all" ? null : gameName, tagLine, req.query.limit, req.query.offset);
      if (data.length === 0) {
        console.log('No summoner visits found');
        res.status(404).send("No summoner visits found");
        return;
      }
      res.send(data);
    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }
  });
}

export async function fetchVisitsByTime(db, screen, toTimestamp, timeframe, limit, offset) {
  const fromTimestamp = moment(parseInt(toTimestamp)).subtract(1, timeframe).valueOf();

  let groupBy;
  if (timeframe === 'month') {
    groupBy = {
      year: { $year: { date: { $toDate: "$timestamp" }, timezone: "$timezone" } },
      month: { $month: { date: { $toDate: "$timestamp" }, timezone: "$timezone" } },
      day: { $dayOfMonth: { date: { $toDate: "$timestamp" }, timezone: "$timezone" } }
    }
  } else if (timeframe === 'year') {
    groupBy = {
      year: { $year: { date: { $toDate: "$timestamp" }, timezone: "$timezone" } },
      month: { $month: { date: { $toDate: "$timestamp" }, timezone: "$timezone" } },
    }
  }

  let match = {
    timestamp: {
      $gte: fromTimestamp,
      $lt: parseInt(toTimestamp)
    }
  };
  if (screen) {
    match.screen = screen;
  }

  return db.collection("visits").aggregate([
    { $match: match },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: groupBy,
        count: {
          $sum: 1
        }
      }
    },
    {
      $project: {
        _id: 0,
        timestamp: {
          $dateFromParts: {
            year: "$_id.year",
            month: { $ifNull: ["$_id.month", 1] },
            day: { $ifNull: ["$_id.day", 1] }
          }
        },
        count: 1
      }
    },
    {
      $project: {
        timestamp: { $toLong: "$timestamp" },
        count: 1
      }
    },
    { $skip: offset ?? 0 },
    { $limit: limit ?? 100 }
  ]).toArray();
}

export async function fetchLiveVisitsByGame(db, gameId, limit, offset) {
  if (!gameId) {
    // fetch all live visits, grouped by game
    return db.collection("visits").aggregate([
      { $match: { screen: "live" } },
      { $sort: { timestamp: 1 } },
      {
        $group: {
          _id: "$gameId",
          timestamps: {
            $push: "$timestamp"
          }
        }
      },
      {
        $project: {
          _id: 0,
          gameId: "$_id",
          timestamps: 1
        }
      },
      { $skip: offset ? parseInt(offset) : 0 },
      { $limit: limit ? parseInt(limit) : 100 }
    ]).toArray();
  }

  // fetch live visits for a specific game
  return db.collection("visits")
    .find({ $and: [{ gameId }, { screen: "live" }] })
    .project({ _id: 0, timestamp: 1, screen: 1, gameId: 1 })
    .sort({ timestamp: 1 })
    .skip(offset ? parseInt(offset) : 0)
    .limit(limit ? parseInt(limit) : 100)
    .toArray();
}

export async function fetchSummonerVisitsBySummoner(db, gameName, tagLine, limit, offset) {
  if (!gameName || !tagLine) {
    // fetch all summoner visits, grouped by summoner
    return db.collection("visits").aggregate([
      { $match: { screen: "summoner" } },
      { $sort: { timestamp: 1 } },
      {
        $group: {
          _id: {
            riotIdGameName: "$riotIdGameName",
            riotIdTagLine: "$riotIdTagLine"
          },
          timestamps: {
            $push: "$timestamp"
          }
        }
      },
      {
        $project: {
          _id: 0,
          riotIdGameName: "$_id.riotIdGameName",
          riotIdTagLine: "$_id.riotIdTagLine",
          timestamps: 1
        }
      },
      { $skip: offset ? parseInt(offset) : 0 },
      { $limit: limit ? parseInt(limit) : 100 }
    ]).toArray();
  }

  return db.collection("visits")
    .find({ $and: [{ riotIdGameName: gameName }, { riotIdTagLine: tagLine }, { screen: "live" }] })
    .project({ _id: 0, timestamp: 1, screen: 1, riotIdGameName: 1, riotIdTagLine: 1 })
    .sort({ timestamp: 1 })
    .skip(offset ? parseInt(offset) : 0)
    .limit(limit ? parseInt(limit) : 100)
    .toArray();
}