import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseService } from '../database/database.service';

type TokenUser={id:string;email:string;displayName?:string|null;roles:string[]};

function normalizeEmail(v:unknown){const s=String(v??'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw new BadRequestException('e-mail inválido');return s;}
function validatePassword(v:unknown){const p=String(v??'');if(p.length<10||!/[A-Z]/.test(p)||!/[a-z]/.test(p)||!/[0-9]/.test(p))throw new BadRequestException('senha fraca');return p;}
function hashPassword(password:string){const salt=crypto.randomBytes(16),hash=crypto.scryptSync(password,salt,64,{N:16384,r:8,p:1});return `scrypt$16384$8$1$${salt.toString('base64url')}$${hash.toString('base64url')}`;}
function verifyPassword(password:string,encoded:string){try{const [alg,N,r,p,saltB64,hashB64]=encoded.split('$');if(alg!=='scrypt')return false;const expected=Buffer.from(hashB64,'base64url'),actual=crypto.scryptSync(password,Buffer.from(saltB64,'base64url'),expected.length,{N:Number(N),r:Number(r),p:Number(p)});return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual);}catch{return false;}}
function b64(v:unknown){return Buffer.from(JSON.stringify(v)).toString('base64url');}

function normalizeCpf(v:unknown){const d=String(v??'').replace(/\D/g,'');if(d.length!==11||/^(\d)\1{10}$/.test(d))throw new BadRequestException('CPF inválido');const digit=(base:number)=>{let sum=0;for(let i=0;i<base;i++)sum+=Number(d[i])*(base+1-i);const r=(sum*10)%11;return r===10?0:r;};if(digit(9)!==Number(d[9])||digit(10)!==Number(d[10]))throw new BadRequestException('CPF inválido');return d;}
function cpfFingerprint(cpf:string,secret:string){return crypto.createHmac('sha256',secret).update(cpf).digest('hex');}

@Injectable()
export class AuthService {
  private readonly secret:string;
  private readonly piiSecret:string;
  constructor(private readonly db:DatabaseService){
    this.secret=process.env.URBIS_TOKEN_SECRET??'';this.piiSecret=process.env.URBIS_PII_HMAC_SECRET??'';
    if(this.secret.length<32) throw new Error('URBIS_TOKEN_SECRET must contain at least 32 characters');if(this.piiSecret.length<32)throw new Error('URBIS_PII_HMAC_SECRET must contain at least 32 characters');
  }
  private sign(data:string){return crypto.createHmac('sha256',this.secret).update(data).digest('base64url');}
  private issue(user:TokenUser){const now=Math.floor(Date.now()/1000),ttl=Math.max(300,Number(process.env.URBIS_ACCESS_TOKEN_TTL_SECONDS??3600));const h=b64({alg:'HS256',typ:'JWT'}),p=b64({sub:user.id,email:user.email,roles:user.roles,iat:now,exp:now+ttl,iss:'urbis-api',aud:'urbis'}),u=`${h}.${p}`;return {accessToken:`${u}.${this.sign(u)}`,tokenType:'Bearer',expiresIn:ttl,user};}
  verifyAccessToken(token:string){
    const parts=String(token??'').split('.');if(parts.length!==3)throw new UnauthorizedException('token inválido');const unsigned=`${parts[0]}.${parts[1]}`,a=Buffer.from(parts[2]),e=Buffer.from(this.sign(unsigned));if(a.length!==e.length||!crypto.timingSafeEqual(a,e))throw new UnauthorizedException('assinatura inválida');
    let p:any;try{p=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));}catch{throw new UnauthorizedException('payload inválido');}if(Number(p.exp)<=Math.floor(Date.now()/1000)||p.iss!=='urbis-api'||p.aud!=='urbis'||!p.sub||!Array.isArray(p.roles))throw new UnauthorizedException('token expirado ou fora de escopo');return p;
  }
  async register(body:Record<string,unknown>){
    const email=normalizeEmail(body.email),password=validatePassword(body.password),displayName=String(body.displayName??'Cidadão').trim().slice(0,120)||'Cidadão';const cpfHash=body.cpf?cpfFingerprint(normalizeCpf(body.cpf),this.piiSecret):null;
    const user=await this.db.tx(async c=>{const ex=await c.query(`SELECT 1 FROM users_account WHERE lower(email)=lower($1) OR ($2::text IS NOT NULL AND cpf_hash=$2)`,[email,cpfHash]);if(ex.rowCount)throw new ConflictException('e-mail ou CPF já cadastrado');const u=await c.query(`INSERT INTO users_account(email,cpf_hash,display_name,active) VALUES($1,$2,$3,true) RETURNING id,email,display_name`,[email,cpfHash,displayName]);await c.query(`INSERT INTO auth_identities(user_id,provider,subject,password_hash) VALUES($1,'LOCAL',$2,$3)`,[u.rows[0].id,email,hashPassword(password)]);await c.query(`INSERT INTO user_roles(user_id,role) VALUES($1,'CITIZEN')`,[u.rows[0].id]);return {id:u.rows[0].id,email:u.rows[0].email,displayName:u.rows[0].display_name,roles:['CITIZEN']};});return this.issue(user);
  }
  async login(body:Record<string,unknown>){
    const cpfHash=body.cpf?cpfFingerprint(normalizeCpf(body.cpf),this.piiSecret):null;const email=cpfHash?null:normalizeEmail(body.email);const q=await this.db.query(`SELECT u.id,u.email,u.display_name,u.active,a.password_hash,array_remove(array_agg(r.role::text),NULL) AS roles FROM users_account u JOIN auth_identities a ON a.user_id=u.id AND a.provider='LOCAL' LEFT JOIN user_roles r ON r.user_id=u.id WHERE (($1::text IS NOT NULL AND lower(u.email)=lower($1)) OR ($2::text IS NOT NULL AND u.cpf_hash=$2)) GROUP BY u.id,u.email,u.display_name,u.active,a.password_hash`,[email,cpfHash]);const r:any=q.rows[0];if(!r||!r.active||!verifyPassword(String(body.password??''),r.password_hash))throw new UnauthorizedException('credenciais inválidas');return this.issue({id:r.id,email:r.email,displayName:r.display_name,roles:r.roles??[]});
  }
  async me(id:string){const q=await this.db.query(`SELECT u.id,u.email,u.display_name,array_remove(array_agg(r.role::text),NULL) AS roles FROM users_account u LEFT JOIN user_roles r ON r.user_id=u.id WHERE u.id=$1 AND u.active=true GROUP BY u.id,u.email,u.display_name`,[id]);if(!q.rowCount)throw new UnauthorizedException('usuário inexistente');const r:any=q.rows[0];return {id:r.id,email:r.email,displayName:r.display_name,roles:r.roles??[]};}
}
