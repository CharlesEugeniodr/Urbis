import { Body, Controller, Get, Param, Post, Query, Req, Sse, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';import { RolesGuard } from '../auth/roles.guard';import { Roles } from '../auth/auth.decorators';import { RequirementsService } from './requirements.service';
@Controller('v1')@UseGuards(AuthGuard,RolesGuard)
export class RequirementsController{constructor(private readonly s:RequirementsService){}
@Post('occurrences/:id/evaluation')@Roles('CITIZEN')evaluation(@Param('id')id:string,@Body()b:any,@Req()r:any){return this.s.evaluateOccurrence(id,r.urbisUser.sub,b.rating,b.comment)}
@Post('occurrences/:id/score')@Roles('MANAGER','ADMIN')score(@Param('id')id:string,@Body()b:any,@Req()r:any){return this.s.validateScore(id,r.urbisUser.sub,b.basePoints,b.bonusPoints,b.reason)}
@Get('rankings/current')ranking(){return this.s.rankingCurrent()}
@Get('me/score')@Roles('CITIZEN')myScore(@Req()r:any){return this.s.myScore(r.urbisUser.sub)}
@Get('me/notifications')myNotifications(@Req()r:any){return this.s.myNotifications(r.urbisUser.sub)}
@Post('me/devices')@Roles('CITIZEN','FIELD_AGENT','OPERATOR','MANAGER','ADMIN')device(@Req()r:any,@Body()b:any){return this.s.registerDevice(r.urbisUser.sub,b)}
@Post('me/privacy-requests')privacyRequest(@Req()r:any,@Body()b:any){return this.s.createPrivacyRequest(r.urbisUser.sub,b)}
@Get('me/privacy-requests')privacyRequests(@Req()r:any){return this.s.myPrivacyRequests(r.urbisUser.sub)}
@Get('alerts')alerts(@Query('lat')lat?:string,@Query('lon')lon?:string){return this.s.alerts(lat==null?undefined:Number(lat),lon==null?undefined:Number(lon))}
@Post('alerts')@Roles('MANAGER','ADMIN')createAlert(@Body()b:any){return this.s.createAlert(b)}
@Get('dashboard/summary')@Roles('OPERATOR','MANAGER','ADMIN')dashboard(){return this.s.dashboard()}
@Get('occurrences/:id/warranty-matches')@Roles('OPERATOR','MANAGER','ADMIN')warranty(@Param('id')id:string){return this.s.warrantyMatches(id)}
@Get('teams')@Roles('OPERATOR','MANAGER','ADMIN')teams(){return this.s.listTeams()}
@Post('teams')@Roles('MANAGER','ADMIN')createTeam(@Body()b:any){return this.s.createTeam(b)}
@Post('teams/:teamId/members')@Roles('MANAGER','ADMIN')addMember(@Param('teamId')teamId:string,@Body()b:any){return this.s.addTeamMember(teamId,String(b.userId??''))}
@Get('field/work-orders')@Roles('FIELD_AGENT')fieldOrders(@Req()r:any){return this.s.fieldOrders(r.urbisUser.sub)}
@Get('field/work-orders/:id/route')@Roles('FIELD_AGENT')fieldRoute(@Req()r:any,@Param('id')id:string,@Query('lat')lat:string,@Query('lon')lon:string){return this.s.fieldRoute(r.urbisUser.sub,id,Number(lat),Number(lon))}
@Post('field/work-orders/:id/status')@Roles('FIELD_AGENT')fieldStatus(@Req()r:any,@Param('id')id:string,@Body()b:any){return this.s.fieldStatus(r.urbisUser.sub,id,b)}
}
@Controller('public')
export class PublicRequirementsController{constructor(private readonly s:RequirementsService){}@Get('summary')summary(){return this.s.dashboard()}@Get('occurrences')occ(){return this.s.publicOccurrences()}@Get('protocol/:protocol')protocol(@Param('protocol')p:string){return this.s.publicProtocol(p)}@Get('rankings/current')ranking(){return this.s.rankingCurrent()}@Get('alerts')alerts(@Query('lat')lat?:string,@Query('lon')lon?:string){return this.s.alerts(lat==null?undefined:Number(lat),lon==null?undefined:Number(lon))}@Sse('stream')stream(){return this.s.publicStream()}}
