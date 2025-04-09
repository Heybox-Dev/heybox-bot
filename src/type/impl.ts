import { TextMessage, UserInfo, WebSocketMessageData } from './define';
import { CommandSource } from '../command';

export class TextMessageImpl implements TextMessage {
  public readonly addition: '{"img_files_info":[]}' = '{"img_files_info":[]}' as const;
  public at_role_id: string = '';
  public at_user_id: string = '';
  public channel_id: string = '';
  public channel_type: number = 1;
  public readonly heychat_ack_id: '0' = '0' as const;
  public mention_channel_id: string = '';
  public msg: string = '';
  public readonly msg_type: 10 = 10 as const;
  public reply_id: string = '';
  public room_id: string = '';
  public at_all = false;
  public at_hear = false;

  public constructor() {}

  public static create(): TextMessageImpl {
    return new TextMessageImpl();
  }

  public at(user: UserInfo): TextMessageImpl {
    this.at_user_id = user.user_base_info.user_id.toString();
    return this;
  }

  public atRole(roleId: string): TextMessageImpl {
    this.at_role_id = roleId;
    return this;
  }

  public atAll(): TextMessageImpl {
    this.at_all = true;
    return this;
  }

  public atHear(): TextMessageImpl {
    this.at_hear = true;
    return this;
  }

  public text(text: string): TextMessageImpl {
    this.msg = `${text}`;
    return this;
  }

  public to(roomId: string, channelId: string): TextMessageImpl {
    this.room_id = roomId;
    this.channel_id = channelId;
    return this;
  }

  public reply(msgId: string): TextMessageImpl {
    this.reply_id = msgId;
    return this;
  }

  public covert(): TextMessage {
    const data: TextMessage = {
      ...this
    };
    if (this.at_user_id) {
      data.msg = `@{id:${data.at_user_id}} ${data.msg}`;
    }
    if (this.at_role_id) {
      data.msg = `@{id:${data.at_user_id}} ${data.msg}`;
    }
    if (this.at_all) {
      data.msg = `@{all} ${data.msg}`;
    }
    if (this.at_hear) {
      data.msg = `@{hear} ${data.msg}`;
    }
    return data;
  }
}

export class MessageImpl implements WebSocketMessageData, CommandSource {
  public readonly channel_id: string;
  public readonly channel_name: string;
  public readonly channel_type: number;
  public readonly msg_id: string;
  public readonly room_id: string;
  public readonly room_nickname: string;
  public readonly send_time: number;
  public readonly user_info: UserInfo;
  private readonly send: (msg: TextMessage) => void;

  public constructor(
    sender: (msg: TextMessage) => void,
    data: WebSocketMessageData,
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

  public fail(msg: TextMessage | string): void {
    if (typeof msg === 'string') this.reply(`fail: ${msg}`);
    else this.reply(msg);
  }

  public getName(): string {
    return this.user_info.user_base_info.nickname;
  }

  public hasPermission(permission: string): boolean {
    return !!permission || true;
  }

  public success(msg: TextMessage | string): void {
    this.reply(msg);
  }

  public reply(msg: TextMessage | string) {
    if (typeof msg === 'string') {
      this.send(
        TextMessageImpl.create()
          .text(msg as string)
          .reply(this.msg_id)
          .to(this.room_id, this.channel_id)
          .at(this.user_info)
          .covert()
      );
    } else {
      this.send(msg as TextMessage);
    }
  }
}
