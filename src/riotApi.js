import axios from "axios";
const prefix = "/riot-api";

export function registerRiotApiEndpoints(app) {
  app.get(prefix + "/account/:gameName/:tagLine", async (req, res) => {
    const gameName = req.params.gameName;
    const tagLine = req.params.tagLine;
    console.log("GET /riot-api/account/" + gameName + "/" + tagLine);

    const playerData = await getAccountData(gameName, tagLine)
      .then(response => response.data)
      .catch(error => {
        console.error("Error", error.response.data);
        res.statusMessage = error.response.data.status.message;
        res.status(error.response.status).send();
        return false;
      });
    if (!playerData) {
      return;
    }
    res.json(playerData);
  });

  app.get(prefix + "/active-game/:puuid", async (req, res) => {
    const puuid = req.params.puuid;
    console.log("GET /riot-api/active-game/" + puuid);

    const activeGameData = await getActiveGameData(puuid)
      .then(response => response.data)
      .catch(error => {
        console.error("Error", error.response.data);
        res.statusMessage = error.response.data.status.message;
        res.status(error.response.status).send();
        return false;
      });
    if (!activeGameData) {
      return;
    }
    res.json(activeGameData);
  });
}

export function getAccountData(gameName, tagLine) {
  return axios.get(process.env.RIOT_EUROPE_API_URL + `/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${process.env.RIOT_API_KEY}`);
}

export function getActiveGameData(puuid) {
  return axios.get(process.env.RIOT_EW1_API_URL + `/lol/spectator/v5/active-games/by-summoner/${puuid}?api_key=${process.env.RIOT_API_KEY}`);
}