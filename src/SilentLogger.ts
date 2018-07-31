//
// HELPER
//

export declare interface Logger {
  error: Function;
  info: Function;
  warn: Function;
}

/**
 * Small class to not log events
 */
export class SilentLogger implements Logger {
  /**
   * Error Logger
   */
  public error(_e: string): void {}

  /**
   * Info Logger
   */
  public info(_i: string): void {}

  /**
   * Info Logger
   */
  public warn(_w: string): void {}
}
