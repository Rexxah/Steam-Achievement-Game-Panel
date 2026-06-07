const STEAM_API_KEY = process.env.STEAM_API_KEY;

async function getPlayerSummaries(steamId) {
  if (!STEAM_API_KEY) {
    throw new Error("Brak STEAM_API_KEY w zmiennych środowiskowych.");
  }

  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Steam API zwróciło błąd: ${response.status}`);
  }

  const data = await response.json();
  const players = data?.response?.players;

  if (!players || players.length === 0) {
    return null;
  }

  return players[0];
}

module.exports = getPlayerSummaries;
