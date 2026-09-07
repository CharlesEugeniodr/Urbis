import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { ResilienceController } from './resilience/resilience.controller';
import { ResilienceService } from './resilience/resilience.service';
import { TerritoryController } from './territory/territory.controller';
import { OccurrencesController } from './occurrences/occurrences.controller';
import { OperationsController } from './occurrences/operations.controller';
import { MeController } from './occurrences/me.controller';
import { OccurrencesService } from './occurrences/occurrences.service';
import { WorkOrdersController,ServiceOrdersCompatibilityController } from './dispatch/work-orders.controller';
import { WorkOrdersService } from './dispatch/work-orders.service';
import { DatabaseService } from './database/database.service';
import { RealtimeService } from './realtime/realtime.service';
import { RealtimeGateway } from './realtime/realtime.gateway';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { OidcService } from './auth/oidc.service';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { EvidenceController } from './evidence/evidence.controller';
import { EvidenceService } from './evidence/evidence.service';
import { ObjectStorageService } from './storage/object-storage.service';
import { RequirementsService } from './requirements/requirements.service';
import { RequirementsController,PublicRequirementsController } from './requirements/requirements.controller';
import { ReportsController } from './requirements/reports.controller';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsService } from './metrics/metrics.service';
import { MetricsInterceptor } from './metrics/metrics.interceptor';

@Module({
  controllers:[HealthController,ResilienceController,TerritoryController,AuthController,OccurrencesController,MeController,OperationsController,WorkOrdersController,ServiceOrdersCompatibilityController,EvidenceController,RequirementsController,PublicRequirementsController,ReportsController,MetricsController],
  providers:[DatabaseService,RealtimeService,RealtimeGateway,AuthService,OidcService,AuthGuard,RolesGuard,ObjectStorageService,EvidenceService,OccurrencesService,WorkOrdersService,RequirementsService,ResilienceService,MetricsService,{provide:APP_INTERCEPTOR,useClass:MetricsInterceptor}]
})
export class AppModule {}
