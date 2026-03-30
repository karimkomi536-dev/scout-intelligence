import requests
from bs4 import BeautifulSoup

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

url = "https://fbref.com/en/comps/13/2024-2025/stats/2024-2025-Ligue-1-Stats"

resp = requests.get(url, headers=headers, timeout=30)
print(f"Status: {resp.status_code}")

soup = BeautifulSoup(resp.text, 'lxml')

# Cherche le tableau de stats
table = soup.find('table', {'id': 'stats_standard'})
if not table:
    # Essaie d'autres IDs possibles
    tables = soup.find_all('table')
    print(f"Tables trouvees : {[t.get('id') for t in tables]}")
else:
    rows = table.find('tbody').find_all('tr')
    players_found = []
    for row in rows[:10]:
        name_cell = row.find('td', {'data-stat': 'player'})
        team_cell = row.find('td', {'data-stat': 'team'})
        if name_cell and name_cell.text.strip():
            players_found.append(f"{name_cell.text.strip()} -- {team_cell.text.strip() if team_cell else '?'}")

    print(f"\nPremiers joueurs trouves ({len(players_found)}) :")
    for p in players_found:
        print(f"  {p}")
