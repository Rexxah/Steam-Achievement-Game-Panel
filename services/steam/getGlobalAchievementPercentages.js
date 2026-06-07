/**
 * Pobiera globalny procent graczy, którzy odblokwali każde osiągnięcie.
 * Nie wymaga klucza API.
 * @param {string|number} appId - Steam App ID gry
 * @returns {Promise<Map<string, number>>} - Mapa { api_name -> global_percent }
 */
async function getGlobalAchievementPercentages(appId) {
  const url = `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appId}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Steam API zwróciło błąd: ${response.status}`);
  }

  const data = await response.json();
  const achievements = data?.achievementpercentages?.achievements || [];

  const map = new Map();
  for (const ach of achievements) {
    map.set(ach.name, parseFloat(ach.percent));
  }
  return map;
}

module.exports = getGlobalAchievementPercentages;
