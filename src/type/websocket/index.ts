import { CommandSource } from '@/command';
import { ExtendedMarkdownMessageImpl, Message } from '@/type';
import { ChannelBaseInfo, CommandInfo, RoomBaseInfo, UserBaseInfo, UserInfo } from '@/type/info';
import { MessageBuilder } from '@/type/message';

export declare type WSMsgData = {
  msg_id: string;
  send_time: number;
};

export declare type CommandWSMsgData = WSMsgData & {
  bot_id: number;
  channel_base_info: ChannelBaseInfo;
  command_info: CommandInfo;
  room_base_info: RoomBaseInfo;
  sender_info: UserBaseInfo;
};

export declare type SimpleUserInfo = {
  avatar: string;
  level: number;
  nickname: string;
  user_id: number;
}

export declare type UserJoinOrLeaveRoomWSMsgData = {
  room_base_info: RoomBaseInfo;
  user_info: SimpleUserInfo;
  state: 1 | 0;
};

export declare type UserAddOrRemoveEmojiToMsgWSMsgData = {
  room_id: string;
  channel_id: string;
  emoji: string;
  is_add: 1 | 0;
  msg_id: string;
  user_id: string;
};

export declare type CardMessageBtnClickWSMsgData = {
  room_base_info: RoomBaseInfo;
  channel_base_info: ChannelBaseInfo;
  sender_info: UserBaseInfo;
  event: string;
  msg_id: string;
  text: string;
  value: string;
};

export declare type WebSocketWSMsg = {
  sequence: number;
  type: string;
  notify_type: string;
  data: any;
  timestamp: number;
};

export declare type CommandWSMsg = WebSocketWSMsg & {
  data: CommandWSMsgData;
};

export declare type UserJoinOrLeaveRoomWSMsg = WebSocketWSMsg & {
  data: UserJoinOrLeaveRoomWSMsgData;
};

export declare type UserAddOrRemoveEmojiToMsgWSMsg = WebSocketWSMsg & {
  data: UserAddOrRemoveEmojiToMsgWSMsgData;
};

export declare type CardMessageBtnClickWSMsg = WebSocketWSMsg & {
  data: CardMessageBtnClickWSMsgData;
};

export class WSMsgImpl implements WSMsgData, CommandSource {
  public readonly channel_id: string;
  public readonly channel_name: string;
  public readonly channel_type: number;
  public readonly msg_id: string;
  public readonly room_id: string;
  public readonly room_nickname: string;
  public readonly send_time: number;
  public readonly user_info: UserInfo;
  private readonly send: (msg: Message) => void;

  public constructor(
    sender: (msg: Message) => void,
    data: WSMsgData,
    additional: {
      channel_id: string;
      channel_name: string;
      channel_type: number;
      room_id: string;
      room_nickname: string;
      user_info: UserInfo;
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
    this.send = sender;
  }

  public getName(): string {
    return this.user_info.user_base_info.nickname;
  }

  public hasPermission(permission: string): boolean {
    return !!permission || true;
  }

  public fail(msg: Message | string): void {
    if (typeof msg === 'string') this.reply(`fail: ${msg}`);
    else this.reply(msg);
  }

  public success(msg: Message | string): void {
    this.reply(msg);
  }

  public failBy(callback: (builder: MessageBuilder) => void): void {
    this.replyBy(callback).then();
  }

  public successBy(callback: (builder: MessageBuilder) => void): void {
    this.replyBy(callback).then();
  }

  public reply(msg: Message | string) {
    if (typeof msg === 'string') {
      this.send(
        ExtendedMarkdownMessageImpl.create()
          .at(this.user_info)
          .reply(this.msg_id)
          .to(this.room_id, this.channel_id)
          .text(msg as string)
      );
    } else {
      msg.room_id = this.room_id;
      msg.channel_id = this.channel_id;
      this.send(msg as Message);
    }
  }

  public async replyBy(callback: (builder: MessageBuilder) => void) {
    const builder = new MessageBuilder();
    callback(builder);
    this.reply(builder.build());
  }
}
