// 导入必要的类型和接口
import { CommandSource } from '@/command';
import {
  ChannelBaseInfo,
  CommandInfo,
  CommandUserInfo,
  RoomBaseInfo,
  SimpleUserInfo,
  UserBaseInfo,
  UserInfo
} from '@/type/info';
import {
  ExtendedMarkdownMessageImpl,
  ImgFilesInfo,
  MarkdownUserMessageImpl,
  Message,
  MessageBuilder,
  UserMessage,
  UserMessageBuilder
} from '@/type/message';

// 定义WebSocket消息数据的基类型
export declare type WSMsgData = {
  msg_id: string;
  send_time: number;
};

// 定义命令相关的WebSocket消息数据类型
export declare type CommandWSMsgData = WSMsgData & {
  bot_id: number;
  channel_base_info: ChannelBaseInfo;
  command_info: CommandInfo;
  room_base_info: RoomBaseInfo;
  sender_info: CommandUserInfo;
};

// 定义用户加入或离开房间的WebSocket消息数据类型
export declare type UserJoinOrLeaveRoomWSMsgData = {
  room_base_info: RoomBaseInfo;
  user_info: SimpleUserInfo;
  state: 1 | 0;
};

// 定义用户添加或移除消息表情的WebSocket消息数据类型
export declare type UserAddOrRemoveEmojiToMsgWSMsgData = {
  room_id: string;
  channel_id: string;
  emoji: string;
  is_add: 1 | 0;
  msg_id: string;
  user_id: string;
};

// 定义卡片消息按钮点击的WebSocket消息数据类型
export declare type CardMessageBtnClickWSMsgData = {
  room_base_info: RoomBaseInfo;
  channel_base_info: ChannelBaseInfo;
  sender_info: UserBaseInfo;
  event: string;
  msg_id: string;
  text: string;
  value: string;
};

// 定义用户消息的WebSocket消息数据类型
export declare type UserImMessageWSMsgData = WSMsgData & {
  user_info: UserInfo;
  user_id: string;
  roles: string[];
  nickname: string;
  room_id: string;
  channel_id: string;
  channel_name: string;
  channel_type: number;
  msg: string;
  msg_type: number;
  img: string;
  img_info: ImgFilesInfo;
  avatar: string;
  addition: string;
};

// 定义WebSocket消息的基类型
export declare type WebSocketWSMsg = {
  sequence: number;
  type: string;
  notify_type: string;
  data: any;
  timestamp: number;
};

// 定义命令相关的WebSocket消息类型
export declare type CommandWSMsg = WebSocketWSMsg & {
  data: CommandWSMsgData;
};

// 定义用户加入或离开房间的WebSocket消息类型
export declare type UserJoinOrLeaveRoomWSMsg = WebSocketWSMsg & {
  data: UserJoinOrLeaveRoomWSMsgData;
};

// 定义用户添加或移除消息表情的WebSocket消息类型
export declare type UserAddOrRemoveEmojiToMsgWSMsg = WebSocketWSMsg & {
  data: UserAddOrRemoveEmojiToMsgWSMsgData;
};

// 定义卡片消息按钮点击的WebSocket消息类型
export declare type CardMessageBtnClickWSMsg = WebSocketWSMsg & {
  data: CardMessageBtnClickWSMsgData;
};

// 定义用户消息的WebSocket消息类型
export declare type UserImMessageWSMsg = WebSocketWSMsg & {
  data: UserImMessageWSMsgData;
};

/**
 * 实现WebSocket消息的类，同时也实现了命令源的接口
 * 该类用于处理和封装WebSocket消息，提供消息回复、用户回复等功能
 */
export class WSMsgImpl implements WSMsgData, CommandSource {
  // 消息相关的属性
  public readonly channel_id: string;
  public readonly channel_name: string;
  public readonly channel_type: number;
  public readonly msg_id: string;
  public readonly room_id: string;
  public readonly room_nickname: string;
  public readonly send_time: number;
  public readonly user_info: SimpleUserInfo;
  // 消息发送函数
  private readonly sender: (msg: Message) => void;
  // 用户消息发送函数
  private readonly userSender: (msg: UserMessage) => void;

  /**
   * 构造函数
   * @param sender 消息发送函数
   * @param userSender 用户消息发送函数
   * @param data WebSocket消息数据
   * @param additional 额外的信息，包括频道、房间、用户信息等
   */
  public constructor(
    sender: (msg: Message) => void,
    userSender: (msg: UserMessage) => void,
    data: WSMsgData,
    additional: {
      channel_id: string;
      channel_name: string;
      channel_type: number;
      room_id: string;
      room_nickname: string;
      user_info: SimpleUserInfo;
    }
  ) {
    this.msg_id = data.msg_id;
    this.send_time = data.send_time;
    this.channel_id = additional.channel_id;
    this.channel_name = additional.channel_name;
    this.channel_type = additional.channel_type;
    this.room_id = additional.room_id;
    this.room_nickname = additional.room_nickname;
    this.user_info = additional.user_info;
    this.sender = sender;
    this.userSender = userSender;
  }

  /**
   * 获取用户昵称
   * @returns 用户昵称
   */
  public getName(): string {
    return this.user_info.nickname;
  }

  /**
   * 检查权限，目前未实现
   * @param permission 权限字符串
   * @returns 总是返回true
   */
  public hasPermission(permission: string): boolean {
    return !!permission || true;
  }

  /**
   * 发送失败消息
   * @param msg 消息内容或Message对象
   */
  public fail(msg: Message | string): void {
    if (typeof msg === 'string') this.reply(`fail: ${msg}`);
    else this.reply(msg);
  }

  /**
   * 发送成功消息
   * @param msg 消息内容或Message对象
   */
  public success(msg: Message | string): void {
    this.reply(msg);
  }

  /**
   * 通过回调函数发送失败消息
   * @param callback 回调函数，用于构建消息
   */
  public failBy(callback: (builder: MessageBuilder) => void): void {
    this.replyBy(callback);
  }

  /**
   * 通过回调函数发送成功消息
   * @param callback 回调函数，用于构建消息
   */
  public successBy(callback: (builder: MessageBuilder) => void): void {
    this.replyBy(callback);
  }

  /**
   * 回复消息
   * @param msg 消息内容或Message对象
   */
  public reply(msg: Message | string) {
    if (typeof msg === 'string') {
      msg = ExtendedMarkdownMessageImpl.create()
        .at(this.user_info)
        .reply(this.msg_id)
        .to(this.room_id, this.channel_id)
        .text(msg as string);
    } else {
      msg.room_id = this.room_id;
      msg.channel_id = this.channel_id;
    }
    this.sender(msg as Message);
  }

  /**
   * 通过回调函数回复消息
   * @param callback 回调函数，用于构建消息
   */
  public replyBy(callback: (builder: MessageBuilder) => void) {
    const builder = new MessageBuilder();
    callback(builder);
    this.reply(builder.build());
  }

  /**
   * 回复用户消息
   * @param msg 消息内容或UserMessage对象
   */
  public replyUser(msg: UserMessage | string) {
    if (typeof msg === 'string') {
      msg = MarkdownUserMessageImpl.create()
        .to(this.user_info.user_id)
        .text(msg as string);
    } else {
      msg.to_user_id = this.user_info.user_id;
    }
    this.userSender(msg as UserMessage);
  }

  /**
   * 通过回调函数回复用户消息
   * @param callback 回调函数，用于构建消息
   */
  public replyUserBy(callback: (builder: UserMessageBuilder) => void) {
    const builder = new UserMessageBuilder();
    callback(builder);
    this.replyUser(builder.build());
  }
}
