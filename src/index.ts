import { EventManager } from 'gugle-event';
import { RawData, WebSocket } from 'ws';
import * as process from 'node:process';
import { BotConfig } from './config';
import { Constants } from './constants/constants';
import { HeyBoxCommandManager } from './command';
import { MessageImpl } from './type/impl';
import { Logger } from 'winston';
import dayjs from 'dayjs';
import {
  BotEvent,
  BotEventCancelable,
  CommandMessage,
  EventCallback,
  TextMessage,
  UserBaseInfo,
  WebSocketMessage
} from './type/define';
import { sendMessage } from './utils';
import { LoggerFactory } from './logger';
import * as fs from 'node:fs';

/**
 * `HeyBoxBot` 类代表一个聊天机器人，用于处理命令和事件
 */
// noinspection JSUnusedGlobalSymbols
export class HeyBoxBot {
  private path: string = process.cwd();
  private logger?: Logger;
  private heartbeatTimes: number = 0;

  /**
   * 机器人配置对象，包含机器人运行所需的各种配置信息
   */
  private readonly config: BotConfig;

  /**
   * 命令管理器，用于处理和管理机器人接收到的各种命令
   */
  private readonly commandManager?: HeyBoxCommandManager;

  /**
   * 事件管理器，用于处理和管理机器人接收到的各种事件
   */
  private readonly eventManager: EventManager;

  /**
   * WebSocket连接，用于与服务器进行实时通信
   */
  private readonly ws: WebSocket;

  /**
   * 标记WebSocket连接是否已打开
   */
  private wsOpened: boolean = false;

  /**
   * 构造函数，用于初始化机器人实例
   * @param config {BotConfig} 机器人配置对象，包含机器人运行所需的各种配置信息
   */
  public constructor(config: BotConfig) {
    // 将传入的配置对象赋值给实例变量config
    this.config = config;
    // 初始化事件管理器实例
    this.eventManager = new EventManager();
    // 初始化命令管理器实例
    this.commandManager = new HeyBoxCommandManager({
      debug: msg => {
        this.logger?.debug(msg);
      },
      info: msg => {
        this.logger?.info(msg);
      },
      warning: msg => {
        this.logger?.warning(msg);
      },
      error: msg => {
        this.logger?.error(msg);
      }
    });
    // 根据WebSocketURL模板和当前配置的token创建WebSocket连接
    this.ws = new WebSocket(
      `${Constants.WSS_URL}${Constants.COMMON_PARAMS}${Constants.TOKEN_PARAMS}${this.config.token || ''}`
    );
    // 当WebSocket连接打开时，启动定时器每30秒发送一个PING保持连接
    this.ws.on('open', () => {
      // 标记WebSocket连接已打开
      this.wsOpened = true;
      // 定义并启动PING发送定时器
      const ping = () => {
        if (this.heartbeatTimes > 5) {
          this.logger?.error('WebSocket connection lost, reconnecting...');
          this.ws.terminate();
          return;
        }
        this.ws.send('PING');
        this.heartbeatTimes += 1;
        setTimeout(ping, 30000);
      };
      ping();
    });
  }

  /**
   * 异步启动方法，用于启动HeyBoxBot实例
   * 此方法允许指定一个可选的路径参数，默认为当前工作目录
   * 它在启动前后分别触发一系列事件，并设置WebSocket消息监听器
   *
   * @param {string} path - 启动的目录路径，默认为当前工作目录
   * @returns {Promise<HeyBoxBot>} 返回实例本身，允许链式调用
   */
  public async start(path: string = process.cwd()): Promise<HeyBoxBot> {
    // 在启动前触发'before-start'事件，传递当前实例和路径作为参数
    await this.post('before-start', this, path).then(args => {
      // 根据'before-start'事件处理结果更新路径
      path = args[1];
      this.path = path;
      const logPath = `${this.path}/logs`;
      if (!fs.existsSync(logPath)) fs.mkdirSync(logPath);
      if (fs.existsSync(`${logPath}/latest.log`)) {
        let logName = `${logPath}/${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.log`;
        let count = 0;
        while (fs.existsSync(logName)) {
          count++;
          logName = `${logPath}/${dayjs().format('YYYY-MM-DD-HH-mm-ss')}-${count}.log`;
        }
        fs.renameSync(`${logPath}/latest.log`, logName);
      }
      this.logger = LoggerFactory.createLogger('HeyBoxBot', logPath, this.config.logLevel || 'info');
      this.logger.info(`HeyBox Bot starting...`);
      this.eventManager.listen('websocket-message', this.onWebsocketMsg);
      this.eventManager.listen('command-message', this.onCommandMessage);
      // 设置WebSocket消息监听器
      this.ws.on('message', event => {
        // 当接收到WebSocket消息时，触发'websocket-message'事件
        this.post('websocket-message', this, event);
      });
      // 在启动后触发'after-start'事件，传递当前实例作为参数
      this.post('after-start', this).then();
    });
    // 返回实例本身，支持链式调用
    return this;
  }

