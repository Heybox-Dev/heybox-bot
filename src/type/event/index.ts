import { HeyBoxBot } from '@/index';
import { UserBaseInfo } from '@/type/info';
import {
  CardMessageBtnClickWSMsgData,
  CommandWSMsgData,
  SimpleUserInfo,
  UserAddOrRemoveEmojiToMsgWSMsgData,
  UserJoinOrLeaveRoomWSMsgData
} from '@/type/websocket';
import { Cancelable } from 'gugle-event';
import { RawData } from 'ws';

export declare type BotRuntimeEvent = 'before-start' | 'after-start' | 'before-stop' | 'after-stop';
export declare type HeyBoxEvent =
  | 'command-message'
  | 'user-add-or-remove-emoji-to-msg'
  | 'user-join-or-leave-room'
  | 'card-message-btn-click';

export declare type BotEvent = BotRuntimeEvent | 'websocket-message' | HeyBoxEvent | string;

export declare type BotEventCancelable = boolean;

export declare type BotRuntimeEventCallback<
  T extends BotRuntimeEvent,
  C extends BotEventCancelable
> = T extends 'before-start'
  ? C extends true
    ? (cancelable: Cancelable, bot: HeyBoxBot, path: string) => void
    : (bot: HeyBoxBot, path: string) => void
  : C extends true
    ? (cancelable: Cancelable, bot: HeyBoxBot) => void
    : (bot: HeyBoxBot) => void;

export declare type HeyBoxEventCallback<
  T extends HeyBoxEvent,
  C extends BotEventCancelable
> = T extends 'command-message'
  ? C extends true
    ? (cancelable: Cancelable, bot: HeyBoxBot, user: UserBaseInfo, commandMsg: CommandWSMsgData) => void
    : (bot: HeyBoxBot, user: UserBaseInfo, commandMsg: CommandWSMsgData) => void
  : T extends 'user-add-or-remove-emoji-to-msg'
    ? C extends true
      ? (cancelable: Cancelable, bot: HeyBoxBot, msg: UserAddOrRemoveEmojiToMsgWSMsgData) => void
      : (bot: HeyBoxBot, msg: UserAddOrRemoveEmojiToMsgWSMsgData) => void
    : T extends 'user-join-or-leave-room'
      ? C extends true
        ? (cancelable: Cancelable, bot: HeyBoxBot, user: UserBaseInfo, msg: UserJoinOrLeaveRoomWSMsgData) => void
        : (bot: HeyBoxBot, user: SimpleUserInfo, msg: UserJoinOrLeaveRoomWSMsgData) => void
      : T extends 'card-message-btn-click'
        ? C extends true
          ? (cancelable: Cancelable, bot: HeyBoxBot, user: UserBaseInfo, msg: CardMessageBtnClickWSMsgData) => void
          : (bot: HeyBoxBot, user: UserBaseInfo, msg: CardMessageBtnClickWSMsgData) => void
        : C extends true
          ? (cancelable: Cancelable, ...args: any) => void
          : (...args: any) => void;

export declare type EventCallback<T extends BotEvent, C extends BotEventCancelable> = T extends BotRuntimeEvent
  ? BotRuntimeEventCallback<T, C>
  : T extends 'websocket-message'
    ? C extends true
      ? (cancelable: Cancelable, bot: HeyBoxBot, data: RawData) => void
      : (bot: HeyBoxBot, data: RawData) => void
    : T extends HeyBoxEvent
      ? HeyBoxEventCallback<T, C>
      : C extends true
        ? (cancelable: Cancelable, ...args: any) => void
        : (...args: any) => void;
