import * as Sentry from '@sentry/node';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { json } from 'express';
import { AppModule } from './app.module';
async function bootstrap(){
  if(process.env.SENTRY_DSN) Sentry.init({dsn:process.env.SENTRY_DSN,environment:process.env.SENTRY_ENVIRONMENT??process.env.NODE_ENV??'development',sendDefaultPii:false});
  const app=await NestFactory.create(AppModule,{bodyParser:false});
  app.use(json({limit:'12mb'}));
  app.useWebSocketAdapter(new WsAdapter(app));
  const corsOrigin=process.env.URBIS_CORS_ORIGIN;
  app.enableCors(corsOrigin?{origin:corsOrigin.split(',').map(v=>v.trim()),allowedHeaders:['content-type','authorization']}:{origin:false});
  await app.listen(Number(process.env.PORT??3000));
}
bootstrap();
