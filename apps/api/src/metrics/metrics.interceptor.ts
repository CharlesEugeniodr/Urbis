import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';import { Observable, finalize } from 'rxjs';import { MetricsService } from './metrics.service';
@Injectable()
export class MetricsInterceptor implements NestInterceptor{constructor(private readonly metrics:MetricsService){}intercept(context:ExecutionContext,next:CallHandler):Observable<any>{const start=process.hrtime.bigint(),res=context.switchToHttp().getResponse();return next.handle().pipe(finalize(()=>this.metrics.record(Number(process.hrtime.bigint()-start)/1e6,Number(res?.statusCode??200))));}}
