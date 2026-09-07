import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OccurrencesService } from './occurrences.service';
@Controller('v1/me') @UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly service:OccurrencesService){}
  @Get('occurrences') occurrences(@Req() req:any){return this.service.listForUser(req.urbisUser.sub);}
}