  /**
   * 停止HeyBoxBot实例
   *
   * 此方法在停止机器人之前和之后执行一些钩子函数，确保资源被适当管理
   * 如果WebSocket连接是打开的状态，则会关闭该连接
   *
   * @returns {HeyBoxBot} 返回HeyBoxBot实例，允许链式调用
   */
  public stop(): HeyBoxBot {
    // 在停止之前触发'before-stop'事件，传递当前实例
    this.post('before-stop', this).then(() => {
      // 如果WebSocket连接是打开的状态，关闭连接
      if (this.wsOpened) this.ws.close();
      // 在停止之后触发'after-stop'事件，传递当前实例
      this.post('after-stop', this).then();
    });
    return this;
  }

  /**
   * 定义一个命令装饰器，用于在类中动态添加命令处理逻辑
   *
   * @param command 命令的字符串表示，用于指定命令的结构和参数
   * @param permission 可选的权限字符串，用于限定执行该命令所需的权限
   * @returns (executor: (...args: any) => boolean) => void 返回一个函数，该函数接受一个执行器函数作为参数，并在适当的时候调用它
   *
   * @example
   * @ bot.command('/test {arg1: NUMBER} {arg2?: NUMBER}')
   * public calc(source: CommandSource, arg1: number, arg2: number | undefined = undefined): boolean {}
   */
  public command(
    command: string,
    permission: string | undefined = undefined
  ): (executor: (...args: any) => boolean) => void {
    // 当前命令管理器实例的别名，用于内部函数中引用
    const commandManager = this.commandManager;
    // 返回一个函数，该函数接受一个执行器函数作为参数，并在适当的时候调用它
    return function (executor: (...args: any) => boolean) {
      // 调用命令管理器的解析方法，根据传入的命令字符串和权限字符串来解析并执行命令
      commandManager?.parse(command, permission)(executor);
    };
  }

  /**
   * 发布一个事件，触发该事件的所有监听器
   * @param event {string} 事件名称
   * @param args {...args: any} 传递给事件回调的参数
   * @returns {any[]} 事件回调的返回值（如果有）
   */
  public async post(event: string, ...args: any): Promise<any[]> {
    return await this.eventManager.post(event, ...args);
  }

  /**
   * 订阅一个事件，返回一个函数，该函数用于添加事件回调
   * @param event {string} 事件名称
   * @param namespace {string} 命名空间，用于组织事件监听器
   * @param priority {number} 优先级，决定事件回调的执行顺序
   * @param cancelable {boolean} 是否可取消，决定是否可以取消事件，为 true 时，处理器第一个参数会传入 Cancelable
   * @returns {(callback: (...args: any) => void) => void} 一个函数，接受事件回调并注册该回调到指定事件
   */
  public subscribe<T extends BotEvent, C extends BotEventCancelable>(
    event: T,
    namespace: string = 'gugle-event',
    priority: number = 100,
    cancelable: C = false as C
  ): (callback: EventCallback<T, C>) => void {
    return this.eventManager.subscribe(event, namespace, priority, cancelable);
  }

  /**
   * 处理WebSocket消息的函数
   * 该函数解析从WebSocket接收到的消息，并根据消息内容执行相应操作
   * @param bot {HeyBoxBot} HeyBoxBot实例，用于访问机器人的功能和属性
   * @param data {RawData} 从WebSocket接收到的原始数据
   */
  private onWebsocketMsg(bot: HeyBoxBot, data: RawData) {
    // 将接收到的原始数据转换为UTF-8字符串，并记录调试信息
    const msg = data.toString('utf-8');
    bot.logger!.debug(msg);

    // 如果消息是"PONG"，则重置心跳次数
    if (msg === 'PONG') {
      bot.heartbeatTimes = 0;
      return;
    }

    // 如果消息是JSON格式，则尝试解析并处理
    if (msg.startsWith('{') && msg.endsWith('}')) {
      try {
        // 解析JSON消息，并检查通知类型是否为用户消息
        const data: WebSocketMessage = JSON.parse(msg);
        if (data.type === '50') {
          const commandMsg: CommandMessage = data.data as CommandMessage;
          const user: UserBaseInfo = commandMsg.sender_info;
          bot.post('command-message', bot, user, commandMsg).then();
        }
      } catch (e) {
        // 如果解析过程中出现错误，记录错误信息
        bot.logger!.error(e);
      }
    }
  }

  private onCommandMessage(bot: HeyBoxBot, user: UserBaseInfo, commandMsg: CommandMessage) {
    bot.logger!.info(`[${user.nickname}|${user.user_id}] run command: ${commandMsg.command_info.name}`);
    const userMsg: MessageImpl = new MessageImpl(msg => bot.sendMsg(msg), commandMsg, {
      room_id: commandMsg.room_base_info.room_id,
      room_nickname: commandMsg.room_base_info.room_name,
      channel_id: commandMsg.channel_base_info.channel_id,
      channel_name: commandMsg.channel_base_info.channel_name,
      channel_type: commandMsg.channel_base_info.channel_type,
      user_info: { user_base_info: commandMsg.sender_info }
    });
    bot.commandManager?.execute(commandMsg, userMsg);
  }

  public sendMsg(msg: TextMessage) {
    sendMessage(this.config.token, msg);
  }
}
