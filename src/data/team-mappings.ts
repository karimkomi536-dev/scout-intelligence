/**
 * Maps team names (as stored in DB / from API-Football) to football-data.org team IDs.
 * Free-tier competitions covered: Premier League, La Liga, Bundesliga, Serie A, Ligue 1, UCL.
 *
 * To find an ID for a missing team:
 *   GET https://api.football-data.org/v4/teams?name=<team>
 *   Headers: X-Auth-Token: <FOOTBALL_DATA_API_KEY>
 */
export const TEAM_IDS: Record<string, number> = {
  // ── Premier League ──────────────────────────────────────────────────────────
  'Arsenal':                    57,
  'Chelsea':                    61,
  'Manchester City':            65,
  'Manchester United':          66,
  'Liverpool':                  64,
  'Tottenham Hotspur':          73,
  'Newcastle United':           67,
  'Aston Villa':                58,
  'West Ham United':           563,
  'Brighton & Hove Albion':    397,
  'Everton':                    62,
  'Crystal Palace':            354,
  'Wolverhampton Wanderers':    76,
  'Fulham':                     63,
  'Brentford':                 402,
  'Nottingham Forest':         351,

  // ── La Liga ─────────────────────────────────────────────────────────────────
  'Real Madrid':                86,
  'Barcelona':                  81,
  'Atletico Madrid':            78,
  'Sevilla':                   559,
  'Valencia':                   95,
  'Villarreal':                 94,
  'Athletic Club':              77,
  'Real Sociedad':              92,
  'Real Betis':                558,
  'Girona':                    298,

  // ── Bundesliga ──────────────────────────────────────────────────────────────
  'Bayern Munich':               5,
  'Borussia Dortmund':           4,
  'RB Leipzig':                721,
  'Bayer Leverkusen':            3,
  'Eintracht Frankfurt':        19,
  'Wolfsburg':                  11,
  'Freiburg':                   17,
  'Hoffenheim':                715,
  'Mainz 05':                   15,
  'Werder Bremen':              12,

  // ── Serie A ─────────────────────────────────────────────────────────────────
  'Juventus':                  109,
  'AC Milan':                   98,
  'Internazionale':            108,
  'Inter':                     108,
  'AS Roma':                   100,
  'Napoli':                    113,
  'Lazio':                     110,
  'Fiorentina':                 99,
  'Atalanta':                  102,
  'Torino':                    586,

  // ── Ligue 1 ─────────────────────────────────────────────────────────────────
  'Paris Saint-Germain':       524,
  'Marseille':                 516,
  'Lyon':                      523,
  'Monaco':                    548,
  'Lille':                     521,
  'Nice':                      522,
  'Rennes':                    529,
  'Lens':                      532,
  'Strasbourg':                576,
  'Reims':                     512,
}

/** Returns the football-data.org team ID for a given team name, or undefined. */
export function getTeamId(teamName: string): number | undefined {
  return TEAM_IDS[teamName]
}
