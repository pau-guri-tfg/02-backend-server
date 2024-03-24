const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

// API ROUTES


const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});