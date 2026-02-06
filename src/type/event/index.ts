import { HeyBoxBot } from '@/index';
import { SimpleUserInfo, UserBaseInfo } from '@/type/info';
import {
  CardMessageBtnClickWSMsgData,
  CommandWSMsgData,
  UserAddOrRemoveEmojiToMsgWSMsgData,
  UserImMessageWSMsgData,
  UserJoinOrLeaveRoomWSMsgData
} from '@/type/websocket';
import { Cancelable } from 'gugle-event';
import { RawData } from 'ws';

/**
 * 定义机器人运行时事件类型的元组
 * 用于标识机器人在不同运行阶段所触发的事件
 */
export declare type BotRuntimeEvent = 'before-start' | 'after-start' | 'before-stop' | 'after-stop';

/**
 * 定义HeyBox事件类型的元组
 * 用于标识HeyBox特定事件，如命令消息、用户表情反应等
 */
export declare type HeyBoxEvent =
  | 'command-message'
  | 'user-add-or-remove-emoji-to-msg'
  | 'user-join-or-leave-room'
  | 'card-message-btn-click'
  | 'user-im-message';

/**
 * 定义机器人的事件类型
 * 包括运行时事件、WebSocket消息事件、HeyBox事件和其他自定义事件
 */
export declare type BotEvent = BotRuntimeEvent | 'websocket-message' | HeyBoxEvent | string;

/**
 * 定义事件是否可取消的类型
 * 用于指示事件处理函数是否支持取消事件的默认行为
 */
export declare type BotEventCancelable = boolean;

/**
 * 定义机器人运行时事件的回调函数类型
 * 根据事件类型和是否可取消，决定回调函数的参数和返回类型
 */
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

/**
 * 定义HeyBox事件的回调函数类型
 * 根据事件类型和是否可取消，决定回调函数的参数和返回类型
 */
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
        : T extends 'user-im-message'
          ? C extends true
            ? (cancelable: Cancelable, bot: HeyBoxBot, user: UserBaseInfo, msg: UserImMessageWSMsgData) => void
            : (bot: HeyBoxBot, user: UserBaseInfo, msg: UserImMessageWSMsgData) => void
          : C extends true
            ? (cancelable: Cancelable, ...args: any) => void
            : (...args: any) => void;

/**
 * 定义通用事件回调函数类型
 * 根据事件类型和是否可取消，决定回调函数的参数和返回类型
 */
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
