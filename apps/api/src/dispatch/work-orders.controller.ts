import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';import { Roles } from '../auth/auth.decorators';import { RolesGuard } from '../auth/roles.guard';import { WorkOrdersService } from './work-orders.service';
@Controller('v1/work-orders')@UseGuards(AuthGuard,RolesGuard)
export class WorkOrdersController {constructor(private readonly service:WorkOrdersService){}
  @Get()@Roles('OPERATOR','MANAGER','ADMIN')list(@Query('limit')limit?:string){return this.service.list(limit)}
  @Post()@Roles('OPERATOR','MANAGER','ADMIN')create(@Body()body:Record<string,unknown>){return this.service.create(body)}
  @Post(':id/assign-team')@Roles('OPERATOR','MANAGER','ADMIN')assign(@Param('id')id:string,@Body()body:any){return this.service.assignTeam(id,String(body.teamId??''))}
  @Post(':id/status')@Roles('OPERATOR','MANAGER','ADMIN')status(@Param('id')id:string,@Body()body:Record<string,unknown>){return this.service.updateStatus(id,body)}
}
@Controller('v1/service-orders')@UseGuards(AuthGuard,RolesGuard)
export class ServiceOrdersCompatibilityController{constructor(private readonly service:WorkOrdersService){}
  @Post()@Roles('OPERATOR','MANAGER','ADMIN')create(@Body()body:Record<string,unknown>){return this.service.create(body)}
  @Get('team/:teamId')@Roles('OPERATOR','MANAGER','ADMIN','FIELD_AGENT')team(@Param('teamId')teamId:string,@Req()req:any){return this.service.listByTeam(teamId,req.urbisUser)}
  @Post(':id/assign-team')@Roles('OPERATOR','MANAGER','ADMIN')assign(@Param('id')id:string,@Body()body:any){return this.service.assignTeam(id,String(body.teamId??''))}
}
