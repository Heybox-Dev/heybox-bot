// 导入winston库中的createLogger、Logger、transports和format模块，以及dayjs库
import { createLogger, Logger, transports, format } from 'winston';
import dayjs from 'dayjs';

// 定义LoggerFactory类
export class LoggerFactory {
  /**
   * 创建一个Logger实例
   *
   * @param name 日志的名称，用于在日志条目中标识，可选，默认为undefined
   * @param path 日志文件的存储路径，可选，默认为当前工作目录
   * @param logLevel 日志级别，可选，默认为'info'，可选值包括'debug'、'info'、'warn'和'error'
   * @returns 返回一个配置好的Logger实例
   */
  public static createLogger(
    name: string | undefined = undefined,
    path: string = process.cwd(),
    logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'
  ): Logger {
    // 使用winston的createLogger方法创建并返回一个Logger实例
    return createLogger({
      // 设置日志级别
      level: logLevel,
      // 配置日志传输（输出）的方式，包括控制台和文件
      transports: [
        // 配置控制台日志输出
        new transports.Console({
          // 结合颜色格式化和自定义打印格式
          format: format.combine(
            format.colorize(),
            format.printf(
              info =>
                `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}]${name ? `[${name}]` : ''}[${info.level}] ${info.message}`
            )
          )
        }),
        // 配置文件日志输出
        new transports.File({
          // 指定日志文件的名称和路径
          filename: `${path}/latest.log`,
          // 使用自定义打印格式
          format: format.printf(
            info =>
              `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}]${name ? `[${name}]` : ''}[${info.level}] ${info.message}`
          )
        })
      ]
    });
  }
}
