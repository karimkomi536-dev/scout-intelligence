import requests
import time
import os
import re
import unicodedata
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
API_KEY = os.getenv('API_FOOTBALL_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {'x-apisports-key': API_KEY}
BASE_URL = 'https://v3.football.api-sports.io'

LEAGUES = [
    {'id': 61,  'name': 'Ligue 1'},
    {'id': 39,  'name': 'Premier League'},
    {'id': 140, 'name': 'La Liga'},
    {'id': 78,  'name': 'Bundesliga'},
    {'id': 135, 'name': 'Serie A'},
]

# Saisons historiques — du plus recent au plus ancien
SEASONS = [2023, 2022, 2021, 2020, 2019, 2018, 2017]

def normalize(text):
    if not text:
        return ''
    nfd = unicodedata.normalize('NFD', str(text))
    ascii_text = ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')
    clean = re.sub(r'[^a-z0-9 ]', '', ascii_text.lower())
    return re.sub(r'\s+', ' ', clean).strip()

def get_label(score):
    if score >= 90: return 'ELITE'
    if score >= 75: return 'TOP PROSPECT'
    if score >= 60: return 'INTERESTING'
    if score >= 45: return 'TO MONITOR'
    return 'LOW PRIORITY'

def calculate_score(goals, assists, minutes, position):
    if not minutes or minutes < 200:
        return None
    per90 = 90.0 / minutes
    pos = (position or '').upper()
    if 'G' in pos:
        return min(100, 30 + minutes / 90 * 2)
    elif pos in ['CB', 'LB', 'RB', 'DEF']:
        return min(100, (goals * 3 + assists * 2) * per90 * 10 + 30)
    elif pos in ['CDM', 'CM', 'MID']:
        return min(100, (goals * 4 + assists * 5) * per90 * 10 + 25)
    else:
        return min(100, (goals * 6 + assists * 4) * per90 * 10 + 20)

def get_scorers(league_id, season):
    """Recupere top scorers + assisteurs pour une ligue/saison"""
    players = {}

    # Top scorers
    try:
        resp = requests.get(
            f'{BASE_URL}/players/topscorers',
            headers=HEADERS,
            params={'league': league_id, 'season': season},
            timeout=15
        )
        data = resp.json()
        for item in data.get('response', []):
            p = item.get('player', {})
            stats = item.get('statistics', [{}])[0]
            name = p.get('name', '')
            team = stats.get('team', {}).get('name', '')
            key = (normalize(name), normalize(team))
            players[key] = {
                'name': name,
                'team': team,
                'season': str(season),
                'goals': stats.get('goals', {}).get('total') or 0,
                'assists': stats.get('goals', {}).get('assists') or 0,
                'minutes': stats.get('games', {}).get('minutes') or 0,
                'appearances': stats.get('games', {}).get('appearences') or 0,
                'position': stats.get('games', {}).get('position') or 'MID',
            }
    except Exception as e:
        print(f"    Erreur scorers {league_id}/{season}: {e}")

    time.sleep(2)

    # Top assisteurs
    try:
        resp = requests.get(
            f'{BASE_URL}/players/topassists',
            headers=HEADERS,
            params={'league': league_id, 'season': season},
            timeout=15
        )
        data = resp.json()
        for item in data.get('response', []):
            p = item.get('player', {})
            stats = item.get('statistics', [{}])[0]
            name = p.get('name', '')
            team = stats.get('team', {}).get('name', '')
            key = (normalize(name), normalize(team))
            if key not in players:
                players[key] = {
                    'name': name,
                    'team': team,
                    'season': str(season),
                    'goals': stats.get('goals', {}).get('total') or 0,
                    'assists': stats.get('goals', {}).get('assists') or 0,
                    'minutes': stats.get('games', {}).get('minutes') or 0,
                    'appearances': stats.get('games', {}).get('appearences') or 0,
                    'position': stats.get('games', {}).get('position') or 'MID',
                }
    except Exception as e:
        print(f"    Erreur assists {league_id}/{season}: {e}")

    return list(players.values())

# Pre-charger l'index joueurs une seule fois (evite N requetes DB)
_player_index: dict | None = None

def _load_player_index():
    global _player_index
    if _player_index is not None:
        return _player_index
    result = supabase.table('players').select('id, name, team').execute()
    _player_index = {}
    for p in (result.data or []):
        name_key = normalize(p.get('name', ''))
        team_key = normalize(p.get('team', ''))
        _player_index[(name_key, team_key)] = p['id']
    print(f"  Index joueurs charge : {len(_player_index)} entrees")
    return _player_index

def find_player_id(name, team):
    """Trouve l'ID du joueur en DB par matching normalise"""
    try:
        idx = _load_player_index()
        name_norm = normalize(name)
        team_norm = normalize(team)
        # Match exact (nom + equipe)
        if (name_norm, team_norm) in idx:
            return idx[(name_norm, team_norm)]
        # Fallback : nom seulement
        for (n, _t), pid in idx.items():
            if n == name_norm:
                return pid
    except Exception as e:
        print(f"    Erreur find_player {name}: {e}")
    return None

def upsert_snapshot(player_id, data):
    """Upsert dans player_history"""
    try:
        supabase.table('player_history').upsert(
            {**data, 'player_id': player_id},
            on_conflict='player_id,season',
        ).execute()
        return 'insert'
    except Exception as e:
        print(f"    Erreur upsert snapshot: {e}")
        return 'error'

# === MAIN ===
import sys
dry_run = '--dry-run' in sys.argv

print("=" * 60)
print("VIZION -- Import historique 2017-2023")
print("DRY-RUN" if dry_run else "PRODUCTION")
print("=" * 60)

stats = {'insert': 0, 'update': 0, 'skip': 0, 'error': 0}
api_calls = 0
MAX_API_CALLS = 90  # Limite plan gratuit 100/jour

for season in SEASONS:
    print(f"\n{'='*40}")
    print(f"SAISON {season}-{str(season+1)[-2:]}")
    print(f"{'='*40}")

    for league in LEAGUES:
        if api_calls >= MAX_API_CALLS:
            print(f"\n LIMITE API atteinte ({MAX_API_CALLS} appels)")
            print("Relance demain avec: npm run import:history")
            break

        print(f"\n  {league['name']} {season}...")
        players_data = get_scorers(league['id'], season)
        api_calls += 2  # 2 appels par ligue (scorers + assists)
        print(f"  -> {len(players_data)} joueurs recuperes")

        for p in players_data:
            score = calculate_score(
                p['goals'], p['assists'],
                p['minutes'], p['position']
            )
            if score is None:
                stats['skip'] += 1
                continue

            season_str = f"{season}-{str(season+1)[-2:]}"
            snapshot = {
                'season': season_str,
                'overall_score': round(score, 1),
                'goals': p['goals'],
                'assists': p['assists'],
                'minutes_played': p['minutes'],
                'appearances': p['appearances'],
            }

            if dry_run:
                print(f"    [DRY] {p['name']} ({p['team']}) {season_str} -- score: {score:.1f}")
                stats['insert'] += 1
                continue

            player_id = find_player_id(p['name'], p['team'])
            if not player_id:
                stats['skip'] += 1
                continue

            result = upsert_snapshot(player_id, snapshot)
            stats[result] += 1

        time.sleep(3)  # Entre chaque ligue

    if api_calls >= MAX_API_CALLS:
        break

    time.sleep(5)  # Entre chaque saison

print(f"\n{'='*60}")
print(f"RESUME -- {api_calls} appels API utilises")
print(f"{'='*60}")
print(f"  Inseres   : {stats['insert']}")
print(f"  Mis a jour: {stats['update']}")
print(f"  Ignores   : {stats['skip']}")
print(f"  Erreurs   : {stats['error']}")
print(f"{'='*60}")
print(f"Appels API restants aujourd'hui : ~{100 - api_calls}")
