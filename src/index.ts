import { MessageBuilder, UserMessage, UserMessageBuilder } from '@/type/message';
import { EventManager } from 'gugle-event';
import { RawData, WebSocket } from 'ws';
import * as process from 'node:process';
import BotConfig from '@/config';
import Constants from '@/constants';
import { HeyBoxCommandManager } from './command';
import { WSMsgImpl } from '@/type/impl';
import { Logger } from 'winston';
import dayjs from 'dayjs';
import {
  BotEvent,
  BotEventCancelable,
  CardMessageBtnClickWSMsgData,
  CommandWSMsgData,
  EventCallback,
  Message,
  SimpleUserInfo,
  UserAddOrRemoveEmojiToMsgWSMsgData,
  UserBaseInfo,
  UserJoinOrLeaveRoomWSMsgData,
  WebSocketWSMsg
} from '@/type';
import { HeyboxBotRuntimeContext, Request, Util } from './utils';
import { LoggerFactory } from './logger';
import * as fs from 'node:fs';
import * as cron from 'node-cron';

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
    // 监听WebSocket连接错误事件
    this.ws.on('error', (e: Error) => {
      let message = e.message;
      const stack = e.stack;
      if (message.endsWith('401')) {
        this.logger?.error(`${stack}`);
        message = '无法连接至 WebSocket 服务器，请检查你的 Token！ ';
        throw new Error(message);
      }
      throw e;
    });
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
      this.eventManager.listen('user-add-or-remove-emoji-to-msg', this.onUserAddOrRemoveEmojiToMsg);
      this.eventManager.listen('user-join-or-leave-room', this.onUserJoinOrLeaveRoom);
      this.eventManager.listen('card-message-btn-click', this.onCardMessageBtnClick);
      // 设置WebSocket消息监听器
      this.ws.on('message', event => {
        // 当接收到WebSocket消息时，触发'websocket-message'事件
        this.post('websocket-message', this, event);
      });
      // 在启动后触发'after-start'事件，传递当前实例作为参数
      this.post('after-start', this).then();
    });
    HeyboxBotRuntimeContext.setBot(this);
    HeyboxBotRuntimeContext.setLogger(this.logger!);
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
   * @returns {(executor: (...args: any) => boolean) => void} 返回一个函数，该函数接受一个执行器函数作为参数，并在适当的时候调用它
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
   * 定义一个 cron 装饰器，用于根据给定的 cron 表达式调度任务
   *
   * @param _cron cron 表达式，用于指定任务执行的时间
   * @returns {(executor: (bot: HeyBoxBot) => void) => void} 返回一个函数，该函数接受一个执行器函数作为参数，并在指定时间执行该执行器函数
   *
   * @example
   * @ bot.cron('0/30 * * * * *')
   * public cron(bot: HeyBoxBot): void {}
   */
  public cron(_cron: string): (executor: (bot: HeyBoxBot) => void) => void {
    // 保存当前实例的引用，以便在后续的执行器函数中使用
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self: HeyBoxBot = this;
    // 返回一个函数，该函数负责调度执行器函数
    return function (executor: (bot: HeyBoxBot) => void) {
      // 使用 cron 表达式调度任务，当时间匹配时执行执行器函数
      cron.schedule(_cron, () => {
        executor(self);
      });
    };
  }

  /**
   * 发布一个事件，触发该事件的所有监听器
   *
   * @param event {string} 事件名称
   * @param args {...args: any} 传递给事件回调的参数
   * @returns {any[]} 事件回调的返回值（如果有）
   */
  public async post(event: string, ...args: any): Promise<any[]> {
    return await this.eventManager.post(event, ...args);
  }

  /**
   * 定义一个事件订阅装饰器，用于根据事件触发回调
   *
   * @param event {string} 事件名称
   * @param namespace {string} 命名空间，用于组织事件监听器
   * @param priority {number} 优先级，决定事件回调的执行顺序
   * @param cancelable {boolean} 是否可取消，决定是否可以取消事件，为 true 时，处理器第一个参数会传入 Cancelable
   * @returns {(callback: (...args: any) => void) => void} 一个函数，接受事件回调并注册该回调到指定事件
   *
   * @example
   * @ bot.subscribe('after-start', true)
   * public test(cancelable: Cancelable, bot: HeyBoxBot) {}
   */
  public subscribe<T extends BotEvent, C extends BotEventCancelable>(
    event: T,
    cancelable: C = false as C,
    namespace: string = 'gugle-event',
    priority: number = 100
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
        // 解析JSON消息
        const data: WebSocketWSMsg = JSON.parse(msg);
        if (data.type === '50') {
          const commandMsg: CommandWSMsgData = data.data as CommandWSMsgData;
          const user: UserBaseInfo = commandMsg.sender_info;
          bot.post('command-message', bot, user, commandMsg).then();
        } else if (data.type === '3001') {
          const userJoinOrLeaveRoomWSMsgData: UserJoinOrLeaveRoomWSMsgData = data.data as UserJoinOrLeaveRoomWSMsgData;
          const user: SimpleUserInfo = userJoinOrLeaveRoomWSMsgData.user_info;
          bot.post('user-join-or-leave-room', bot, user, userJoinOrLeaveRoomWSMsgData).then();
        } else if (data.type === '5003') {
          const userAddOrRemoveEmojiToMsgWSMsgData: UserAddOrRemoveEmojiToMsgWSMsgData =
            data.data as UserAddOrRemoveEmojiToMsgWSMsgData;
          bot.post('user-add-or-remove-emoji-to-msg', bot, userAddOrRemoveEmojiToMsgWSMsgData).then();
        } else if (data.type === 'card_message_btn_click') {
          const cardMessageBtnClickWSMsgData: CardMessageBtnClickWSMsgData = data.data as CardMessageBtnClickWSMsgData;
          const user: UserBaseInfo = cardMessageBtnClickWSMsgData.sender_info;
          bot.post('card-message-btn-click', bot, user, cardMessageBtnClickWSMsgData).then();
        }
      } catch (e) {
        // 如果解析过程中出现错误，记录错误信息
        bot.logger!.error(e);
      }
    }
  }

  /**
   * 当接收到命令消息时调用该方法处理
   * @param bot 当前机器人实例
   * @param user 发送命令的用户信息
   * @param commandMsg 命令消息数据
   */
  private onCommandMessage(bot: HeyBoxBot, user: UserBaseInfo, commandMsg: CommandWSMsgData) {
    // 记录用户执行命令的日志
    bot.logger!.info(`[${user.nickname}|${user.user_id}] run command: ${commandMsg.command_info.name}`);

    // 创建WSMsgImpl实例，封装消息发送方法和命令消息数据
    const userMsg: WSMsgImpl = new WSMsgImpl(bot.sendMsg, bot.sendUserMsg, commandMsg, {
      room_id: commandMsg.room_base_info.room_id,
      room_nickname: commandMsg.room_base_info.room_name,
      channel_id: commandMsg.channel_base_info.channel_id,
      channel_name: commandMsg.channel_base_info.channel_name,
      channel_type: commandMsg.channel_base_info.channel_type,
      user_info: { user_base_info: commandMsg.sender_info }
    });

    // 执行对应命令
    bot.commandManager?.execute(commandMsg, userMsg);
  }

  /**
   * 当用户对消息添加或移除表情时调用该方法处理
   * @param bot 当前机器人实例
   * @param msg 用户添加或移除表情的消息数据
   */
  private onUserAddOrRemoveEmojiToMsg(bot: HeyBoxBot, msg: UserAddOrRemoveEmojiToMsgWSMsgData) {
    // 记录用户添加或移除表情的日志
    bot.logger!.info(`[unknown|${msg.user_id}] ${msg.is_add ? 'add' : 'remove'} ${msg.emoji} to msg`);
  }

  /**
   * 当用户加入或离开房间时调用该方法处理
   * @param bot 当前机器人实例
   * @param user 加入或离开房间的用户信息
   * @param msg 用户加入或离开房间的消息数据
   */
  private onUserJoinOrLeaveRoom(bot: HeyBoxBot, user: UserBaseInfo, msg: UserJoinOrLeaveRoomWSMsgData) {
    // 记录用户加入或离开房间的日志
    bot.logger!.info(
      `[${user.nickname}|${user.user_id}] ${msg.state ? 'join' : 'leave'} room ${msg.room_base_info.room_name}`
    );
  }

  /**
   * 当用户点击卡片消息按钮时调用该方法处理
   * @param bot 当前机器人实例
   * @param user 点击按钮的用户信息
   * @param msg 卡片消息按钮点击事件数据
   */
  private onCardMessageBtnClick(bot: HeyBoxBot, user: UserBaseInfo, msg: CardMessageBtnClickWSMsgData) {
    // 记录用户点击按钮的日志
    bot.logger!.info(`[${user.nickname}|${user.user_id}] click ${msg.text} button(${msg.event}/${msg.value})`);
  }

  /**
   * 通过回调函数构建并发送消息
   * @param callback 用于构建消息的回调函数
   */
  public sendMsgBy(callback: (builder: MessageBuilder) => void) {
    const builder = new MessageBuilder();
    callback(builder);
    // 发送构建的消息
    Request.sendMessage(builder.build()).then();
  }

  /**
   * 发送消息对象
   * @param msg 要发送的消息对象
   */
  public sendMsg(msg: Message) {
    // 发送消息
    Request.sendMessage(msg).then();
  }

  /**
   * 通过回调函数构建并发送用户消息
   * @param callback 用于构建用户消息的回调函数
   */
  public sendUserMsgBy(callback: (builder: UserMessageBuilder) => void) {
    const builder = new UserMessageBuilder();
    callback(builder);
    // 发送构建的用户消息
    Request.sendUserMessage(builder.build()).then();
  }

  /**
   * 发送用户消息对象
   * @param msg 要发送的用户消息对象
   */
  public sendUserMsg(msg: UserMessage) {
    // 发送用户消息
    Request.sendUserMessage(msg).then();
  }

  /**
   * 获取机器人的配置
   * @returns 机器人的配置对象
   */
  public getConfig(): BotConfig {
    return this.config;
  }
}
