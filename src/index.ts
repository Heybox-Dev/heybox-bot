import { EventManager } from 'gugle-event';
import { RawData, WebSocket } from 'ws';
import * as process from 'node:process';
import BotConfig from '@/config';
import Constants from '@/constants';
import { CommandResult, HeyBoxCommandManager } from '@/command';
import { Logger } from 'winston';
import dayjs from 'dayjs';
import {
  BotEvent,
  BotEventCancelable,
  CardMessageBtnClickWSMsgData,
  CommandWSMsgData,
  EventCallback,
  Message,
  MessageBuilder,
  SimpleUserInfo,
  UserAddOrRemoveEmojiToMsgWSMsgData,
  UserBaseInfo,
  UserJoinOrLeaveRoomWSMsgData,
  UserMessage,
  UserMessageBuilder,
  WebSocketWSMsg,
  WSMsgImpl
} from '@/type';
import { HeyboxBotRuntimeContext, Request, Util } from '@/utils';
import { LoggerFactory } from '@/logger';
import * as fs from 'node:fs';
import * as cron from 'node-cron';
import { UserImMessageWSMsgData } from '@/type/websocket';

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
      this.eventManager.listen('user-im-msg', this.onUserImMsg);
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
  ): (executor: (...args: any) => CommandResult) => void {
    // 当前命令管理器实例的别名，用于内部函数中引用
    const commandManager = this.commandManager;
    // 返回一个函数，该函数接受一个执行器函数作为参数，并在适当的时候调用它
    return function (executor: (...args: any) => CommandResult) {
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
          const user: SimpleUserInfo = commandMsg.sender_info;
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
        } else if (data.type === '5') {
          const userImMsg: UserImMessageWSMsgData = data.data as UserImMessageWSMsgData;
          bot.post('user-im-msg', bot, userImMsg).then();
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
      user_info: commandMsg.sender_info
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
   * 当用户发送消息时调用该方法处理
   * @param bot 当前机器人实例
   * @param msg 用户发送的私聊消息数据
   */
  private onUserImMsg(bot: HeyBoxBot, msg: UserImMessageWSMsgData) {
    // 记录用户发送消息的日志
    bot.logger!.info(`[${msg.nickname}|${msg.user_id}] ${msg.msg}`);
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

  // ==================== 房间管理相关方法 ====================

  /**
   * 获取房间信息
   * @param roomId 房间ID
   * @returns Promise<any>
   */
  public async getRoomInfo(roomId: string): Promise<any> {
    return Request.getRoomInfo(roomId);
  }

  /**
   * 获取加入的房间列表
   * @param offset 偏移量，默认0
   * @param limit 限制数量，默认20
   * @returns Promise<any>
   */
  public async getJoinedRooms(offset: number = 0, limit: number = 20): Promise<any> {
    return Request.getJoinedRooms(offset, limit);
  }

  /**
   * 获取房间用户列表
   * @param roomId 房间ID
   * @param userId 用户ID（通常是机器人自己的ID）
   * @param offset 偏移量，默认0
   * @param limit 限制数量，默认50
   * @returns Promise<any>
   */
  public async getRoomUsers(roomId: string, userId: string, offset: number = 0, limit: number = 50): Promise<any> {
    return Request.getRoomUsers(roomId, userId, offset, limit);
  }

  /**
   * 修改房间内昵称
   * @param roomId 房间ID
   * @param nickname 新昵称
   * @returns Promise<any>
   */
  public async changeRoomNickname(roomId: string, nickname: string): Promise<any> {
    return Request.changeRoomNickname({ room_id: roomId, nickname });
  }

  /**
   * 退出房间
   * @param roomId 房间ID
   * @returns Promise<any>
   */
  public async leaveRoom(roomId: string): Promise<any> {
    return Request.leaveRoom(roomId);
  }

  /**
   * 踢出用户
   * @param roomId 房间ID
   * @param userId 用户ID
   * @param deleteMsgRange 删除消息范围（秒），可选
   * @param reason 踢出原因，可选
   * @returns Promise<any>
   */
  public async kickOutUser(roomId: string, userId: number, deleteMsgRange?: number, reason?: string): Promise<any> {
    return Request.kickOutUser({
      room_id: roomId,
      user_id: userId,
      delete_msg_range: deleteMsgRange,
      reason
    });
  }

  /**
   * 禁言用户
   * @param roomId 房间ID
   * @param userId 用户ID
   * @param duration 禁言时长（秒），0表示解禁
   * @param reason 禁言原因，可选
   * @param notify 是否通知用户，可选
   * @returns Promise<any>
   */
  public async banUser(
    roomId: string,
    userId: number,
    duration: number = 3600,
    reason?: string,
    notify: boolean = true
  ): Promise<any> {
    return Request.banUser({
      room_id: roomId,
      user_id: userId,
      duration,
      reason,
      notify
    });
  }

  // ==================== 角色权限管理相关方法 ====================

  /**
   * 获取房间角色列表
   * @param roomId 房间ID
   * @returns Promise<any>
   */
  public async getRoomRoles(roomId: string): Promise<any> {
    return Request.getRoomRoles(roomId);
  }

  /**
   * 创建角色
   * @param roomId 房间ID
   * @param roleName 角色名称
   * @param permissions 权限值
   * @param color 颜色值
   * @param hoist 是否在成员列表中置顶显示
   * @param icon 角色图标URL（可选）
   * @param colorList 渐变色数组（可选）
   * @returns Promise<any>
   */
  public async createRole(
    roomId: string,
    roleName: string,
    permissions: string,
    color: number,
    hoist: number = 0,
    icon?: string,
    colorList?: number[]
  ): Promise<any> {
    return Request.createRole({
      name: roleName,
      icon: icon || '',
      color_list: colorList || [],
      room_id: roomId,
      permissions,
      type: 0,
      color,
      hoist,
      nonce: Date.now().toString()
    });
  }

  /**
   * 更新角色
   * @param roleId 角色ID
   * @param roomId 房间ID
   * @param roleName 角色名称
   * @param icon 角色图标
   * @param colorList 渐变色数组
   * @param permissions 权限值
   * @param color 颜色值
   * @param hoist 是否置顶
   * @param position 角色位置
   * @returns Promise<any>
   */
  public async updateRole(
    roleId: string,
    roomId: string,
    roleName: string,
    icon: string,
    colorList: number[],
    permissions: string,
    color: number,
    hoist: number,
    position: number
  ): Promise<any> {
    return Request.updateRole({
      id: roleId,
      name: roleName,
      icon,
      color_list: colorList,
      room_id: roomId,
      permissions,
      type: 0,
      color,
      hoist,
      nonce: Date.now().toString(),
      position
    });
  }

  /**
   * 删除角色
   * @param roleId 角色ID
   * @param roomId 房间ID
   * @returns Promise<any>
   */
  public async deleteRole(roleId: string, roomId: string): Promise<any> {
    return Request.deleteRole({
      role_id: roleId,
      room_id: roomId
    });
  }

  /**
   * 授予用户角色
   * @param userId 用户ID
   * @param roleId 角色ID
   * @param roomId 房间ID
   * @returns Promise<any>
   */
  public async grantRole(userId: number, roleId: string, roomId: string): Promise<any> {
    return Request.grantRole({
      to_user_id: userId,
      role_id: roleId,
      room_id: roomId
    });
  }

  /**
   * 剥夺用户角色
   * @param userId 用户ID
   * @param roleId 角色ID
   * @param roomId 房间ID
   * @returns Promise<any>
   */
  public async revokeRole(userId: number, roleId: string, roomId: string): Promise<any> {
    return Request.revokeRole({
      to_user_id: userId,
      role_id: roleId,
      room_id: roomId
    });
  }

  /**
   * 更新角色或用户权限
   * @param roomId 房间ID
   * @param permissions 权限值
   * @param roleId 角色ID（可选）
   * @param userId 用户ID（可选）
   * @returns Promise<any>
   */
  public async updateRolePermissions(
    roomId: string,
    permissions: string,
    roleId?: string,
    userId?: number
  ): Promise<any> {
    return Request.updateRolePermissions({
      room_id: roomId,
      role_id: roleId,
      user_id: userId,
      permissions
    });
  }

  // ==================== 表情包管理相关方法 ====================

  /**
   * 获取房间表情包列表
   * @param roomId 房间ID
   * @returns Promise<any>
   */
  public async getRoomEmojis(roomId: string): Promise<any> {
    return Request.getRoomEmojis(roomId);
  }

  /**
   * 删除房间表情包
   * @param emojiPath 表情包路径
   * @param roomId 房间ID
   * @returns Promise<any>
   */
  public async deleteRoomEmoji(emojiPath: string, roomId: string): Promise<any> {
    return Request.deleteRoomEmoji({
      path: emojiPath,
      room_id: roomId
    });
  }

  /**
   * 更新房间表情包名称
   * @param emojiPath 表情包路径
   * @param newName 新名称
   * @param roomId 房间ID
   * @returns Promise<any>
   */
  public async updateRoomEmojiName(emojiPath: string, newName: string, roomId: string): Promise<any> {
    return Request.updateRoomEmojiName({
      path: emojiPath,
      name: newName,
      room_id: roomId
    });
  }

  // ==================== 频道管理相关方法 ====================

  /**
   * 移动用户到其他频道
   * @param originChannelId 用户当前所在频道ID
   * @param toUserIds 要移动的用户ID数组
   * @param roomId 房间ID
   * @param channelId 目标频道ID
   * @returns Promise<any>
   */
  public async moveChannelMember(
    originChannelId: string,
    toUserIds: string[],
    roomId: string,
    channelId: string
  ): Promise<any> {
    return Request.moveChannelMember({
      origin_channel_id: originChannelId,
      to_user_ids: toUserIds,
      room_id: roomId,
      channel_id: channelId
    });
  }

  /**
   * 踢出语音频道中的用户
   * @param toUserId 被踢出的用户ID
   * @param heyboxId 操作者ID（可选）
   * @param roomId 房间ID（可选）
   * @param channelId 频道ID（可选）
   * @returns Promise<any>
   */
  public async kickChannelUser(
    toUserId: number,
    heyboxId?: string,
    roomId?: string,
    channelId?: string
  ): Promise<any> {
    return Request.kickChannelUser({
      to_user_id: toUserId,
      heybox_id: heyboxId,
      room_id: roomId,
      channel_id: channelId
    });
  }

  /**
   * 频道内麦克风静音/解禁
   * @param toUserId 用户ID
   * @param channelId 频道ID
   * @param roomId 房间ID
   * @returns Promise<any>
   */
  public async muteChannelUser(toUserId: number, channelId: string, roomId: string): Promise<any> {
    return Request.muteChannelUser({
      to_user_id: toUserId,
      channel_id: channelId,
      room_id: roomId
    });
  }

  /**
   * 获取用户所在频道
   * @param toUserId 查询用户ID
   * @param roomId 房间ID
   * @param mustAudio 是否必须返回语音频道
   * @returns Promise<any>
   */
  public async getUserChannel(toUserId: string, roomId: string, mustAudio: boolean = false): Promise<any> {
    return Request.getUserChannel(toUserId, roomId, mustAudio);
  }

  /**
   * 获取频道在线成员列表
   * @param channelId 频道ID
   * @param roomId 房间ID
   * @param heyboxId 用户ID
   * @returns Promise<any>
   */
  public async getChannelOnlineUsers(channelId: string, roomId: string, heyboxId: string): Promise<any> {
    return Request.getChannelOnlineUsers(channelId, roomId, heyboxId);
  }

  /**
   * 修改频道设置
   * @param channelId 频道ID
   * @param roomId 房间ID
   * @param setting 设置项
   * @param value 设置值
   * @param channelType 频道类型
   * @returns Promise<any>
   */
  public async editChannelSetting(
    channelId: string,
    roomId: string,
    setting: string,
    value: number,
    channelType: number
  ): Promise<any> {
    return Request.editChannelSetting({
      channel_id: channelId,
      room_id: roomId,
      setting,
      value,
      channel_type: channelType
    });
  }

  /**
   * 编辑频道名称
   * @param roomId 房间ID
   * @param channelId 频道ID
   * @param channelName 新频道名
   * @param channelType 频道类型
   * @returns Promise<any>
   */
  public async editChannelName(
    roomId: string,
    channelId: string,
    channelName: string,
    channelType: number
  ): Promise<any> {
    return Request.editChannelName({
      room_id: roomId,
      channel_id: channelId,
      channel_name: channelName,
      channel_type: channelType
    });
  }

  /**
   * 设置频道密码
   * @param password 频道密码
   * @param channelId 频道ID
   * @param roomId 房间ID
   * @returns Promise<any>
   */
  public async setChannelPassword(password: string, channelId: string, roomId: string): Promise<any> {
    return Request.setChannelPassword(password, channelId, roomId);
  }

  /**
   * 获取用户频道权限
   * @param channelId 频道ID
   * @param toUserId 用户ID
   * @param parentId 频道组ID（可选）
   * @returns Promise<any>
   */
  public async getUserChannelPermissions(
    channelId: string,
    toUserId: string,
    parentId?: string
  ): Promise<any> {
    return Request.getUserChannelPermissions(channelId, toUserId, parentId);
  }

  /**
   * 创建频道
   * @param roomId 房间ID
   * @param channelName 频道名称
   * @param channelType 频道类型（0语音,1文字,2公告,3频道组,4临时,5临时管理器）
   * @param apiType 线路类型（trtc/volc）
   * @param parentId 频道组ID（可选）
   * @returns Promise<any>
   */
  public async createChannel(
    roomId: string,
    channelName: string,
    channelType: number,
    apiType: string,
    parentId?: string
  ): Promise<any> {
    return Request.createChannel({
      room_id: roomId,
      channel_name: channelName,
      channel_type: channelType,
      api_type: apiType,
      parent_id: parentId,
      nonce: Date.now().toString()
    });
  }

  /**
   * 删除频道
   * @param channelId 频道ID
   * @param roomId 房间ID
   * @returns Promise<any>
   */
  public async deleteChannel(channelId: string, roomId: string): Promise<any> {
    return Request.deleteChannel({
      channel_id: channelId,
      room_id: roomId
    });
  }

  // ==================== 推流管理相关方法 ====================

  /**
   * 推流至语音频道
   * @param roomId 房间ID
   * @param channelId 频道ID
   * @param streamUrl 源流URL
   * @param operator 操作用户ID
   * @param volume 音量（0-100，默认100）
   * @param callbackUrl 回调链接（可选）
   * @param seekSecond 指定播放起始时间（秒，可选）
   * @param repeatNum 循环播放次数（-1为无限循环，默认1）
   * @param maxDuration 最大播放时长（分钟，可选）
   * @returns Promise<any>
   */
  public async pushStreamToChannel(
    roomId: string,
    channelId: string,
    streamUrl: string,
    operator: number,
    volume: number = 100,
    callbackUrl?: string,
    seekSecond?: number,
    repeatNum: number = 1,
    maxDuration?: number
  ): Promise<any> {
    return Request.pushStreamToChannel({
      room_id: roomId,
      channel_id: channelId,
      stream_url: streamUrl,
      volume,
      operator,
      callback_url: callbackUrl,
      seek_second: seekSecond,
      repeat_num: repeatNum,
      max_duration: maxDuration
    });
  }

  /**
   * 停止推流至语音频道
   * @param taskId 任务ID
   * @returns Promise<any>
   */
  public async stopStreamToChannel(taskId: string): Promise<any> {
    return Request.stopStreamToChannel(taskId);
  }

  // ==================== 音频控制相关方法 ====================

  /**
   * 房间内麦克风静音/解禁
   * @param roomId 房间ID
   * @param mute 是否静音
   * @param toUserId 被操作用户ID
   * @param channelId 频道ID
   * @returns Promise<any>
   */
  public async muteRoomMicrophone(
    roomId: string,
    mute: boolean,
    toUserId: number,
    channelId: string
  ): Promise<any> {
    return Request.muteRoomMicrophone({
      room_id: roomId,
      mute,
      to_user_id: toUserId,
      channel_id: channelId
    });
  }

  /**
   * 房间内扬声器静音/解禁
   * @param roomId 房间ID
   * @param mute 是否静音
   * @param toUserId 被操作用户ID
   * @param channelId 频道ID
   * @returns Promise<any>
   */
  public async muteRoomSpeaker(
    roomId: string,
    mute: boolean,
    toUserId: number,
    channelId: string
  ): Promise<any> {
    return Request.muteRoomSpeaker({
      room_id: roomId,
      mute,
      to_user_id: toUserId,
      channel_id: channelId
    });
  }

  // ==================== 邀请链接相关方法 ====================

  /**
   * 创建频道邀请链接
   * @param userId 用户ID
   * @param roomId 房间ID
   * @param channelId 频道ID
   * @returns Promise<any>
   */
  public async createInviteCode(userId: string, roomId: string, channelId: string): Promise<any> {
    return Request.createInviteCode(userId, roomId, channelId);
  }

  // ==================== 认证相关方法 ====================

  /**
   * 获取授权码
   * @param clientId 客户端ID
   * @param redirectUri 回调地址
   * @param scope 权限范围
   * @returns Promise<any>
   */
  public async getOAuthCode(clientId: string, redirectUri: string, scope: string): Promise<any> {
    return Request.getOAuthCode(clientId, redirectUri, scope);
  }

  /**
   * 刷新AccessToken
   * @param clientId 客户端ID
   * @param clientSecret 客户端密钥
   * @param refreshToken 刷新令牌
   * @param grantType 授权类型（默认authorization_code）
   * @returns Promise<any>
   */
  public async refreshToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
    grantType: string = 'refresh_token'
  ): Promise<any> {
    return Request.refreshToken({
      grant_type: grantType,
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    });
  }

  /**
   * 获取用户信息
   * @param clientId 客户端ID
   * @param redirectUri 回调地址
   * @param scope 权限范围
   * @param userId 用户ID（可选）
   * @returns Promise<any>
   */
  public async getAccountInfo(
    clientId: string,
    redirectUri: string,
    scope: string,
    userId?: string
  ): Promise<any> {
    return Request.getAccountInfo(clientId, redirectUri, scope, userId);
  }

  /**
   * 获取用户房间内语音游戏时长
   * @param roomId 房间ID（可选）
   * @param beginTime 开始时间unix时间戳（可选）
   * @param endTime 结束时间unix时间戳（可选）
   * @param appid 游戏ID（可选）
   * @returns Promise<any>
   */
  public async getChatDuration(
    roomId?: string,
    beginTime?: string,
    endTime?: string,
    appid?: string
  ): Promise<any> {
    return Request.getChatDuration(roomId, beginTime, endTime, appid);
  }

  // ==================== 消息操作相关方法 ====================

  /**
   * 更新消息
   * @param msgId 消息ID
   * @param content 新的消息内容
   * @param roomId 房间ID
   * @param channelId 频道ID
   * @param msgType 消息类型，默认4（markdown）
   * @param addition 附加信息，默认{}
   * @returns Promise<any>
   */
  public async updateMessage(
    msgId: string,
    content: string,
    roomId: string,
    channelId: string,
    msgType: number = 4,
    addition: string = '{}'
  ): Promise<any> {
    return Request.updateMessage({
      msg_id: msgId,
      msg: content,
      msg_type: msgType,
      heychat_ack_id: Util.getAckId().toString(),
      room_id: roomId,
      addition,
      channel_id: channelId
    });
  }

  /**
   * 删除消息
   * @param msgId 消息ID
   * @param roomId 房间ID
   * @param channelId 频道ID
   * @returns Promise<any>
   */
  public async deleteMessage(msgId: string, roomId: string, channelId: string): Promise<any> {
    return Request.deleteMessage({
      msg_id: msgId,
      room_id: roomId,
      channel_id: channelId
    });
  }

  /**
   * 给消息添加/取消表情回应
   * @param msgId 消息ID
   * @param roomId 房间ID
   * @param channelId 频道ID
   * @param emoji 表情符号
   * @param isAdd 是否添加表情（true添加，false取消）
   * @returns Promise<any>
   */
  public async emojiReply(
    msgId: string,
    roomId: string,
    channelId: string,
    emoji: string,
    isAdd: boolean = true
  ): Promise<any> {
    return Request.emojiReply({
      msg_id: msgId,
      room_id: roomId,
      channel_id: channelId,
      emoji,
      is_add: isAdd
    });
  }
}
