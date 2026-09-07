import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth:AuthService){}
  @Post('register') register(@Body() body:Record<string,unknown>){return this.auth.register(body);}
  @Post('login') login(@Body() body:Record<string,unknown>){return this.auth.login(body);}
  @Get('me') @UseGuards(AuthGuard) me(@Req() req:any){return this.auth.me(req.urbisUser.sub);}
}
