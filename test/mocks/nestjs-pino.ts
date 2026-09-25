import { DynamicModule, Module } from '@nestjs/common';

@Module({})
export class LoggerModule {
  static forRoot(): DynamicModule {
    return {
      module: LoggerModule,
    };
  }

  static forRootAsync(): DynamicModule {
    return {
      module: LoggerModule,
    };
  }
}

export class Logger {
  log() {}
  error() {}
  warn() {}
  debug() {}
  verbose() {}
}
