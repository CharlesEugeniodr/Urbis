import { Controller, Get } from '@nestjs/common';

@Controller('v1/health')
export class HealthController {
  @Get()
  get(){
    return {
      status:'ok',
      service:'urbis-api',
      version:'0.5.0-alpha.1',
      timestamp:new Date().toISOString()
    };
  }
}
