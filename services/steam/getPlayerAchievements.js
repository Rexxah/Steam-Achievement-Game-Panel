const STEAM_API_KEY = process.env.STEAM_API_KEY;

/**
 * Pobiera stan osiągnięć gracza dla danej gry.
 * @param {string} steamId - Steam ID użytkownika
 * @param {string|number} appId - Steam App ID gry
 * @returns {Promise<Array>} - Tablica osiągnięć z polami: api_name, is_unlocked, unlock_time
 *                            lub null jeśli gra nie posiada osiągnięć / brak dostępu
 */
async function getPlayerAchievements(steamId, appId) {
  if (!STEAM_API_KEY) {
    throw new Error("Brak STEAM_API_KEY w zmiennych środowiskowych.");
  }

  const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${STEAM_API_KEY}&appid=${appId}&steamid=${steamId}&l=polish`;

  const response = await fetch(url);

  // 400 oznacza brak osiągnięć lub prywatne statystyki — nie rzucamy błędu
  if (response.status === 400 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Steam API zwróciło błąd: ${response.status}`);
  }

  const data = await response.json();

  // success: 0 oznacza brak dostępu do statystyk gracza
  if (!data?.playerstats?.success || !data?.playerstats?.achievements) {
    return null;
  }

  return data.playerstats.achievements.map((ach) => ({
    api_name: ach.apiname,
    is_unlocked: ach.achieved === 1 ? 1 : 0,
    unlock_time:
      ach.unlocktime > 0 ? new Date(ach.unlocktime * 1000).toISOString() : null,
  }));
}

module.exports = getPlayerAchievements;
