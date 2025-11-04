import copy
import pytest
from fastapi.testclient import TestClient
import src.app as app_module

client = TestClient(app_module.app)

@pytest.fixture(autouse=True)
def reset_activities():
    # snapshot and restore in-memory activities so tests are isolated
    orig = copy.deepcopy(app_module.activities)
    yield
    app_module.activities = orig


def test_get_activities():
    r = client.get('/activities')
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert 'Chess Club' in data


def test_signup_and_unregister():
    name = 'Chess Club'
    email = 'pytest.user@example.com'

    r = client.get('/activities')
    assert email not in r.json()[name]['participants']

    # signup
    r = client.post(f"/activities/{name}/signup?email={email}")
    assert r.status_code == 200
    assert 'Signed up' in r.json()['message']

    r = client.get('/activities')
    assert email in r.json()[name]['participants']

    # unregister
    r = client.post(f"/activities/{name}/unregister?email={email}")
    assert r.status_code == 200
    r = client.get('/activities')
    assert email not in r.json()[name]['participants']


def test_signup_duplicate():
    name = 'Chess Club'
    # michael@mergington.edu is in the initial data
    email = 'michael@mergington.edu'
    r = client.post(f"/activities/{name}/signup?email={email}")
    assert r.status_code == 400


def test_unregister_not_signed():
    name = 'Chess Club'
    email = 'not.exists@example.com'
    r = client.post(f"/activities/{name}/unregister?email={email}")
    assert r.status_code == 400
