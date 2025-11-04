from fastapi.testclient import TestClient
from src.app import app

client = TestClient(app)

def print_participants(name):
    r = client.get('/activities')
    data = r.json()
    parts = data.get(name, {}).get('participants', [])
    print(f"Participants for {name}: {parts}")

print_participants('Chess Club')

# Signup a test user
r = client.post('/activities/Chess%20Club/signup?email=test.user@example.com')
print('signup status', r.status_code, r.json())
print_participants('Chess Club')

# Unregister the test user
r = client.post('/activities/Chess%20Club/unregister?email=test.user@example.com')
print('unregister status', r.status_code, r.json())
print_participants('Chess Club')
