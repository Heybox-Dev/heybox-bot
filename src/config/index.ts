/**
 * Bot配置接口
 * 定义了Bot运行所需的配置参数
 */
export default interface BotConfig {
  // Bot的认证令牌，用于验证Bot的身份
  readonly token: string;

  // 日志输出级别，可选，默认为'info'
  // 不同的级别可以帮助开发者根据需要查看不同详细程度的日志信息
  readonly logLevel?: 'debug' | 'info' | 'warn' | 'error';

  // 代理服务器配置，可选
  // 当Bot需要通过代理服务器访问网络时使用
  readonly proxy?: {
    // 代理服务器的主机名或IP地址
    readonly host: string;
    // 代理服务器的端口号
    readonly port: number;
    // 代理服务器使用的协议，只能是'http'或'https'
    readonly protocol: 'http' | 'https';
  };
}
