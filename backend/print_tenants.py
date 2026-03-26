import json
import codecs
try:
    with open('tenants_dump.json', 'r', encoding='utf-16') as f:
        data = json.load(f)
        for t in data:
            print(f"Name: {t.get('displayName')}")
            print(f"  Tenant: {t.get('tenantId')}")
            print(f"  Client: {t.get('clientId')}")
            print("-" * 20)
except Exception as e:
    print(f"Error: {e}")
