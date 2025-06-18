export default class Constants {
  public static readonly WSS_URL = 'wss://chat.xiaoheihe.cn/chatroom/ws/connect?';
  public static readonly COMMON_PARAMS =
    'client_type=heybox_chat&x_client_type=web&os_type=web&x_os_type=bot&x_app=heybox_chat&chat_os_type=bot&chat_version=1.30.0';
  public static readonly TOKEN_PARAMS = '&token=';
  public static readonly HTTP_HOST = 'https://chat.xiaoheihe.cn';
  public static readonly SEND_MSG_URL = '/chatroom/v2/channel_msg/send?';
  public static readonly CDN_URL = 'max-c.com';
  public static readonly CDN_PREFIX = 'https://chat.max-c.com';
  public static readonly IMAGE_CDN_PREFIX = `${Constants.CDN_PREFIX}/pic`;
  public static readonly UPLOAD_URL = 'https://chat-upload.xiaoheihe.cn/upload?';
}
