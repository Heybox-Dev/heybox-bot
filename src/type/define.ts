// 导出消息相关的类型，包括普通消息、Markdown消息、卡片消息及其各种模块类型
export {
  Message,
  ExtendedMarkdownMessage,
  CardMessage,
  CardOriginalModuleType,
  CardOriginalModule,
  CardOriginalData,
  CardOriginalImageContent,
  CardOriginalTextContentType,
  AdditionOriginal,
  CardOriginalButtonContent,
  CardOriginalButtonConfig,
  CardOriginalButtonContentTheme,
  CardOriginalButtonContentEventType,
  CardOriginalCountdownModule,
  CardOriginalCountdownModuleMode,
  CardOriginalDividerModule,
  CardOriginalImagesModule,
  CardOriginalPlainTextContent,
  CardOriginalSectionModule,
  UserMessage,
  MarkdownUserMessage,
  ImageUserMessage
} from '@/type/message';

// 导出WebSocket消息相关的类型，包括不同的WebSocket消息数据类型和命令类型
export {
  WSMsgData,
  CommandWSMsgData,
  SimpleUserInfo,
  UserJoinOrLeaveRoomWSMsgData,
  UserAddOrRemoveEmojiToMsgWSMsgData,
  CardMessageBtnClickWSMsgData,
  WebSocketWSMsg,
  CommandWSMsg,
  UserJoinOrLeaveRoomWSMsg,
  UserAddOrRemoveEmojiToMsgWSMsg,
  CardMessageBtnClickWSMsg
} from '@/type/websocket';

// 导出用户和频道信息相关的类型，包括用户基础信息、频道基础信息等
export {
  AvatarDecoration,
  UserBaseInfo,
  UserInfo,
  ChannelBaseInfo,
  RoomBaseInfo,
  CommandOption,
  CommandInfo
} from '@/type/info';

// 导出日志相关的类型，包括日志方法和日志接口
export { ILoggerMethod, ILogger } from '@/type/logger';

// 导出响应相关的类型，包括响应结果和响应本身
export { ResponseResult, Response } from '@/type/response';

// 导出机器人事件相关的类型，包括运行时事件、HeyBox事件、取消事件等
export {
  BotRuntimeEvent,
  HeyBoxEvent,
  BotEvent,
  BotEventCancelable,
  BotRuntimeEventCallback,
  HeyBoxEventCallback,
  EventCallback
} from '@/type/event';
