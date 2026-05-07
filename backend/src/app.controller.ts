import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { SimpleAuthGuard } from './auth/simple-auth.guard';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

class CompareTheologyDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsString()
  @IsOptional()
  userId?: string;
}

@Controller('api/v1/ai')
export class AppController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @UseGuards(SimpleAuthGuard)
  @Post('compare')
  async compareTheology(@Body() body: CompareTheologyDto) {
    const { topic, userId } = body;
    const result = await this.orchestratorService.compareTheology(
      topic,
      userId || 'user-anonimo',
    );
    return { success: true, data: result };
  }

  @Get('locations')
  async getLocations() {
    const locations = await this.orchestratorService.getAllLocations();
    return { success: true, data: locations };
  }
}
