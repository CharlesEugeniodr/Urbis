import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { WebSocket, WebSocketServer as WsServer } from 'ws';
import { AuthService } from '../auth/auth.service';
import { OidcService } from '../auth/oidc.service';
import { RealtimeService, UrbisRealtimeEvent } from './realtime.service';

@WebSocketGateway({path:'/ws/occurrences'})
export class RealtimeGateway implements OnModuleInit,OnModuleDestroy {
  @WebSocketServer() server!:WsServer;
  private unsubscribe?:()=>void;
  constructor(private readonly realtime:RealtimeService,private readonly auth:AuthService,private readonly oidc:OidcService){}
  async handleConnection(client:WebSocket,...args:any[]){
    try{
      const req=args[0];const url=new URL(req?.url??'/ws/occurrences','http://urbis.local'),token=url.searchParams.get('access_token')??'';
      let claims:any;try{claims=this.auth.verifyAccessToken(token);}catch(e){if(!this.oidc.enabled())throw e;claims=await this.oidc.verifyAndMap(token);}
      const roles=(claims.roles??[]).map((x:string)=>x.toUpperCase());if(!roles.some((r:string)=>['OPERATOR','MANAGER','ADMIN'].includes(r)))throw new Error('forbidden');
    }catch{client.close(1008,'unauthorized');}
  }
  onModuleInit(){this.unsubscribe=this.realtime.subscribe((event:UrbisRealtimeEvent)=>{const payload=JSON.stringify(event);for(const client of this.server?.clients??[]){if(client.readyState===WebSocket.OPEN)client.send(payload);}});}
  onModuleDestroy(){this.unsubscribe?.();}
}
