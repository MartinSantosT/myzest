"""Authentication tests: registration, login, bcrypt, token, password change."""
import hashlib
import secrets
from app.main import hash_password, verify_password, needs_rehash
from app import models


# --- Unit tests for hashing functions ---

def test_hash_password_uses_bcrypt():
    hashed = hash_password("mypassword")
    assert hashed.startswith("$2b$")


def test_verify_bcrypt_password():
    hashed = hash_password("secreto123")
    assert verify_password("secreto123", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_verify_legacy_sha256():
    """Legacy passwords with salt:hash format must continue to work."""
    password = "oldpassword"
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    stored = f"{salt}:{hashed}"
    assert verify_password(password, stored) is True
    assert verify_password("wrong", stored) is False


def test_verify_plaintext():
    """Plaintext passwords (extreme legacy) must work."""
    assert verify_password("admin", "admin") is True
    assert verify_password("admin", "other") is False


def test_needs_rehash():
    assert needs_rehash("plaintext") is True
    assert needs_rehash("salt:hash") is True
    assert needs_rehash(hash_password("test")) is False


# --- Endpoint tests ---

def test_register(client):
    response = client.post("/auth/register", json={
        "email": "nuevo@zest.local",
        "name": "Nuevo Chef",
        "password": "pass1234",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "nuevo@zest.local"
    assert data["user"]["name"] == "Nuevo Chef"


def test_register_duplicate_email(client, test_user):
    response = client.post("/auth/register", json={
        "email": "test@zest.local",
        "name": "Duplicate",
        "password": "pass1234",
    })
    assert response.status_code == 400


def test_register_short_password(client):
    response = client.post("/auth/register", json={
        "email": "short@zest.local",
        "name": "Short",
        "password": "ab",
    })
    assert response.status_code == 400


def test_login(client, test_user):
    response = client.post("/auth/login", json={
        "email": "test@zest.local",
        "password": "test1234",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["id"] == test_user.id


def test_login_wrong_password(client, test_user):
    response = client.post("/auth/login", json={
        "email": "test@zest.local",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


def test_login_nonexistent_user(client):
    response = client.post("/auth/login", json={
        "email": "nobody@zest.local",
        "password": "test1234",
    })
    assert response.status_code == 401


def test_login_auto_upgrades_legacy_hash(client, db):
    """Login with legacy sha256 hash must auto-migrate to bcrypt."""
    password = "legacypass"
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    legacy_hash = f"{salt}:{hashed}"

    user = models.User(
        email="legacy@zest.local",
        name="Legacy",
        password_hash=legacy_hash,
    )
    db.add(user)
    db.commit()

    # Login with legacy password
    response = client.post("/auth/login", json={
        "email": "legacy@zest.local",
        "password": "legacypass",
    })
    assert response.status_code == 200

    # Verify that the hash was upgraded to bcrypt
    db.refresh(user)
    assert user.password_hash.startswith("$2b$")


def test_get_me(client, auth_headers):
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "test@zest.local"


def test_get_me_no_token(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_change_password(client, auth_headers, db, test_user):
    response = client.put("/auth/password", json={
        "current_password": "test1234",
        "new_password": "newpass5678",
    }, headers=auth_headers)
    assert response.status_code == 200

    # Verify that the new password works
    login_resp = client.post("/auth/login", json={
        "email": "test@zest.local",
        "password": "newpass5678",
    })
    assert login_resp.status_code == 200


def test_change_password_wrong_current(client, auth_headers):
    response = client.put("/auth/password", json={
        "current_password": "wrongcurrent",
        "new_password": "newpass5678",
    }, headers=auth_headers)
    assert response.status_code == 400
