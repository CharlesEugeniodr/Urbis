import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/auth.decorators';
import { EvidenceService } from './evidence.service';
@Controller('v1/occurrences/:occurrenceId') @UseGuards(AuthGuard,RolesGuard)
export class EvidenceController {
  constructor(private readonly evidence:EvidenceService){}
  @Get('evidence') list(@Param('occurrenceId') id:string,@Req() req:any){return this.evidence.list(id,req.urbisUser);}
  @Post('evidence') upload(@Param('occurrenceId') id:string,@Body() body:Record<string,unknown>,@Req() req:any){return this.evidence.upload(id,body,req.urbisUser);}
  @Post('evidence/:mediaId/authority-validate') @Roles('OPERATOR','MANAGER','ADMIN') validate(@Param('occurrenceId') id:string,@Param('mediaId') mediaId:string,@Req() req:any){return this.evidence.validateAuthority(id,mediaId,req.urbisUser);}
  @Get('ici') ici(@Param('occurrenceId') id:string,@Req() req:any){return this.evidence.ici(id,req.urbisUser);}
}
