import requests

base_url = 'http://127.0.0.1:8000/api/logistics'
truck_id = 'trk-1055-0000-0000-000000000002'
delay_truck_id = 'trk-1042-0000-0000-000000000001'

print('1. Resetting state...')
requests.post(base_url + '/demo/reset')

print('\n2-3. Initial State for IN_TRANSIT TRK-1055:')
r = requests.get(base_url + '/trucks')
truck = next(t for t in r.json() if t['id'] == truck_id)
print(f'Initial Progress: {truck["progress_percent"]}%, ETA: {truck["current_eta"]}, Original: {truck["original_eta"]}')

print('\n4-5. Testing 3 simulation steps...')
original_eta = truck['original_eta']
prev_eta = truck['current_eta']
for i in range(3):
    r = requests.post(base_url + '/trucks/' + truck_id + '/simulate-step')
    t = r.json()
    print(f'Step {i+1}: Progress {t["progress_percent"]}%, Current ETA {t["current_eta"]}, Original ETA {t["original_eta"]}')
    if t['original_eta'] != original_eta:
        print('ERROR: Original ETA changed!')
    if t['current_eta'] == prev_eta:
        print('ERROR: Current ETA did not change!')
    prev_eta = t['current_eta']

print('\n6. Simulating until arrival...')
progress = t['progress_percent']
while progress < 100:
    r = requests.post(base_url + '/trucks/' + truck_id + '/simulate-step')
    t = r.json()
    progress = t['progress_percent']
print(f'Final Status: {t["status"]}, Progress: {t["progress_percent"]}%, ETA: {t["current_eta"]}, Original ETA {t["original_eta"]}')

print('\n7. Checking TRK-1042 delay...')
r = requests.get(base_url + '/trucks')
delay_truck = next(t for t in r.json() if t['id'] == delay_truck_id)
print(f'TRK-1042 Status: {delay_truck["status"]}, Delay Minutes: {delay_truck["delay_minutes"]}')
r = requests.get(base_url + '/alerts')
has_delay_alert = any(a for a in r.json() if a['truck_id'] == delay_truck_id and a['alert_type'] == 'DELAY')
print(f'Has DELAY alert: {has_delay_alert}')

print('\n8. Quick endpoint test for yard/docks...')
r_yard = requests.get(base_url + '/yard')
r_dock = requests.get(base_url + '/docks')
print(f'Yard slots: len={len(r_yard.json())}, Docks: len={len(r_dock.json())}')
