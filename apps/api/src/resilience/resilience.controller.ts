import { Body, Controller, Post } from '@nestjs/common';
import { ResilienceService } from './resilience.service';

@Controller('v1/resilience')
export class ResilienceController {
  constructor(private readonly service:ResilienceService){}
  @Post('evaluate')
  evaluate(@Body() body:Record<string,unknown>){return this.service.evaluate(body);}
}
