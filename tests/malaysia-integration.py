"""One local-preview integration pass; contacts live providers, never run as a load test."""
import json, urllib.request, urllib.error, time
BASE='http://127.0.0.1:4173'
def get(path):
    try:
        with urllib.request.urlopen(BASE+path,timeout=25) as r:return r.status,json.load(r)
    except urllib.error.HTTPError as e:return e.code,json.load(e)
for name,lat,lon in [('Kuala Lumpur',3.1425382,101.7180795),('George Town',5.4141,100.3288),('Kota Kinabalu',5.9804,116.0735),('Kuching',1.5533,110.3592)]:
    status,data=get(f'/api/nearby?lat={lat}&lon={lon}&category=Mall&radius=5')
    assert status==200,(name,status,data)
    assert data['places'],name+' should return mapped malls'
    assert all(0<=p['distance']<=5 for p in data['places'])
    assert data['places']==sorted(data['places'],key=lambda p:p['distance'])
    print('PASS nearby:',name,len(data['places']))
    time.sleep(1)
assert get('/api/nearby?lat=NaN&lon=101&category=Mall&radius=3')[0]==400
assert get('/api/nearby?lat=3&lon=101&category=Unknown&radius=3')[0]==400
assert get('/api/nearby?lat=3&lon=101&category=Mall&radius=99')[0]==400
base='/api/route?fromLat=3.1588&fromLon=101.7119&toLat=3.1425382&toLon=101.7180795'
assert get(base+'&mode=train')[0]==422
assert get('/api/route?fromLat=NaN&fromLon=101&toLat=3&toLon=101&mode=car')[0]==400
for mode in ['car','walk','cycle']:
    status,data=get(base+'&mode='+mode)
    assert status==200,(mode,status,data)
    assert data['routes'] and data['liveTraffic'] is False and data['tollPricesAvailable'] is False
    assert all(r['distance']>0 and r['duration']>0 and r['geometry']['type']=='LineString' for r in data['routes'])
    print('PASS routing:',mode,len(data['routes']))
    time.sleep(1.3)
print('PASS: Malaysia regions, nearby radius, sorting, input validation, unsupported modes and real routing')
