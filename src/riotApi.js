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

  app.get(prefix = "/summoner/:puuid", async (req, res) => {
    const puuid = req.params.puuid;
    console.log("GET /riot-api/summoner/" + puuid);

    const summonerData = await getSummonerData(puuid)
      .then(response => response.data)
      .catch(error => {
        console.error("Error", error.response.data);
        res.statusMessage = error.response.data.status.message;
        res.status(error.response.status).send();
        return false;
      });
    if (!summonerData) {
      return;
    }
    res.json(summonerData);
  });

  // app.get(prefix + "/active-game/:puuid", async (req, res) => {
  //   const puuid = req.params.puuid;
  //   console.log("GET /riot-api/active-game/" + puuid);

  //   const activeGameData = await getActiveGameData(puuid)
  //     .then(response => response.data)
  //     .catch(error => {
  //       console.error("Error", error.response.data);
  //       res.statusMessage = error.response.data.status.message;
  //       res.status(error.response.status).send();
  //       return false;
  //     });
  //   if (!activeGameData) {
  //     return;
  //   }
  //   res.json(activeGameData);
  // });

  app.get(prefix + "/league/:summonerId", async (req, res) => {
    const summonerId = req.params.summonerId;
    console.log("GET /riot-api/league/" + summonerId);

    const leagueData = await getLeagueData(summonerId)
      .then(response => response.data)
      .catch(error => {
        console.error("Error", error.response.data);
        res.statusMessage = error.response.data.status.message;
        res.status(error.response.status).send();
        return false;
      });
    if (!leagueData) {
      return;
    }
    res.json(leagueData);
  });
}

export function getAccountData(gameName, tagLine) {
  return axios.get(process.env.RIOT_EUROPE_API_URL + `/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${process.env.RIOT_API_KEY}`);
}

export function getSummonerData(puuid) {
  return axios.get(process.env.RIOT_EW1_API_URL + `/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${process.env.RIOT_API_KEY}`);
}

export function getActiveGameData(puuid) {
  return axios.get(process.env.RIOT_EW1_API_URL + `/lol/spectator/v5/active-games/by-summoner/${puuid}?api_key=${process.env.RIOT_API_KEY}`);
}

export function getLeagueData(summonerId) {
  return axios.get(process.env.RIOT_EW1_API_URL + `/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${process.env.RIOT_API_KEY}`);
}