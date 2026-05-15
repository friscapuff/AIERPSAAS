import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { appConfig } from './config/app.config';
import { CommonModule } from './common/common.module';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const dbConfig = configService.get('database');
        return {
          ...dbConfig,
          entities: [path.join(__dirname, '**/*.entity{.ts,.js}')],
          migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
          subscribers: [path.join(__dirname, 'subscribers/*{.ts,.js}')],
          autoLoadEntities: true,
        } as TypeOrmModuleOptions;
      },
    }),
    CommonModule,
  ],
})
export class AppModule {}
