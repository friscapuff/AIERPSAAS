import { Module } from '@nestjs/common';
import { DynamicBuilderController } from './dynamic-builder.controller';
import { DynamicBuilderService } from './dynamic-builder.service';

@Module({
  controllers: [DynamicBuilderController],
  providers: [DynamicBuilderService],
})
export class DynamicBuilderModule {}
