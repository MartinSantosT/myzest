"""Memory CRUD tests."""


def test_create_memory(client, auth_headers):
    response = client.post("/memories/", json={
        "title": "Christmas Dinner 2025",
        "description": "The best family dinner",
        "event_date": "2025-12-24",
        "location": "Grandma's house",
    }, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Christmas Dinner 2025"
    assert data["location"] == "Grandma's house"
    assert data["event_date"] == "2025-12-24"


def test_get_memories(client, auth_headers):
    client.post("/memories/", json={
        "title": "Memory 1",
    }, headers=auth_headers)
    client.post("/memories/", json={
        "title": "Memory 2",
    }, headers=auth_headers)

    response = client.get("/memories/", headers=auth_headers)
    assert response.status_code == 200
    memories = response.json()
    assert len(memories) >= 2


def test_get_memory_detail(client, auth_headers):
    create_resp = client.post("/memories/", json={
        "title": "Detail Test",
        "description": "Long description",
    }, headers=auth_headers)
    memory_id = create_resp.json()["id"]

    response = client.get(f"/memories/{memory_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["title"] == "Detail Test"


def test_update_memory(client, auth_headers):
    create_resp = client.post("/memories/", json={
        "title": "Original",
    }, headers=auth_headers)
    memory_id = create_resp.json()["id"]

    update_resp = client.put(f"/memories/{memory_id}", json={
        "title": "Updated",
        "location": "New location",
    }, headers=auth_headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "Updated"
    assert update_resp.json()["location"] == "New location"


def test_delete_memory(client, auth_headers):
    create_resp = client.post("/memories/", json={
        "title": "To Delete",
    }, headers=auth_headers)
    memory_id = create_resp.json()["id"]

    delete_resp = client.delete(f"/memories/{memory_id}", headers=auth_headers)
    assert delete_resp.status_code == 200

    get_resp = client.get(f"/memories/{memory_id}", headers=auth_headers)
    assert get_resp.status_code == 404


def test_memory_linked_to_recipe(client, auth_headers):
    """Create a memory linked to a recipe."""
    recipe_resp = client.post("/recipes/", json={
        "title": "Valencian Paella",
    }, headers=auth_headers)
    recipe_id = recipe_resp.json()["id"]

    memory_resp = client.post("/memories/", json={
        "title": "Paella in Valencia",
        "recipe_id": recipe_id,
    }, headers=auth_headers)
    assert memory_resp.status_code == 200
    data = memory_resp.json()
    assert data["recipe_id"] == recipe_id
    assert data["recipe"]["title"] == "Valencian Paella"


def test_delete_recipe_unlinks_memory(client, auth_headers):
    """When deleting recipe, the memory loses the link (SET NULL)."""
    recipe_resp = client.post("/recipes/", json={
        "title": "Temporary",
    }, headers=auth_headers)
    recipe_id = recipe_resp.json()["id"]

    memory_resp = client.post("/memories/", json={
        "title": "Linked",
        "recipe_id": recipe_id,
    }, headers=auth_headers)
    memory_id = memory_resp.json()["id"]

    # Delete the recipe
    client.delete(f"/recipes/{recipe_id}", headers=auth_headers)

    # The memory should exist but without the recipe
    get_resp = client.get(f"/memories/{memory_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["recipe_id"] is None
