export default interface BotConfig {
  readonly token: string;
  readonly logLevel?: 'debug' | 'info' | 'warn' | 'error';
  readonly proxy?: {
    readonly host: string;
    readonly port: number;
    readonly protocol: 'http' | 'https';
  };
}
