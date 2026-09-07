import crypto from 'node:crypto';

export const ROLE_PERMISSIONS={
  CITIZEN:new Set(['occurrence:create','occurrence:read:self','evidence:upload:self','evaluation:create:self','score:read:self','notification:read:self','device:register:self']),
  OPERATOR:new Set(['occurrence:create','occurrence:read:any','occurrence:triage','evidence:upload:any','evidence:read:any','evidence:validate','operations:read','work_order:read','alert:read','report:export']),
  FIELD_AGENT:new Set(['occurrence:read:assigned','work_order:read:assigned','work_order:update:assigned','evidence:upload:assigned','evidence:read:assigned','field:update']),
  MANAGER:new Set(['occurrence:create','occurrence:read:any','occurrence:triage','evidence:upload:any','evidence:read:any','evidence:validate','operations:read','work_order:read','work_order:update','score:validate','alert:read','alert:write','contract:read','report:export']),
  ADMIN:new Set(['*'])
};

export function normalizeEmail(v){
  const s=String(v??'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error('invalid_email');
  return s;
}

export function validatePassword(password){
  const p=String(password??'');
  if(p.length<10) throw new Error('weak_password');
  if(!/[A-Z]/.test(p)||!/[a-z]/.test(p)||!/[0-9]/.test(p)) throw new Error('weak_password');
  return p;
}

export function hashPassword(password,{salt=crypto.randomBytes(16)}={}){
  const p=validatePassword(password);
  const hash=crypto.scryptSync(p,salt,64,{N:16384,r:8,p:1});
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function verifyPassword(password,encoded){
  try{
    const [alg,N,r,p,saltB64,hashB64]=String(encoded).split('$');
    if(alg!=='scrypt'||!N||!r||!p||!saltB64||!hashB64)return false;
    const expected=Buffer.from(hashB64,'base64url');
    const actual=crypto.scryptSync(String(password),Buffer.from(saltB64,'base64url'),expected.length,{N:Number(N),r:Number(r),p:Number(p)});
    return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual);
  }catch{return false;}
}

function jsonB64(v){return Buffer.from(JSON.stringify(v)).toString('base64url');}
function signPart(data,secret){return crypto.createHmac('sha256',secret).update(data).digest('base64url');}

export function issueAccessToken(user,{secret,ttlSeconds=3600,issuer='urbis-local',audience='urbis'}={}){
  if(!secret) throw new Error('token_secret_required');
  const now=Math.floor(Date.now()/1000);
  const header={alg:'HS256',typ:'JWT'};
  const payload={sub:user.id,email:user.email,roles:[...(user.roles??[])],iat:now,exp:now+ttlSeconds,iss:issuer,aud:audience};
  const unsigned=`${jsonB64(header)}.${jsonB64(payload)}`;
  return `${unsigned}.${signPart(unsigned,secret)}`;
}

export function verifyAccessToken(token,{secret,issuer='urbis-local',audience='urbis',nowSeconds=Math.floor(Date.now()/1000)}={}){
  if(!secret) throw new Error('token_secret_required');
  const parts=String(token??'').split('.');
  if(parts.length!==3) throw new Error('invalid_token');
  const unsigned=`${parts[0]}.${parts[1]}`;
  const expected=Buffer.from(signPart(unsigned,secret));
  const actual=Buffer.from(parts[2]);
  if(expected.length!==actual.length||!crypto.timingSafeEqual(expected,actual)) throw new Error('invalid_token_signature');
  let payload;try{payload=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));}catch{throw new Error('invalid_token_payload');}
  if(payload.exp==null||Number(payload.exp)<=nowSeconds) throw new Error('token_expired');
  if(payload.iss!==issuer||payload.aud!==audience) throw new Error('invalid_token_scope');
  if(!payload.sub||!Array.isArray(payload.roles)) throw new Error('invalid_token_claims');
  return payload;
}

export function bearerToken(headers={}){
  const raw=headers.authorization??headers.Authorization??'';
  const m=String(raw).match(/^Bearer\s+(.+)$/i);
  return m?.[1]??null;
}

export function hasPermission(user,permission){
  for(const role of user?.roles??[]){const perms=ROLE_PERMISSIONS[String(role).toUpperCase()];if(perms?.has('*')||perms?.has(permission))return true;}
  return false;
}

export function requirePermission(user,permission){
  if(!user) throw new Error('authentication_required');
  if(!hasPermission(user,permission)) throw new Error('forbidden');
  return true;
}

export function redactUser(user){return {id:user.id,email:user.email,displayName:user.displayName??null,roles:[...(user.roles??[])]};}

export function normalizeCpf(v){
  const d=String(v??'').replace(/\D/g,'');
  if(d.length!==11||/^(\d)\1{10}$/.test(d))throw new Error('invalid_cpf');
  const digit=(base)=>{let sum=0;for(let i=0;i<base;i++)sum+=Number(d[i])*(base+1-i);const r=(sum*10)%11;return r===10?0:r;};
  if(digit(9)!==Number(d[9])||digit(10)!==Number(d[10]))throw new Error('invalid_cpf');
  return d;
}
export function cpfFingerprint(cpf,{secret}={}){if(!secret)throw new Error('pii_hmac_secret_required');return crypto.createHmac('sha256',secret).update(normalizeCpf(cpf)).digest('hex');}
