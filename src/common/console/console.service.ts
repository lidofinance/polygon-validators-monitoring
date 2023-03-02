import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleInit,
} from '@nestjs/common';
import { ConsoleService as ConsoleServiceBase } from 'nestjs-console';

@Injectable()
export class ConsoleService implements OnModuleInit {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly consoleService: ConsoleServiceBase,
  ) {}
  public async onModuleInit(): Promise<void> {
    const cli = this.consoleService.getCli();

    this.consoleService.createCommand(
      {
        command: 'hello',
      },
      this.hello.bind(this),
      cli,
    );

    this.logger.log('Console loaded ');
  }

  protected async hello(): Promise<void> {
    this.logger.log('Hello World!');
  }
}
