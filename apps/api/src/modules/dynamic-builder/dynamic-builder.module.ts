import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamicDataEntity } from 'libs/database/src/entities/dynamic-data.entity';
import { MetadataRegistry } from 'libs/database/src/entities/metadata-registry.entity';
import { DynamicBuilderController } from './dynamic-builder.controller';
import { DynamicBuilderService } from './dynamic-builder.service';

@Module({
  imports: [TypeOrmModule.forFeature([DynamicDataEntity, MetadataRegistry])],
  controllers: [DynamicBuilderController],
  providers: [DynamicBuilderService],
  exports: [DynamicBuilderService],
})
export class DynamicBuilderModule {}
