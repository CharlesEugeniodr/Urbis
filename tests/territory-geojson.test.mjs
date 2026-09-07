import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const geo=JSON.parse(fs.readFileSync(path.join(root,'data/territorial/logradouros_parauapebas_2025.operational.geojson'),'utf8'));
const meta=JSON.parse(fs.readFileSync(path.join(root,'data/territorial/logradouros_parauapebas_2025.metadata.json'),'utf8'));

test('camada operacional contém 10.997 segmentos MultiLineString',()=>{
  assert.equal(geo.type,'FeatureCollection'); assert.equal(geo.features.length,10997);
  assert.ok(geo.features.every(f=>f.geometry?.type==='MultiLineString'&&f.geometry.coordinates.length>0));
});
test('baseline territorial tem 46 bairros e 6 zonas',()=>{ assert.equal(meta.unique_neighborhoods,46); assert.equal(meta.unique_zones,6); });
test('quarentena preserva 81 geometrias vazias e 1 inválida',()=>{ assert.deepEqual(meta.quarantine_by_reason,{EMPTY_GEOMETRY:81,INVALID_GEOMETRY:1}); });
test('cruzamento com CEPs confirma 2.446 CEPs comuns',()=>{ assert.equal(meta.ceps_common_geometry_pdf,2446); });
