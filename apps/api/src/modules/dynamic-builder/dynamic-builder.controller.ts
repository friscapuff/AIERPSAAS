import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { DynamicBuilderService } from './dynamic-builder.service';

interface DynamicFormDto {
  name: string;
  description?: string;
  fields: any[];
  metadata?: Record<string, any>;
}

@Controller('dynamic-builder')
export class DynamicBuilderController {
  constructor(private readonly dynamicBuilderService: DynamicBuilderService) {}

  @Get('forms')
  async getForms() {
    return this.dynamicBuilderService.getForms();
  }

  @Get('forms/:id')
  async getForm(@Param('id') id: string) {
    return this.dynamicBuilderService.getForm(id);
  }

  @Post('forms')
  async createForm(@Body() createFormDto: DynamicFormDto) {
    return this.dynamicBuilderService.createForm(createFormDto);
  }

  @Put('forms/:id')
  async updateForm(
    @Param('id') id: string,
    @Body() updateFormDto: Partial<DynamicFormDto>,
  ) {
    return this.dynamicBuilderService.updateForm(id, updateFormDto);
  }

  @Delete('forms/:id')
  async deleteForm(@Param('id') id: string) {
    return this.dynamicBuilderService.deleteForm(id);
  }
}
