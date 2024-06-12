import auth from './auth.js';

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
        console.log("201 Created entries in 'players' collection");
        res.status(201).send();
      })
      .catch(e => {
        console.error(e);
        res.status(500).send(e);
      });
  });
}