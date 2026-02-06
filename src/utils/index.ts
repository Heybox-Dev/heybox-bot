// noinspection JSUnusedGlobalSymbols

/**
 * 导入常量和必要模块
 */
import Constants from '@/constants';
import { HeyBoxBot } from '@/index';
import axios, { AxiosInstance } from 'axios';
import { ILogger, Message, UserMessage } from '@/type';
import * as fs from 'node:fs';
import { Logger } from 'winston';
import FormData from 'form-data';
import * as path from 'path';
import mime from 'mime-types';
import deasync from 'deasync';

/**
 * HeyboxBot运行时上下文类，用于存储和提供全局的Bot实例和Logger实例
 */
export class HeyboxBotRuntimeContext {
  private static bot?: HeyBoxBot = undefined;
  private static logger?: Logger = undefined;

  /**
   * 获取Bot实例
   * @returns {HeyBoxBot} Bot实例
   * @throws {Error} 如果Bot未初始化
   */
  public static getBot(): HeyBoxBot {
    if (HeyboxBotRuntimeContext.bot === undefined) {
      throw new Error('Bot not initialized');
    }
    return HeyboxBotRuntimeContext.bot;
  }

  /**
   * 设置Bot实例
   * @param {HeyBoxBot} bot Bot实例
   */
  public static setBot(bot: HeyBoxBot) {
    HeyboxBotRuntimeContext.bot = bot;
  }

  /**
   * 获取Logger实例
   * @returns {Logger} Logger实例
   * @throws {Error} 如果Logger未初始化
   */
  public static getLogger(): Logger {
    if (HeyboxBotRuntimeContext.logger === undefined) {
      throw new Error('Logger not initialized');
    }
    return HeyboxBotRuntimeContext.logger;
  }

  /**
   * 设置Logger实例
   * @param {Logger} logger Logger实例
   */
  public static setLogger(logger: Logger) {
    HeyboxBotRuntimeContext.logger = logger;
  }
}

/**
 * 工具类，提供日志记录、获取确认ID、获取代理配置和字符串哈希功能
 */
export class Util {
  private static ackID: number = Number.parseInt(Math.floor(Math.random() * 1000000).toString(10));
  public static log: ILogger = {
    debug: msg => {
      HeyboxBotRuntimeContext.getLogger().debug(msg);
    },
    error: msg => {
      HeyboxBotRuntimeContext.getLogger().error(msg);
    },
    info: msg => {
      HeyboxBotRuntimeContext.getLogger().info(msg);
    },
    warning: msg => {
      HeyboxBotRuntimeContext.getLogger().warning(msg);
    }
  };

  /**
   * 获取确认ID
   * @returns {number} 确认ID
   */
  public static getAckId(): number {
    return Util.ackID++;
  }

  /**
   * 获取代理配置
   * @returns 代理配置对象或未定义
   */
  public static getProxy():
    | {
        host: string;
        port: number;
        protocol: 'http' | 'https';
      }
    | undefined {
    return HeyboxBotRuntimeContext.getBot().getConfig().proxy;
  }

  /**
   * 使用DJB2算法计算字符串哈希值
   * @param {string} str 输入字符串
   * @returns {number} 哈希值
   */
  public static hashDJB2(str: string) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash >>> 0; // 确保结果为非负整数
  }
}

/**
 * 请求类，处理与服务器的HTTP交互
 */
export class Request {
  public static readonly BASE_URL = `${Constants.BASE_URL}`;
  private static instance?: AxiosInstance = undefined;

