const STEAM_API_KEY = process.env.STEAM_API_KEY;

async function getOwnedGames(steamId) {
  if (!STEAM_API_KEY) {
    throw new Error("Brak STEAM_API_KEY w zmiennych środowiskowych.");
  }

  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Steam API zwróciło błąd: ${response.status}`);
  }

  const data = await response.json();
  return data?.response?.games || [];
}

module.exports = getOwnedGames;
