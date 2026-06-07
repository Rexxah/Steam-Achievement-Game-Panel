const STEAM_API_KEY = process.env.STEAM_API_KEY;

/**
 * Pobiera schemat osiągnięć gry ze Steam.
 * @param {string|number} appId - Steam App ID gry
 * @returns {Promise<Array>} - Tablica osiągnięć z polami: api_name, display_name, description, icon_url, icon_url_gray
 */
async function getSchemaForGame(appId) {
  if (!STEAM_API_KEY) {
    throw new Error("Brak STEAM_API_KEY w zmiennych środowiskowych.");
  }

  const url = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_API_KEY}&appid=${appId}&l=polish`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Steam API zwróciło błąd: ${response.status}`);
  }

  const data = await response.json();
  const achievements = data?.game?.availableGameStats?.achievements || [];

  return achievements.map((ach) => ({
    api_name: ach.name,
    display_name: ach.displayName || null,
    description: ach.description || null,
    icon_url: ach.icon || null,
    icon_url_gray: ach.icongray || null,
  }));
}

module.exports = getSchemaForGame;
