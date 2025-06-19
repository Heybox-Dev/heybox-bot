// 导出与消息相关的一系列实现类和构建器
export {
  ExtendedMarkdownMessageImpl, // 扩展的Markdown消息实现类
  CardMessageImpl, // 卡片消息实现类
  MessageBuilder, // 消息构建器
  AbstractMessageImpl, // 抽象消息实现类
  AbstractUserMessageImpl, // 抽象用户消息实现类
  MarkdownUserMessageImpl, // Markdown用户消息实现类
  ImageUserMessageImpl, // 图片用户消息实现类
  UserMessageBuilder // 用户消息构建器
} from '@/type/message';

// 导出WebSocket消息的实现类
export { WSMsgImpl } from '@/type/websocket';
