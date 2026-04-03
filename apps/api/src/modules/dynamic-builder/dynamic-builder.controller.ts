import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DynamicBuilderService } from './dynamic-builder.service';
import { CreateTableDto } from './dto/create-table.dto';

@ApiTags('Dynamic Builder')
@Controller('dynamic-builder')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class DynamicBuilderController {
  constructor(private readonly service: DynamicBuilderService) {}

  @Post('tables')
  createTable(@Body() createTableDto: CreateTableDto) {
    return this.service.createTable(createTableDto);
  }

  @Get('tables')
  getTables() {
    return this.service.listTables();
  }

  @Get('tables/:tableId')
  getTable(@Param('tableId') tableId: string) {
    return this.service.getTable(tableId);
  }

  @Delete('tables/:tableId')
  deleteTable(@Param('tableId') tableId: string) {
    return this.service.deleteTable(tableId);
  }
}
