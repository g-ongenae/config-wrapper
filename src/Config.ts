import {
  get as getConfig,
  has as hasConfig,
} from 'config';
import { isEmpty, isNil, isUndefined } from 'lodash';

import { SilentLogger } from './SilentLogger';
import { DefaultOptions, Logger, Options, Priorities, ShortOptions, Types } from './spec';

//
// IMPLEMENTATION
//

/**
 * Class to require and parse
 */
export class Config {

  /**
   * To log events and follow it
   * Default: console
   */
  private log: Logger = console;
  /**
   * Default Priority
   */
  private priority: Priorities = Priorities.CONFIG;
  /**
   * Default threat: throw error or not
   */
  private threat: boolean = false;
  /**
   * Default return type
   */
  private type: Types = Types.STRING;

  constructor(defaultOpts: DefaultOptions) {
    this.setDefault(defaultOpts);
  }

  /**
   * Edit default configuration to the Config object
   */
  public setDefault(defaultOpts: DefaultOptions): void {
    this.setLogger(defaultOpts.log, defaultOpts.disableLog);
    this.priority = !isNil(defaultOpts.priority) ? defaultOpts.priority : this.priority;
    this.threat = !isNil(defaultOpts.threat) ? defaultOpts.threat : this.threat;
    this.type = !isNil(defaultOpts.type) ? defaultOpts.type : this.type;
  }

  /**
   * Edit logger for the Config object
   * @param log the logger to use
   * @param disableLog to silent log output
   */
  public setLogger(log?: Logger, disableLog?: boolean): void {
    if (!isNil(disableLog) && disableLog) {
      this.log = new SilentLogger();
    } else if (!isNil(log)) {
      this.log = log;
    }
  }

  /**
   * Shorthand method to getConfig
   * The only differences is that the name is shorter
   * And the properties name in opt is shorter too
   */
  public get<T>(o: ShortOptions): T {
    const opt: Options = {
      configName: o.c,
      defaultValue: o.d,
      name: o.n,
      priority: o.pri,
      processName: o.pro,
      threat: o.th,
      type: o.ty,
    };

    return this.getConfig<T>(opt);
  }

  /**
   * Get config from config, process
   * The order to try is set by priority
   * Or fallback to defaultValue
   */
  public getConfig<T>(opt: Options): T {
    if (isNil(opt) || isEmpty(opt)) {
      throw new Error(`No options provided to load config ${opt}`);
    }

    if (isNil(opt.name) && isNil(opt.configName) && isNil(opt.processName)) {
      throw new Error(`No config name provided in params ${opt}`);
    }

    if (!isNil(opt.name)) {
      opt.processName = !isNil(opt.processName) ? opt.processName : opt.name;
      opt.configName = !isNil(opt.configName) ? opt.configName : opt.name;
    }

    const priorValue: T | undefined = this.getWithPriority(opt) as T | undefined;
    if (!isUndefined(priorValue)) {
      return priorValue as T;
    }

    opt.priority = opt.priority === Priorities.CONFIG ?
      Priorities.PROCESS :
      Priorities.CONFIG;
    const secondValue: T | undefined = this.getWithPriority(opt) as T | undefined;
    if (!isUndefined(secondValue)) {
      return secondValue as T;
    }

    return opt.defaultValue as T;
  }

  /**
   * Get config from the way set in priority
   */
  private getWithPriority(opt: Options): any {
    const priority: Priorities = !isNil(opt.priority) ? opt.priority : this.priority;
    opt.threat = !isNil(opt.threat) ? opt.threat : this.threat;

    switch (priority) {
      case Priorities.CONFIG:
        this.log.info(`Trying to retrieve config ${opt.configName} through config`);

        return this.getFromConfig(opt);

      case Priorities.PROCESS:
        this.log.info(`Trying to retrieve config ${opt.processName} through env`);

        return this.getAndParseFromProcess(opt);

      default:
        if (opt.threat) {
          throw new Error(`Invalid priority ${opt.priority}`);
        }
        this.log.error(`Invalid priority ${opt.priority}`);

        return undefined;
    }
  }

  /**
   * Get from config module
   * Not needed to parse as it already is
   */
  private getFromConfig(opt: Options): any {
    if (hasConfig(opt.configName as string)) {
      return getConfig(opt.configName as string);
    } else if (opt.threat as boolean) {
      throw new Error(`No secret defined for ${opt.configName}`);
    } else {
      this.log.warn(`No secret defined for ${opt.configName}`);

      return undefined;
    }
  }

  /**
   * Get config from process environnement (nodejs natif)
   * And parse as the desired type
   */
  private getAndParseFromProcess(opt: Options): any {
    const processValueUnparsed: string | undefined = process.env[opt.processName as string];
    const type: Types = !isNil(opt.type) ? opt.type : this.type;

    if (isNil(processValueUnparsed) || isEmpty(processValueUnparsed)) {
      this.log.warn(`No env defined for ${opt.processName}`);

      return undefined;
    }

    this.log.info(`Going to parse process env value of ${opt.processName}`);

    return this.parseProcessEnvValue(opt, type, processValueUnparsed);
  }

  /**
   * Parse as the desired type
   */
  private parseProcessEnvValue(opt: Options, type: Types, unparsed: string): any {
    let error: string | undefined;

    switch (type) {
      case Types.JSON:
        try {
          return JSON.parse(unparsed);
        } catch (err) {
          if (opt.threat as boolean) {
            throw new Error(`Unable to parse JSON for ${opt.processName}: ${err}`);
          }
          this.log.error(`Unable to parse JSON for ${opt.processName}: ${err}`);
        }
        break;

      case Types.ARRAY:
        return unparsed.split(',');

      case Types.BOOLEAN:
        const booleans: { [key: string]: boolean } = {
          false: false,
          true: true,
        };
        if (booleans.hasOwnProperty(unparsed)) {
          return booleans[unparsed];
        }
        error = 'Not a boolean value';
        break;

      case Types.INTEGER:
        if (`${parseInt(unparsed, 10)}` === unparsed) {
          return parseInt(unparsed, 10);
        }
        error = 'Not a valid parsable for integer string';
        break;

      case Types.FLOAT:
        if (`${parseFloat(unparsed)}` === unparsed) {
          return parseFloat(unparsed);
        }
        error = 'Not a valid parsable for float string';
        break;

      case Types.STRING:
        // May bring advantages to be able to set to null
        if (unparsed === 'null') {
          return null;
        }

        return unparsed;

      case Types.NULL:
        if (unparsed === 'null') {
          return null;
        }
        break;

      default:
        error = `Unknow config types ${type}`;
        break;
    }

    if (!isNil(error)) {
      if (opt.threat as boolean) {
        throw new Error(`${error} for ${opt.processName}`);
      }
      this.log.error(`${error} for ${opt.processName}`);
    }

    // Check for next priority or return default value
    return undefined;
  }
}

// Export also as default to enable choice on import
export default Config;
