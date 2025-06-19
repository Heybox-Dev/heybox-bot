/**
 * 定义日志方法的类型，用于输出日志信息
 * @param msg 日志信息字符串
 */
export declare type ILoggerMethod = (msg: string) => void;

/**
 * 定义日志记录器的类型，包含不同级别的日志方法
 */
export declare type ILogger = {
  /**
   * 输出调试级别日志信息
   * @param msg 日志信息字符串
   */
  debug: ILoggerMethod;

  /**
   * 输出错误级别日志信息
   * @param msg 日志信息字符串
   */
  error: ILoggerMethod;

  /**
   * 输出信息级别日志信息
   * @param msg 日志信息字符串
   */
  info: ILoggerMethod;

  /**
   * 输出警告级别日志信息
   * @param msg 日志信息字符串
   */
  warning: ILoggerMethod;
};
