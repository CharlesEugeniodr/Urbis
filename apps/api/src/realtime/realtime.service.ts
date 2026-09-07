import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import { createClient, RedisClientType } from 'redis';

export type UrbisRealtimeEvent={topic:string;entityType:string;entityId:string;payload:Record<string,unknown>;at:string};

@Injectable()
export class RealtimeService implements OnModuleInit,OnModuleDestroy {
  private readonly emitter=new EventEmitter();
  private readonly instanceId=crypto.randomUUID();
  private pub?:RedisClientType;
  private sub?:RedisClientType;
  private redisReady=false;
  async onModuleInit(){
    const url=process.env.REDIS_URL;if(!url)return;
    this.pub=createClient({url});this.sub=this.pub.duplicate();
    this.pub.on('error',e=>console.error('URBIS redis pub',e));this.sub.on('error',e=>console.error('URBIS redis sub',e));
    await Promise.all([this.pub.connect(),this.sub.connect()]);this.redisReady=true;
    await this.sub.subscribe('urbis:realtime',(raw)=>{try{const m=JSON.parse(raw);if(m.origin===this.instanceId)return;this.emitter.emit('urbis',m.event);}catch{}});
  }
  publish(event:Omit<UrbisRealtimeEvent,'at'>){
    const full={...event,at:new Date().toISOString()};this.emitter.emit('urbis',full);
    if(this.redisReady)this.pub?.publish('urbis:realtime',JSON.stringify({origin:this.instanceId,event:full})).catch(()=>undefined);
    return full;
  }
  subscribe(listener:(event:UrbisRealtimeEvent)=>void){this.emitter.on('urbis',listener);return ()=>this.emitter.off('urbis',listener);}
  async onModuleDestroy(){await Promise.allSettled([this.sub?.quit(),this.pub?.quit()].filter(Boolean) as Promise<unknown>[]);}
}
