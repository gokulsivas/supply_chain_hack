import requests

def run():
    print('Getting token...')
    res = requests.post('http://localhost:8000/api/auth/login', json={'email': 'gokul@supplychain.dev', 'password': 'pass1234'})
    token = res.json().get('access_token')
    print('Got token:', token)
    if token:
        print('Calling getMe...')
        res2 = requests.get('http://localhost:8000/api/auth/me', headers={'Authorization': f'Bearer {token}'})
        print('Me:', res2.json())

run()