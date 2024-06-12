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

    const result = db.collection("visits").insertOne(visitor)
      .then(response => response)
      .catch(error => {
        console.error("Error", error);
        res.statusMessage = error;
        res.status(500).send();
        return false;
      });
    if (!result) {
      return;
    }
    res.json(result);
  });
}