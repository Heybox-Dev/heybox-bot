// noinspection JSUnusedGlobalSymbols

import { Cancelable } from 'gugle-event/src';
import { HeyBoxBot } from '../index';
import { RawData } from 'ws';

export declare type ILoggerMethod = (msg: string) => void;

export declare type ILogger = {
  debug: ILoggerMethod;
  error: ILoggerMethod;
  info: ILoggerMethod;
  warning: ILoggerMethod;
};

export declare type UserBaseInfo = {
  avatar: string;
  avatar_decoration: AvatarDecoration;
  bot: boolean;
  level: number;
  medals: any;
  nickname: string;
  roles: string[];
  room_nickname: string;
  tag: any;
  user_id: number;
};

export declare type UserInfo = {
  user_base_info: UserBaseInfo;
};

export declare type ChannelBaseInfo = {
  channel_id: string;
  channel_name: string;
  channel_type: number;
};

export declare type RoomBaseInfo = {
  room_avatar: string;
  room_id: string;
  room_name: string;
};
export declare type CommandOption = {
  name: string;
  type: number;
  value: string;
};
export declare type CommandInfo = {
  id: string;
  name: string;
  options: CommandOption[];
  type: number;
};

export declare type ResponseResult = {
  chatmobile_ack_id: string;
  heychat_ack_id: string;
};

export declare type Response = {
  msg: string;
  result: ResponseResult;
  status: string;
};

export declare type AvatarDecoration = {
  src_type: string;
  src_url: string;
};

export declare type TextMessage = {
  msg: string;
  msg_type: 10;
  heychat_ack_id: '0';
  reply_id: string;
  room_id: string;
  addition: '{"img_files_info":[]}';
  at_user_id: string;
  at_role_id: string;
  mention_channel_id: string;
  channel_id: string;
  channel_type: number;
};

export declare type WebSocketMessageData = {
  msg_id: string;
  send_time: number;
};

export declare type CommandMessage = WebSocketMessageData & {
  bot_id: number;
  channel_base_info: ChannelBaseInfo;
  command_info: CommandInfo;
  room_base_info: RoomBaseInfo;
  sender_info: UserBaseInfo;
};

export declare type UserJoinOrLeaveRoomMessage = {
  room_base_info: RoomBaseInfo;
  user_info: UserInfo;
  state: 1 | 0;
};

export declare type UserAddOrRemoveEmojiToMsgMessage = {
  channel_id: string;
  emoji: string;
  is_add: 1 | 0;
  msg_id: string;
  user_id: string;
};

export declare type CardMessageBtnClickMessage = {
  room_base_info: RoomBaseInfo;
  channel_base_info: ChannelBaseInfo;
  sender_info: UserBaseInfo;
  event: string;
  msg_id: string;
  text: string;
  value: string;
};

export declare type WebSocketMessage = {
  sequence: number;
  type: string;
  notify_type: string;
  data: any;
  timestamp: number;
};

export declare type WebSocketCommandMessage = WebSocketMessage & {
  data: CommandMessage;
};

export declare type WebSocketUserJoinOrLeaveRoomMessage = WebSocketMessage & {
  data: UserJoinOrLeaveRoomMessage;
};

export declare type WebSocketUserAddOrRemoveEmojiToMsgMessage = WebSocketMessage & {
  data: UserAddOrRemoveEmojiToMsgMessage;
};

export declare type WebSocketCardMessageBtnClickMessage = WebSocketMessage & {
  data: CardMessageBtnClickMessage;
};

export declare type BotEvent =
  | 'before-start'
  | 'after-start'
  | 'before-stop'
  | 'after-stop'
  | 'websocket-message'
  | 'command-message'
  | 'user-add-or-remove-emoji-to-msg'
  | 'user-join-or-leave-room'
  | 'card-message-btn-click'
  | string;

export declare type BotEventCancelable = boolean;

export declare type EventCallback<T extends BotEvent, C extends BotEventCancelable> = T extends 'before-start'
  ? C extends true
    ? (cancelable: Cancelable, bot: HeyBoxBot, path: string) => void
    : (bot: HeyBoxBot, path: string) => void
  : T extends 'after-start'
    ? C extends true
      ? (cancelable: Cancelable, bot: HeyBoxBot) => void
      : (bot: HeyBoxBot) => void
    : T extends 'before-stop'
      ? C extends true
        ? (cancelable: Cancelable, bot: HeyBoxBot) => void
        : (bot: HeyBoxBot) => void
      : T extends 'before-stop'
        ? C extends true
          ? (cancelable: Cancelable, bot: HeyBoxBot) => void
          : (bot: HeyBoxBot) => void
        : T extends 'websocket-message'
          ? C extends true
            ? (cancelable: Cancelable, bot: HeyBoxBot, data: RawData) => void
            : (bot: HeyBoxBot, data: RawData) => void
          : T extends 'command-message'
            ? C extends true
              ? (cancelable: Cancelable, bot: HeyBoxBot, user: UserBaseInfo, commandMsg: CommandMessage) => void
              : (bot: HeyBoxBot, user: UserBaseInfo, commandMsg: CommandMessage) => void
            : T extends 'user-add-or-remove-emoji-to-msg'
              ? C extends true
                ? (cancelable: Cancelable, bot: HeyBoxBot, msg: UserAddOrRemoveEmojiToMsgMessage) => void
                : (bot: HeyBoxBot, msg: UserAddOrRemoveEmojiToMsgMessage) => void
              : T extends 'user-join-or-leave-room'
                ? C extends true
                  ? (cancelable: Cancelable, bot: HeyBoxBot, msg: UserJoinOrLeaveRoomMessage) => void
                  : (bot: HeyBoxBot, msg: UserJoinOrLeaveRoomMessage) => void
                : T extends 'card-message-btn-click'
                  ? C extends true
                    ? (cancelable: Cancelable, bot: HeyBoxBot, msg: CardMessageBtnClickMessage) => void
                    : (bot: HeyBoxBot, msg: CardMessageBtnClickMessage) => void
                  : C extends true
                    ? (cancelable: Cancelable, ...args: any) => void
                    : (...args: any) => void;
