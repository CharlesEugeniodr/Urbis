import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, hasPermission, issueAccessToken, normalizeEmail, verifyAccessToken, verifyPassword } from '../core/security-core.mjs';
import { assessICI, decodeEvidenceBase64, sha256 } from '../core/evidence-core.mjs';

test('senha usa scrypt e não é armazenada em claro',()=>{
  const h=hashPassword('UrbisLocal!2026');
  assert.match(h,/^scrypt\$/);
  assert.equal(h.includes('UrbisLocal!2026'),false);
  assert.equal(verifyPassword('UrbisLocal!2026',h),true);
  assert.equal(verifyPassword('Errada!2026',h),false);
});

test('token HS256 valida assinatura, escopo e papel',()=>{
  const secret='x'.repeat(48),user={id:'u1',email:'citizen@urbis.local',roles:['CITIZEN']};
  const t=issueAccessToken(user,{secret,ttlSeconds:60});
  const p=verifyAccessToken(t,{secret});
  assert.equal(p.sub,'u1');
  assert.deepEqual(p.roles,['CITIZEN']);
  assert.equal(hasPermission(p,'occurrence:create'),true);
  assert.equal(hasPermission(p,'occurrence:triage'),false);
});

test('normalização de email é determinística',()=>assert.equal(normalizeEmail('  A@EXAMPLE.COM '),'a@example.com'));

test('evidência base64 tem hash SHA-256 reprodutível',()=>{
  const b=decodeEvidenceBase64(Buffer.from('evidencia urbis').toString('base64'));
  assert.equal(sha256(b),sha256(Buffer.from('evidencia urbis')));
});

test('ICI aumenta com corroboração e validação de autoridade',()=>{
  const occurrence={latitude:-6.1,longitude:-49.9,createdAt:'2026-09-07T15:00:00.000Z'};
  const evidence={latitude:-6.1,longitude:-49.9,capturedAt:'2026-09-07T15:02:00.000Z',hashVerified:true,mediaType:'image/jpeg',byteLength:1000};
  const base=assessICI({occurrence,evidence,user:{id:'u',roles:['CITIZEN']},corroborationCount:0,authorityValidated:false});
  const strong=assessICI({occurrence,evidence,user:{id:'u',roles:['CITIZEN']},corroborationCount:3,authorityValidated:true});
  assert.ok(strong.score>base.score);
  assert.equal(strong.details.authorityValidated,true);
  assert.equal(strong.interpretation,'engineering_confidence_indicator_not_proof_of_truth');
});
