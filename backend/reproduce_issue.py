import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_update():
    # 1. Login
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }
    print("Logging in...")
    try:
        res = requests.post(f"{BASE_URL}/login", json=login_data)
        if res.status_code != 200:
            print(f"Login failed: {res.status_code} {res.text}")
            return
        
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login successful.")

        # 2. Update Profile with extra fields (email)
        payload = {
            "first_name": "Test",
            "last_name": "User",
            "date_of_birth": "2023-01-01",
            "email": "test@example.com", # This field is NOT in ProfileUpdate schema
            "phone_number": "123456789",
            "country": "Indonesia",
            "city": "Jakarta",
            "profile_picture": ""
        }
        
        print("\nSending Update (with email field)...")
        res = requests.put(f"{BASE_URL}/profile", json=payload, headers=headers)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")

        # 3. Update Profile WITHOUT extra fields
        payload_clean = payload.copy()
        del payload_clean["email"]
        
        print("\nSending Update (without email field)...")
        res = requests.put(f"{BASE_URL}/profile", json=payload_clean, headers=headers)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_update()
