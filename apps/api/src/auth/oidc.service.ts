import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { DatabaseService } from '../database/database.service';

const KNOWN_ROLES=new Set(['CITIZEN','OPERATOR','FIELD_AGENT','MANAGER','ADMIN']);
@Injectable()
export class OidcService {
  private readonly issuer=(process.env.OIDC_ISSUER_URL??'').replace(/\/$/,'');
  private readonly audience=process.env.OIDC_AUDIENCE??process.env.OIDC_CLIENT_ID??'urbis-api';
  private jwks?:ReturnType<typeof createRemoteJWKSet>;
  constructor(private readonly db:DatabaseService){if(this.issuer)this.jwks=createRemoteJWKSet(new URL(`${this.issuer}/protocol/openid-connect/certs`));}
  enabled(){return Boolean(this.issuer&&this.jwks);}
  async verifyAndMap(token:string){
    if(!this.jwks)throw new UnauthorizedException('OIDC não configurado');
    let payload:any;try{({payload}=await jwtVerify(token,this.jwks,{issuer:this.issuer,audience:this.audience}));}catch{throw new UnauthorizedException('token OIDC inválido');}
    const subject=String(payload.sub??''),email=String(payload.email??'').trim().toLowerCase();if(!subject||!email)throw new UnauthorizedException('token OIDC sem sub/email');
    const realmRoles=Array.isArray(payload?.realm_access?.roles)?payload.realm_access.roles:[];
    const clientRoles=Array.isArray(payload?.resource_access?.[process.env.OIDC_CLIENT_ID??'urbis-api']?.roles)?payload.resource_access[process.env.OIDC_CLIENT_ID??'urbis-api'].roles:[];
    const requested=[...realmRoles,...clientRoles].map((x:any)=>String(x).toUpperCase()).filter((x:string)=>KNOWN_ROLES.has(x));
    const mapped=await this.db.tx(async c=>{
      const idq=await c.query(`SELECT u.id,u.email,u.display_name,u.active FROM auth_identities a JOIN users_account u ON u.id=a.user_id WHERE a.provider='OIDC' AND a.subject=$1`,[subject]);
      let user=idq.rows[0];
      if(!user){
        const byEmail=await c.query(`SELECT id,email,display_name,active FROM users_account WHERE lower(email)=lower($1) LIMIT 1`,[email]);
        if(byEmail.rowCount)user=byEmail.rows[0];else{const ins=await c.query(`INSERT INTO users_account(email,display_name,active) VALUES($1,$2,true) RETURNING id,email,display_name,active`,[email,String(payload.name??payload.preferred_username??'Cidadão').slice(0,120)]);user=ins.rows[0];}
        await c.query(`INSERT INTO auth_identities(user_id,provider,subject,metadata) VALUES($1,'OIDC',$2,$3) ON CONFLICT(provider,subject) DO NOTHING`,[user.id,subject,JSON.stringify({issuer:this.issuer})]);
        await c.query(`INSERT INTO user_roles(user_id,role) VALUES($1,'CITIZEN') ON CONFLICT DO NOTHING`,[user.id]);
      }
      if(!user.active)throw new UnauthorizedException('usuário inativo');
      // OIDC pode conferir papéis reconhecidos; ADMIN continua dependendo de configuração explícita do IdP.
      for(const role of requested)await c.query(`INSERT INTO user_roles(user_id,role) VALUES($1,$2::urbis_role) ON CONFLICT DO NOTHING`,[user.id,role]);
      const rq=await c.query(`SELECT array_remove(array_agg(role::text),NULL) roles FROM user_roles WHERE user_id=$1`,[user.id]);
      return {sub:user.id,email:user.email,displayName:user.display_name,roles:rq.rows[0]?.roles??['CITIZEN'],iss:this.issuer,aud:this.audience,externalSub:subject};
    });
    return mapped;
  }
}