  public static getInstance(): AxiosInstance {
    return (
      this.instance ||
      (this.instance = axios.create({
        baseURL: Request.BASE_URL,
        timeout: 15000,
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Content-Type': 'application/json;charset=UTF-8',
          'token': HeyboxBotRuntimeContext.getBot().getConfig().token
        },
        proxy: Util.getProxy()
      }))
    );
  }

  /**
   * 发送消息
   * @param {Message} payload 消息负载
   */
  public static async sendMessage(payload: Message) {
    const url = `${Constants.SEND_MSG_URL}${Constants.COMMON_PARAMS}`;
    Util.log.debug(`send message: ${JSON.stringify(payload)}`);
    Request.getInstance().post(url, payload).then();
  }

  /**
   * 发送用户消息
   * @param {UserMessage} payload 用户消息负载
   */
  public static async sendUserMessage(payload: UserMessage) {
    const url = `${Constants.SEND_USER_MSG_URL}${Constants.COMMON_PARAMS}`;
    Util.log.debug(`send user message: ${JSON.stringify(payload)}`);
    Request.getInstance().post(url, payload).then();
  }

  /**
   * 上传文件
   * @param {BufferSource | string} file 文件内容或文件路径
   * @returns {Promise<string>} 上传后的文件URL
   */
  public static async uploadFile(file: BufferSource | string): Promise<string> {
    if (typeof file === 'string' && file.includes(Constants.CDN_URL)) return Promise.resolve(file);
    let fileName = '';
    if (typeof file === 'string') {
      if (file.startsWith('http')) {
        let response = await axios.get(file, {
          responseType: 'arraybuffer',
          proxy: Util.getProxy()
        });
        file = Buffer.from(response.data, 'binary');
        const mimeType =
          (response.headers['Content-Type'] as string | undefined) ||
          (response.headers['content-type'] as string | undefined) ||
          'application/octet-stream';
        fileName = `file.${mime.extension(mimeType)}`;
      } else {
        fileName = path.parse(file).name;
        file = fs.readFileSync(file);
      }
    }
    const url = `${Constants.UPLOAD_URL}${Constants.COMMON_PARAMS}`;
    const payload = new FormData();
    payload.append('file', file, fileName);
    Util.log.debug(`upload file: <${fileName}>`);
    return new Promise((resolve, reject) => {
      Request.getInstance().post(url, payload, {
        transformRequest: [
          (data, headers) => {
            delete headers['Content-Type']; // 让 axios 自动设置 Content-Type
            return data;
          }
        ]
      })
        .then(value => {
          const data = value.data;
          if (data.status == 'ok') {
            resolve(data.result.url);
          } else {
            reject(data);
          }
        })
        .catch(reject);
    });
  }

  /**
   * 同步方式上传文件
   * @param {BufferSource | string} file 文件内容或文件路径
   * @returns {string} 上传后的文件URL
   */
  public static uploadFileSync(file: BufferSource | string): string {
    let cdnUrl = '';
    let done = false;
    Request.uploadFile(file)
      .then(res => {
        done = true;
        cdnUrl = res;
      })
      .catch(err => {
        Util.log.error(JSON.stringify(err));
        done = true;
      });
    deasync.loopWhile(() => !done);
    return cdnUrl;
  }

  /**
   * 更新频道消息
   * @param payload 更新消息的负载
   */
  public static async updateMessage(payload: {
    msg_id: string;
    msg: string;
    msg_type: number;
    heychat_ack_id: string;
    reply_id?: string;
    room_id: string;
    addition: string;
    at_user_id?: string;
    at_role_id?: string;
    mention_channel_id?: string;
    channel_id: string;
  }) {
    const url = `/chatroom/v2/channel_msg/update${Constants.COMMON_PARAMS}`;
    Util.log.debug(`update message: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 删除频道消息
   * @param payload 删除消息的负载
   */
  public static async deleteMessage(payload: {
    msg_id: string;
    room_id: string;
    channel_id: string;
  }) {
    const url = `/chatroom/v2/channel_msg/delete${Constants.COMMON_PARAMS}`;
    Util.log.debug(`delete message: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 获取房间信息
   * @param roomId 房间ID
   */
  public static async getRoomInfo(roomId: string) {
    const url = `/chatroom/v2/room/view${Constants.COMMON_PARAMS}&room_id=${roomId}`;
    Util.log.debug(`get room info: ${roomId}`);
    return Request.getInstance().get(url);
  }

  /**
   * 分页获取加入的房间列表
   * @param offset 偏移量
   * @param limit 限制数量
   */
  public static async getJoinedRooms(offset: number = 0, limit: number = 20) {
    const url = `/chatroom/v2/room/joined${Constants.COMMON_PARAMS}&offset=${offset}&limit=${limit}`;
    Util.log.debug(`get joined rooms: offset=${offset}, limit=${limit}`);
    return Request.getInstance().get(url);
  }

  /**
   * 获取房间用户列表
   * @param roomId 房间ID
   * @param userId 用户ID
   * @param offset 偏移量
   * @param limit 限制数量
   */
  public static async getRoomUsers(roomId: string, userId: string, offset: number = 0, limit: number = 50) {
    const url = `/chatroom/v2/room/users?heybox_id=${userId}&offset=${offset}&limit=${limit}&room_id=${roomId}`;
    Util.log.debug(`get room users: room_id=${roomId}, user_id=${userId}`);
    return Request.getInstance().get(url);
  }

  /**
   * 给消息添加/取消回应(小表情)
   * @param payload 回应消息的负载
   */
  public static async emojiReply(payload: {
    msg_id: string;
    room_id: string;
    channel_id: string;
    emoji: string;
    is_add: boolean;
  }) {
    const url = `/chatroom/v2/channel_msg/emoji/reply${Constants.COMMON_PARAMS}`;
    Util.log.debug(`emoji reply: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 修改房间内昵称
   * @param payload 修改昵称的负载
   */
  public static async changeRoomNickname(payload: {
    room_id: string;
    nickname: string;
  }) {
    const url = `/chatroom/v2/room/nickname${Constants.COMMON_PARAMS}`;
    Util.log.debug(`change room nickname: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 退出房间
   * @param roomId 房间ID
   */
  public static async leaveRoom(roomId: string) {
    const url = `/chatroom/v2/room/leave${Constants.COMMON_PARAMS}`;
    Util.log.debug(`leave room: ${roomId}`);
    return Request.getInstance().post(url, { room_id: roomId });
  }

  /**
   * 房间踢人
   * @param payload 踢人操作的负载
   */
  public static async kickOutUser(payload: {
    room_id: string;
    user_id: number;
    delete_msg_range?: number;
    reason?: string;
  }) {
    const url = `/chatroom/v2/room/kick_out${Constants.COMMON_PARAMS}`;
    Util.log.debug(`kick out user: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 禁言/解禁用户
   * @param payload 禁言操作的负载
   */
  public static async banUser(payload: {
    room_id: string;
    user_id: number;
    duration?: number;
    reason?: string;
    notify?: boolean;
  }) {
    const url = `/chatroom/v2/room/ban${Constants.COMMON_PARAMS}`;
    Util.log.debug(`ban user: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  // ==================== 角色权限管理 ====================

  /**
   * 获取房间角色列表
   * @param roomId 房间ID
   */
  public static async getRoomRoles(roomId: string) {
    const url = `/chatroom/v2/room_role/roles${Constants.COMMON_PARAMS}&room_id=${roomId}`;
    Util.log.debug(`get room roles: ${roomId}`);
    return Request.getInstance().get(url);
  }

  /**
   * 创建角色
   * @param payload 创建角色的负载
   */
  public static async createRole(payload: {
    name: string;
    icon?: string;
    color_list?: number[];
    room_id: string;
    permissions: string;
    type: number;
    color: number;
    hoist: number;
    nonce: string;
  }) {
    const url = `/chatroom/v2/room_role/create${Constants.COMMON_PARAMS}`;
    Util.log.debug(`create role: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 更新角色
   * @param payload 更新角色的负载
   */
  public static async updateRole(payload: {
    id: string;
    name: string;
    icon: string;
    color_list: number[];
    room_id: string;
    permissions: string;
    type: number;
    color: number;
    hoist: number;
    nonce: string;
    position: number;
  }) {
    const url = `/chatroom/v2/room_role/update${Constants.COMMON_PARAMS}`;
    Util.log.debug(`update role: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 删除角色
   * @param payload 删除角色的负载
   */
  public static async deleteRole(payload: {
    role_id: string;
    room_id: string;
  }) {
    const url = `/chatroom/v2/room_role/delete${Constants.COMMON_PARAMS}`;
    Util.log.debug(`delete role: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 授予用户角色
   * @param payload 授予权限的负载
   */
  public static async grantRole(payload: {
    to_user_id: number;
    role_id: string;
    room_id: string;
  }) {
    const url = `/chatroom/v2/room_role/grant${Constants.COMMON_PARAMS}`;
    Util.log.debug(`grant role: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 剥夺用户角色
   * @param payload 剥夺权限的负载
   */
  public static async revokeRole(payload: {
    to_user_id: number;
    role_id: string;
    room_id: string;
  }) {
    const url = `/chatroom/v2/room_role/revoke${Constants.COMMON_PARAMS}`;
    Util.log.debug(`revoke role: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 修改权限组或成员权限
   * @param payload 修改权限的负载
   */
  public static async updateRolePermissions(payload: {
    room_id: string;
    role_id?: string;
    user_id?: number;
    permissions: string;
  }) {
    const url = `/chatroom/v2/role/role_user_perm${Constants.COMMON_PARAMS}`;
    Util.log.debug(`update role permissions: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  // ==================== 表情包管理 ====================

  /**
   * 获取房间上传的表情包
   * @param roomId 房间ID
   */
  public static async getRoomEmojis(roomId: string) {
    const url = `/chatroom/v3/msg/meme/room/list?room_id=${roomId}`;
    Util.log.debug(`get room emojis: ${roomId}`);
    return Request.getInstance().get(url);
  }

  /**
   * 删除房间表情包
   * @param payload 删除表情包的负载
   */
  public static async deleteRoomEmoji(payload: {
    path: string;
    room_id: string;
  }) {
    const url = `/chatroom/v2/msg/meme/room/del${Constants.COMMON_PARAMS}`;
    Util.log.debug(`delete room emoji: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 更新房间表情包名称
   * @param payload 更新表情包名称的负载
   */
  public static async updateRoomEmojiName(payload: {
    path: string;
    name: string;
    room_id: string;
  }) {
    const url = `/chatroom/v2/msg/meme/room/edit${Constants.COMMON_PARAMS}`;
    Util.log.debug(`update room emoji name: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  // ==================== 频道管理 ====================

  /**
   * 移动用户到其他频道
   * @param payload 移动用户的负载
   */
  public static async moveChannelMember(payload: {
    origin_channel_id: string;
    to_user_ids: string[];
    room_id: string;
    channel_id: string;
  }) {
    const url = `/chatroom/v2/channel/move_member${Constants.COMMON_PARAMS}`;
    Util.log.debug(`move channel member: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 踢出语音频道中的用户
   * @param payload 踢出用户的负载
   */
  public static async kickChannelUser(payload: {
    to_user_id: number;
    heybox_id?: string;
    room_id?: string;
    channel_id?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (payload.heybox_id) queryParams.append('heybox_id', payload.heybox_id);
    if (payload.room_id) queryParams.append('room_id', payload.room_id);
    if (payload.channel_id) queryParams.append('channel_id', payload.channel_id);
    
    const url = `/chatroom/v2/channel/kick_out${Constants.COMMON_PARAMS}&${queryParams.toString()}`;
    Util.log.debug(`kick channel user: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, { to_user_id: payload.to_user_id });
  }

  /**
   * 频道内麦克风静音/解禁
   * @param payload 静音操作的负载
   */
  public static async muteChannelUser(payload: {
    to_user_id: number;
    channel_id: string;
    room_id: string;
  }) {
    const url = `/chatroom/v2/channel/mute_user${Constants.COMMON_PARAMS}`;
    Util.log.debug(`mute channel user: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 获取用户所在频道
   * @param toUserId 查询用户ID
   * @param roomId 房间ID
   * @param mustAudio 是否必须返回语音频道
   */
  public static async getUserChannel(toUserId: string, roomId: string, mustAudio: boolean = false) {
    const url = `/chatroom/v2/channel/which_user${Constants.COMMON_PARAMS}&to_user_id=${toUserId}&room_id=${roomId}&must_audio=${mustAudio}`;
    Util.log.debug(`get user channel: user=${toUserId}, room=${roomId}`);
    return Request.getInstance().get(url);
  }

  /**
   * 获取频道在线成员列表
   * @param channelId 频道ID
   * @param roomId 房间ID
   * @param heyboxId 用户ID
   */
  public static async getChannelOnlineUsers(channelId: string, roomId: string, heyboxId: string) {
    const url = `/chatroom/v2/channel/user/list?channel_id=${channelId}&room_id=${roomId}&heybox_id=${heyboxId}`;
    Util.log.debug(`get channel online users: channel=${channelId}`);
    return Request.getInstance().get(url);
  }

  /**
   * 频道设置修改
   * @param payload 频道设置的负载
   */
  public static async editChannelSetting(payload: {
    channel_id: string;
    room_id: string | null;
    setting: string;
    value: number;
    channel_type: number;
  }) {
    const url = `/chatroom/v2/settings/channel/edit${Constants.COMMON_PARAMS}`;
    Util.log.debug(`edit channel setting: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 编辑频道名
   * @param payload 编辑频道名的负载
   */
  public static async editChannelName(payload: {
    room_id: string;
    channel_id: string;
    channel_name: string;
    channel_type: number;
  }) {
    const url = `/chatroom/v2/channel/edit${Constants.COMMON_PARAMS}`;
    Util.log.debug(`edit channel name: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 设置频道密码
   * @param password 频道密码
   * @param channelId 频道ID
   * @param roomId 房间ID
   */
  public static async setChannelPassword(password: string, channelId: string, roomId: string) {
    const url = `/chatroom/channel/edit_password/no_encrypt?password=${password}&channel_id=${channelId}&room_id=${roomId}`;
    Util.log.debug(`set channel password: channel=${channelId}`);
    return Request.getInstance().post(url, {});
  }

  /**
   * 获取用户频道权限
   * @param channelId 频道ID
   * @param toUserId 用户ID
   * @param parentId 频道组ID（可选）
   */
  public static async getUserChannelPermissions(channelId: string, toUserId: string, parentId?: string) {
    const queryParams = new URLSearchParams({
      channel_id: channelId,
      to_user_id: toUserId
    });
    if (parentId) queryParams.append('parent_id', parentId);
    
    const url = `/chatroom/v2/channel_user_perm/list_with_parent?${queryParams.toString()}`;
    Util.log.debug(`get user channel permissions: user=${toUserId}, channel=${channelId}`);
    return Request.getInstance().get(url);
  }

  /**
   * 创建频道
   * @param payload 创建频道的负载
   */
  public static async createChannel(payload: {
    room_id: string;
    channel_name: string;
    channel_type: number;
    api_type: string;
    parent_id?: string;
    nonce?: string;
  }) {
    const url = `/chatroom/v3/channel/create${Constants.COMMON_PARAMS}`;
    Util.log.debug(`create channel: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 删除频道
   * @param payload 删除频道的负载
   */
  public static async deleteChannel(payload: {
    channel_id: string;
    room_id: string;
  }) {
    const url = `/chatroom/v2/channel/delete${Constants.COMMON_PARAMS}`;
    Util.log.debug(`delete channel: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  // ==================== 推流管理 ====================

  /**
   * 推流至语音频道
   * @param payload 推流的负载
   */
  public static async pushStreamToChannel(payload: {
    room_id: string;
    channel_id: string;
    stream_url: string;
    volume?: number;
    operator: number;
    callback_url?: string;
    seek_second?: number;
    repeat_num?: number;
    max_duration?: number;
  }) {
    const url = `/chatroom/v3/channel/stream/push${Constants.COMMON_PARAMS}`;
    Util.log.debug(`push stream to channel: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 停止推流至语音频道
   * @param taskId 任务ID
   */
  public static async stopStreamToChannel(taskId: string) {
    const url = `/chatroom/v3/channel/stream/stop${Constants.COMMON_PARAMS}`;
    Util.log.debug(`stop stream to channel: task_id=${taskId}`);
    return Request.getInstance().post(url, { task_id: taskId });
  }

  // ==================== 音频控制 ====================

  /**
   * 房间内麦克风静音/解禁
   * @param payload 麦克风静音的负载
   */
  public static async muteRoomMicrophone(payload: {
    room_id: string;
    mute: boolean;
    to_user_id: number;
    channel_id: string;
  }) {
    const url = `/chatroom/v2/room/mute${Constants.COMMON_PARAMS}`;
    Util.log.debug(`mute room microphone: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  /**
   * 房间内扬声器静音/解禁
   * @param payload 扬声器静音的负载
   */
  public static async muteRoomSpeaker(payload: {
    room_id: string;
    mute: boolean;
    to_user_id: number;
    channel_id: string;
  }) {
    const url = `/chatroom/v2/room/mute_earphone${Constants.COMMON_PARAMS}`;
    Util.log.debug(`mute room speaker: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, payload);
  }

  // ==================== 邀请链接 ====================

  /**
   * 创建频道邀请链接
   * @param userId 用户ID
   * @param roomId 房间ID
   * @param channelId 频道ID
   */
  public static async createInviteCode(userId: string, roomId: string, channelId: string) {
    const url = `/chatroom/v2/invite/code?user_id=${userId}&room_id=${roomId}&channel_id=${channelId}`;
    Util.log.debug(`create invite code: user=${userId}, room=${roomId}, channel=${channelId}`);
    return Request.getInstance().get(url);
  }

  // ==================== 认证相关 ====================

  /**
   * 获取授权码
   * @param clientId 客户端ID
   * @param redirectUri 回调地址
   * @param scope 权限范围
   */
  public static async getOAuthCode(clientId: string, redirectUri: string, scope: string) {
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    const encodedScope = encodeURIComponent(scope);
    const url = `/account/bot_oauth?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${encodedScope}`;
    Util.log.debug(`get oauth code: client=${clientId}, redirect=${redirectUri}`);
    return Request.getInstance().get(url);
  }

  /**
   * 刷新AccessToken
   * @param payload 刷新token的负载
   */
  public static async refreshToken(payload: {
    grant_type: string;
    client_id: string;
    client_secret: string;
    refresh_token: string;
  }) {
    const url = `/chatroom/api/token`;
    Util.log.debug(`refresh token: ${JSON.stringify(payload)}`);
    return Request.getInstance().post(url, new URLSearchParams(payload), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  /**
   * 获取用户信息
   * @param clientId 客户端ID
   * @param redirectUri 回调地址
   * @param scope 权限范围
   * @param userId 用户ID（可选）
   */
  public static async getAccountInfo(clientId: string, redirectUri: string, scope: string, userId?: string) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope
    });
    if (userId) params.append('user_id', userId);
    
    const url = `/chatroom/api/account/info?${params.toString()}`;
    Util.log.debug(`get account info: client=${clientId}`);
    return Request.getInstance().get(url);
  }

  /**
   * 获取用户房间内语音游戏时长
   * @param roomId 房间ID（可选）
   * @param beginTime 开始时间unix时间戳（可选）
   * @param endTime 结束时间unix时间戳（可选）
   * @param appid 游戏ID（可选）
   */
  public static async getChatDuration(roomId?: string, beginTime?: string, endTime?: string, appid?: string) {
    const params = new URLSearchParams();
    if (roomId) params.append('room_id', roomId);
    if (beginTime) params.append('begin_time', beginTime);
    if (endTime) params.append('end_time', endTime);
    if (appid) params.append('appid', appid);
    
    const url = `/chatroom/api/duration/chat?${params.toString()}`;
    Util.log.debug(`get chat duration: ${params.toString()}`);
    return Request.getInstance().get(url);
  }
}

/**
 * 基于种子的随机数生成器类
 */
export class SeededRandom {
  seed: number;
  m: number;
  a: number;
  c: number;
  state: number;

  /**
   * 构造函数
   * @param {number} seed 种子
   */
  constructor(seed: number) {
    this.seed = seed;
    this.m = 0x80000000; // 2^31
    this.a = 1103515245;
    this.c = 12345;
    this.state = ((seed % this.m) + this.m) % this.m;
  }

  /**
   * 生成下一个随机数
   * @returns {number} 随机数
   */
  public next(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / this.m;
  }

  /**
   * 生成下一个整数
   * @param {number} min 最小值
   * @param {number} max 最大值
   * @returns {number} 随机整数
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}
