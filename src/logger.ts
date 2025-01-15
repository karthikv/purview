export interface ILogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

// Default no-op logger
class NoopLogger implements ILogger {
  debug() {}
  info() {}
  warn() {}
  error() {}
}
  
export class PurviewLogger {
  private static instance: ILogger = new NoopLogger();

  static setLogger(logger: ILogger) {
    this.instance = logger;
  }

  static debug(message: string, meta?: any) {
    this.instance.debug(message, meta);
  }

  static info(message: string, meta?: any) {
    this.instance.info(message, meta);
  }

  static warn(message: string, meta?: any) {
    this.instance.warn(message, meta);
  }

  static error(message: string, meta?: any) {
    this.instance.error(message, meta);
  }
}
