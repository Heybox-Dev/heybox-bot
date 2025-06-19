/**
 * Constants类用于定义和存储项目中使用的常量，包括API的URL和其他必要的参数。
 */
export default class Constants {
  // WSS_URL是WebSocket连接的URL。
  public static readonly WSS_URL = 'wss://chat.xiaoheihe.cn/chatroom/ws/connect';

  // COMMON_PARAMS是API请求中的通用参数，包含客户端类型、操作系统类型等信息。
  public static readonly COMMON_PARAMS =
    '?client_type=heybox_chat&x_client_type=web&os_type=web&x_os_type=bot&x_app=heybox_chat&chat_os_type=bot&chat_version=1.30.0';

  // TOKEN_PARAMS是API请求中用于添加用户令牌的参数前缀。
  public static readonly TOKEN_PARAMS = '&token=';

  // BASE_URL是API的基础URL。
  public static readonly BASE_URL = 'https://chat.xiaoheihe.cn/chatroom';

  // SEND_MSG_URL是发送消息API的URL路径。
  public static readonly SEND_MSG_URL = '/v2/channel_msg/send';

  // SEND_USER_MSG_URL是发送用户消息API的URL路径。
  public static readonly SEND_USER_MSG_URL = '/v3/msg/user';

  // CDN_URL是内容分发网络的域名，用于资源的快速访问。
  public static readonly CDN_URL = 'max-c.com';

  // UPLOAD_URL是上传文件API的URL。
  public static readonly UPLOAD_URL = 'https://chat-upload.xiaoheihe.cn/upload';
}
