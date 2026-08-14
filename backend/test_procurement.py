import requests
from datetime import datetime, timedelta

base_url = 'http://127.0.0.1:8000/api'

# 3. Test unauthorized
print("Testing unauthorized extract...")
r_unauth = requests.post(f"{base_url}/procurement/extract", json={"message": "I need 10 laptops"})
print(f"Unauthorized status: {r_unauth.status_code}")
if r_unauth.status_code != 401:
    print(f"Error: expected 401, got {r_unauth.status_code}")

# 4. Obtain JWT
print("\nObtaining JWT...")
test_email = f"test_{datetime.now().timestamp()}@example.com"
r_reg = requests.post(f"{base_url}/auth/register", json={
    "name": "Test User",
    "email": test_email,
    "password": "password123"
})
if r_reg.status_code != 201:
    print(f"Failed to register test user: {r_reg.json()}")
    exit(1)

r_login = requests.post(f"{base_url}/auth/login", json={
    "email": test_email,
    "password": "password123"
})
if r_login.status_code != 200:
    print(f"Failed to login: {r_login.json()}")
    exit(1)

token = r_login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("Successfully obtained JWT")

# 5. Test valid extraction
print("\nTesting valid extraction...")
r_extract = requests.post(
    f"{base_url}/procurement/extract",
    json={"message": "I need 100 laptops for Bangalore warehouse by August 20."},
    headers=headers
)
print(f"Extract status: {r_extract.status_code}")
if r_extract.status_code == 503:
    print("Gemini API key not configured, skipping extraction validation logic but confirming route exists.")
elif r_extract.status_code == 200:
    data = r_extract.json()
    print(f"Extracted JSON: {data}")
    if not data["is_valid"]:
        print("Error: extraction should be valid!")
else:
    print(f"Unexpected status: {r_extract.text}")

# 6. Test invalid extraction
print("\nTesting invalid extraction (validation rules)...")
# Simulate an invalid extraction or directly test invalid save
r_invalid_save = requests.post(
    f"{base_url}/procurement/purchase-requests",
    json={
        "item": "A", # Too short
        "quantity": -5, # Invalid
        "delivery_location": "Bangalore",
        "required_date": "2000-01-01", # Past date
        "priority": "NORMAL"
    },
    headers=headers
)
print(f"Invalid save status: {r_invalid_save.status_code}")
if r_invalid_save.status_code != 422:
    print(f"Error: expected 422, got {r_invalid_save.status_code} - {r_invalid_save.text}")
else:
    print(f"Validation errors received correctly: {r_invalid_save.json()}")

# 7. Create valid purchase request
print("\nCreating valid purchase request...")
future_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
r_save = requests.post(
    f"{base_url}/procurement/purchase-requests",
    json={
        "item": "Laptops",
        "quantity": 100,
        "delivery_location": "Bangalore",
        "required_date": future_date,
        "priority": "HIGH",
        "raw_message": "I need 100 laptops for Bangalore warehouse by August 20."
    },
    headers=headers
)
print(f"Save status: {r_save.status_code}")
if r_save.status_code == 201:
    pr_data = r_save.json()
    print(f"Created PR: {pr_data['request_code']} with status {pr_data['status']}")
    pr_id = pr_data["id"]
else:
    print(f"Error creating PR: {r_save.text}")
    exit(1)

# 8. List and get PR
print("\nListing user purchase requests...")
r_list = requests.get(f"{base_url}/procurement/purchase-requests", headers=headers)
print(f"List status: {r_list.status_code}, count: {len(r_list.json())}")

print(f"\nGetting specific PR {pr_id}...")
r_get = requests.get(f"{base_url}/procurement/purchase-requests/{pr_id}", headers=headers)
print(f"Get status: {r_get.status_code}")
if r_get.status_code == 200:
    print(f"Retrieved PR product: {r_get.json()['items'][0]['product']['name']}")

# 9. Smoke test existing endpoints
print("\nSmoke testing logistics endpoints...")
r_trucks = requests.get(f"{base_url}/logistics/trucks")
print(f"Trucks endpoint status: {r_trucks.status_code}")

print("\nDone.")
