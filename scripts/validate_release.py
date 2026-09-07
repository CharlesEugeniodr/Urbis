from pathlib import Path
import json, re, sys
try:
    import yaml
except Exception:
    yaml=None
ROOT=Path(__file__).resolve().parents[1]
VERSION='0.5.0-alpha.1'
errors=[]
def ok(cond,msg):
    if not cond: errors.append(msg)
package=json.loads((ROOT/'package.json').read_text())
ok(package.get('version')==VERSION,'package version mismatch')
openapi=json.loads((ROOT/'docs/openapi.json').read_text())
ok(openapi.get('info',{}).get('version')==VERSION,'openapi version mismatch')
required_paths=['/v1/auth/register','/v1/occurrences','/v1/field/work-orders','/v1/dashboard/summary','/public/occurrences','/public/stream','/v1/reports/occurrences.xlsx','/v1/resilience/evaluate']
for path in required_paths:ok(path in openapi.get('paths',{}),f'openapi missing {path}')
health=(ROOT/'apps/api/src/health/health.controller.ts').read_text();ok(VERSION in health,'health version mismatch')
k8s=(ROOT/'infra/k8s/api.yaml').read_text();ok('/v1/health' in k8s,'k8s health probe mismatch')
for name in ['REQUIREMENTS_TRACEABILITY.md','DATA_MODEL.md','CONFIGURATION.md','DEPLOYMENT.md','TEST_STRATEGY.md','USER_CITIZEN.md','USER_CENTRAL.md','USER_FIELD.md','PRIVACY_POLICY_DRAFT.md','TERMS_OF_USE_DRAFT.md','SECURITY.md']:
    ok((ROOT/'docs'/name).exists(),f'missing docs/{name}')
for f in ROOT.rglob('*'):
    if f.is_file() and (f.name.endswith('.tmp') or f.name.endswith('.prev')):errors.append(f'stale temporary file: {f.relative_to(ROOT)}')
for f in ROOT.rglob('*.json'):
    try:json.loads(f.read_text())
    except Exception as e:errors.append(f'invalid JSON {f.relative_to(ROOT)}: {e}')
if yaml:
    for f in list((ROOT/'infra').rglob('*.yaml'))+list((ROOT/'infra').rglob('*.yml'))+list((ROOT/'.github').rglob('*.yml')):
        try:list(yaml.safe_load_all(f.read_text()))
        except Exception as e:errors.append(f'invalid YAML {f.relative_to(ROOT)}: {e}')
if errors:
    print('RELEASE VALIDATION FAILED')
    for e in errors:print('-',e)
    sys.exit(1)
print(f'OK: release {VERSION}; OpenAPI/documentation/version/YAML/JSON checks passed.')
