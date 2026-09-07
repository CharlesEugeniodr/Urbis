import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { URBIS_ROLES } from './auth.decorators';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector:Reflector){}
  canActivate(context:ExecutionContext){const required=this.reflector.getAllAndOverride<string[]>(URBIS_ROLES,[context.getHandler(),context.getClass()])??[];if(!required.length)return true;const roles=(context.switchToHttp().getRequest().urbisUser?.roles??[]).map((x:string)=>x.toUpperCase());if(roles.includes('ADMIN')||required.some(r=>roles.includes(r)))return true;throw new ForbiddenException('papel insuficiente');}
}
