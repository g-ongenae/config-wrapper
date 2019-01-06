//
// DECLARATIONS
//

export enum Priorities {
  CONFIG,
  PROCESS,
}

export enum Types {
  ARRAY = 'ARRAY',
  BOOLEAN = 'BOOLEAN',
  FLOAT = 'FLOAT',
  INTEGER = 'INTEGER',
  JSON = 'JSON',
  NULL = 'NULL',
  STRING = 'STRING',
  DATE = 'DATE',
}

export declare interface Options {
  configName?: string;
  defaultValue: any;
  name?: string;
  processName?: string;
  priority?: Priorities;
  threat?: boolean;
  type?: Types;
}

export declare interface ShortOptions {
  c?: string; // for configName
  d: any; // for defaultValue
  n?: string; // for name
  pro?: string; // for processName
  pri?: Priorities; // for priority
  th?: boolean; // for threat
  ty?: Types; // for type
}

export declare interface DefaultOptions {
  disableLog?: boolean;
  log?: Logger;
  priority?: Priorities;
  threat?: boolean;
  type: Types;
}

export declare interface Logger {
  error: Function;
  info: Function;
  warn: Function;
}
