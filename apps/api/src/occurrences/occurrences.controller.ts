import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/auth.decorators';
import { RolesGuard } from '../auth/roles.guard';
import { OccurrencesService } from './occurrences.service';

@Controller('v1/occurrences')
@UseGuards(AuthGuard,RolesGuard)
export class OccurrencesController {
  constructor(private readonly service:OccurrencesService){}
  @Post() @Roles('CITIZEN','OPERATOR','MANAGER','ADMIN') create(@Body() body:Record<string,unknown>,@Req() req:any){return this.service.create({...body,reporterUserId:req.urbisUser.sub});}
  @Get() @Roles('OPERATOR','MANAGER','ADMIN') list(@Query() query:Record<string,string>){return this.service.list(query);}
  @Get('map') @Roles('OPERATOR','MANAGER','ADMIN') map(@Query() query:Record<string,string>){return this.service.list(query);}
  @Get(':id') get(@Param('id') id:string,@Req() req:any){return this.service.get(id,req.urbisUser);}
  @Post(':id/triage') @Roles('OPERATOR','MANAGER','ADMIN') triage(@Param('id') id:string,@Body() body:Record<string,unknown>){return this.service.triage(id,body as any);}
}
