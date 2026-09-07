import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { advanceWorkOrder, buildOccurrence, duplicateCandidates, nearestStreet, triageOccurrence } from '../core/operation-core.mjs';

const geo=JSON.parse(fs.readFileSync(new URL('../data/territorial/logradouros_parauapebas_2025.operational.geojson',import.meta.url),'utf8'));
const first=geo.features[0],coord=first.geometry.coordinates[0][0];

test('nearestStreet encontra o próprio segmento da coordenada fonte',()=>{
  const n=nearestStreet(geo.features,coord[0],coord[1],5);
  assert.ok(n);
  assert.ok(n.distanceM<0.01);
  assert.equal(n.feature.properties._source_index,first.properties._source_index);
});

test('criação enriquece ocorrência e detecta duplicidade espaço-temporal',()=>{
  const territory={matched:true,streetName:first.properties.nom_novo,cep:first.properties.cep,neighborhood:first.properties.bairro,distanceM:0};
  const a=buildOccurrence({categoryCode:'PAVEMENT',description:'buraco',longitude:coord[0],latitude:coord[1]},{protocol:'URB-T-1',territory,existing:[]}).occurrence;
  const b={...a,id:'b',protocol:'URB-T-2',longitude:a.longitude+0.00001,createdAt:new Date(Date.parse(a.createdAt)+1000).toISOString()};
  const d=duplicateCandidates([a],b);
  assert.equal(d.length,1);
  assert.ok(d[0].distanceM<5);
  assert.ok(d[0].score>0.8);
});

test('triagem procedente gera despacho e ciclo de OS resolve ocorrência',()=>{
  const territory={matched:true,streetName:first.properties.nom_novo,cep:first.properties.cep,neighborhood:first.properties.bairro,distanceM:0};
  const o=buildOccurrence({categoryCode:'WATER',description:'vazamento',longitude:coord[0],latitude:coord[1]},{protocol:'URB-T-3',territory,existing:[]}).occurrence;
  const t=triageOccurrence(o,'PROCEDENT');
  assert.equal(t.occurrence.status,'DISPATCHED');
  assert.equal(t.workOrder.responsibleOrgCode,'WATER_SERVICE_PROVIDER');
  const s=advanceWorkOrder(t.workOrder,t.occurrence,'IN_PROGRESS');
  assert.equal(s.occurrence.status,'IN_SERVICE');
  const c=advanceWorkOrder(s.workOrder,s.occurrence,'COMPLETED',{result:{beforeAfterValidated:true}});
  assert.equal(c.occurrence.status,'RESOLVED');
  assert.equal(c.workOrder.status,'COMPLETED');
});

test('SLAs do protótipo permanecem explicitamente provisórios',()=>{
  const territory={matched:true};
  const o=buildOccurrence({categoryCode:'RESILIENCE',longitude:coord[0],latitude:coord[1]},{protocol:'URB-T-4',territory,existing:[]}).occurrence;
  const t=triageOccurrence(o,'PROCEDENT');
  assert.equal(t.workOrder.provisionalSla,true);
  assert.equal(t.workOrder.sourceNote,'ENGINEERING_DEFAULT_NOT_OFFICIAL_SLA');
});
