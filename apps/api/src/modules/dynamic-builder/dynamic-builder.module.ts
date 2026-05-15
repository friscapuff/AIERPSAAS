import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetadataRegistry, DynamicData } from '@libs/database';
import { DynamicBuilderController } from './dynamic-builder.controller';
import { DynamicBuilderService } from './dynamic-builder.service';

@Module({
  imports: [TypeOrmModule.forFeature([MetadataRegistry, DynamicData])],
  controllers: [DynamicBuilderController],
  providers: [DynamicBuilderService],
  exports: [DynamicBuilderService],
})
export class DynamicBuilderModule {}
