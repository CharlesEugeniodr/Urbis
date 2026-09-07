import { Injectable } from '@nestjs/common';
@Injectable()
export class MetricsService{
  private durations:number[]=[];private total=0;private errors5xx=0;
  record(ms:number,status:number){this.total++;if(status>=500)this.errors5xx++;this.durations.push(ms);if(this.durations.length>5000)this.durations.shift();}
  snapshot(){const a=[...this.durations].sort((x,y)=>x-y),p=a.length?a[Math.min(a.length-1,Math.floor(a.length*.95))]:0;return {p95Ms:Number(p.toFixed(3)),total:this.total,errors5xx:this.errors5xx,errorRate:this.total?this.errors5xx/this.total:0};}
}
