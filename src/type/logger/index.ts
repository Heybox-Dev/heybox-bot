export declare type ILoggerMethod = (msg: string) => void;

export declare type ILogger = {
  debug: ILoggerMethod;
  error: ILoggerMethod;
  info: ILoggerMethod;
  warning: ILoggerMethod;
};
