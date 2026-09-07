import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OidcService } from './oidc.service';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth:AuthService,private readonly oidc:OidcService){}
  async canActivate(context:ExecutionContext){
    const req=context.switchToHttp().getRequest(),raw=String(req.headers.authorization??''),m=raw.match(/^Bearer\s+(.+)$/i);if(!m)throw new UnauthorizedException('autenticação obrigatória');
    try{req.urbisUser=this.auth.verifyAccessToken(m[1]);return true;}catch(localError){if(!this.oidc.enabled())throw localError;req.urbisUser=await this.oidc.verifyAndMap(m[1]);return true;}
  }
}
