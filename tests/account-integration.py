"""Runs against the portable preview's simulated user; never production."""
import urllib.request, urllib.error, http.cookiejar, json
base='http://127.0.0.1:4173'
client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(body=None, origin=base):
    req=urllib.request.Request(base+'/api/account',data=json.dumps(body).encode() if body else None,headers={'Content-Type':'application/json','Origin':origin})
    try:
        with client.open(req) as r:return r.status,json.load(r)
    except urllib.error.HTTPError as e:
        raw=e.read().decode()
        try: data=json.loads(raw)
        except ValueError: data={'error':raw}
        return e.code,data
assert call()[0]==401, 'Anonymous read rejected'
assert call({'action':'welcome'})[0]==401, 'Anonymous write rejected'
client.open(base+'/signin-with-chatgpt?return_to=/account').read()
assert call({'action':'welcome'},'https://untrusted.example')[0]==403, 'Cross-origin write rejected'
for action in [{'action':'welcome'},{'action':'profile','name':'Naviya Tester'},{'action':'privacy'}]:
    assert call(action)[0]==200
    balance=call()[1]['balance']
    assert call(action)[0]==200
    assert call()[1]['balance']==balance, 'One-time award is idempotent'
assert call({'action':'profile','name':' '})[0]==400
assert call({'action':'redeem','reward':'unknown'})[0]==400
for key,cost in [('dusk',50),('planner',75)]:
    before=call()[1]; owned=any(r['reward']==key for r in before['records'])
    assert call({'action':'redeem','reward':key})[0]==200
    after=call()[1]['balance']
    assert after==before['balance']-(0 if owned else cost)
    assert call({'action':'redeem','reward':key})[0]==200
    assert call()[1]['balance']==after, 'Duplicate redemption does not deduct twice'
assert call({'action':'redeem','reward':'badge'})[0]==409, 'Insufficient balance rejected'
assert call()[1]['balance']>=0
client.open(base+'/signout-with-chatgpt?return_to=/signed-out').read()
assert call()[0]==401, 'Sign-out removes account access'
print('PASS: authentication, sign-out, origin checks, validation, one-time awards, redemption and balance guards')
