import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/auth.decorators';
import { RolesGuard } from '../auth/roles.guard';
import { OccurrencesService } from './occurrences.service';
@Controller('v1/operations') @UseGuards(AuthGuard,RolesGuard)
export class OperationsController {
  constructor(private readonly service:OccurrencesService){}
  @Get('summary') @Roles('OPERATOR','MANAGER','ADMIN') summary(){return this.service.summary();}
}
