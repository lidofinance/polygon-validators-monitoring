import { Module } from '@nestjs/common';
import { ConsoleModule as ConsoleModuleBase } from 'nestjs-console';

import { LoggerModule } from 'common/logger';

import { ConsoleService } from './console.service';

@Module({
  imports: [ConsoleModuleBase, LoggerModule],
  providers: [ConsoleService],
})
export class ConsoleModule {}
