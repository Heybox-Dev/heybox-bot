// noinspection DuplicatedCode

import Constants from '@/constants';
import { UserInfo } from '@/type/info';
import { Request, Util } from '@/utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

/**
 * 图片文件信息类型定义
 * 包含图片的URL、宽度和高度
 */
export declare type ImgFilesInfo = {
  url: string;
  width: number;
  height: number;
};

/**
 * 附加原始信息类型定义
 * 包含图片文件信息数组
 */
export declare type AdditionOriginal = {
  img_files_info: ImgFilesInfo[];
};

/**
 * 消息类型定义
 * 包含消息的各种属性，如消息类型、内容、回复ID等
 */
export declare type Message = {
  heychat_ack_id: string;
  msg_type: number;
  msg: string;
  room_id: string;
  channel_id: string;
  reply_id: string;
  addition: string;
};

/**
 * 用户消息类型定义
 * 包含用户消息的必要属性，如消息类型和接收用户ID
 */
export declare type UserMessage = {
  heychat_ack_id: string;
  msg_type: number;
  to_user_id: number;
};

/**
 * Markdown用户消息类型定义
 * 继承自用户消息，特有属性msg_type固定为4，表示Markdown类型的消息
 */
export declare type MarkdownUserMessage = UserMessage & {
  msg_type: 4;
  msg: string;
  addition: string;
};

/**
 * 图片用户消息类型定义
 * 继承自用户消息，特有属性msg_type固定为3，表示图片类型的消息
 */
export declare type ImageUserMessage = UserMessage & {
  msg_type: 3;
  img: string;
};

/**
 * 扩展Markdown消息类型定义
 * 继承自消息，用于定义特定类型的Markdown消息，包含额外的@用户ID、@角色ID等属性
 */
export declare type ExtendedMarkdownMessage = Message & {
  msg_type: 10;
  at_user_id: string;
  at_role_id: string;
  mention_channel_id: string;
  channel_type: number;
};

/**
 * 卡片消息类型定义
 * 继承自消息，特有属性msg_type固定为20，表示卡片类型的消息
 */
export declare type CardMessage = Message & {
  msg_type: 20;
};

/**
 * AbstractMessageImpl 是一个抽象类，实现了 Message 接口的部分功能。
 * 它提供了一个基础结构，用于构建和处理消息，特别是那些需要转换为特定格式的消息。
 */
export abstract class AbstractMessageImpl implements Message {
  /**
   * addition_original 是一个可选字段，包含原始的附加信息，如图片文件信息。
   */
  public addition_original?: AdditionOriginal = {
    img_files_info: []
  };

  /**
   * addition 是一个字符串字段，以 JSON 格式存储附加信息，默认包含空的图片文件信息数组。
   */
  public addition: string = '{"img_files_info":[]}';

  /**
   * channel_id 表示消息所属的频道ID。
   */
  public channel_id: string = '';

  /**
   * heychat_ack_id 是一个只读字段，用于存储消息的确认ID，确保消息的唯一性和可追踪性。
   */
  public readonly heychat_ack_id: string = `${Util.getAckId()}`;

  /**
   * msg 是消息的主体内容。
   */
  public msg: string = '';

  /**
   * msg_type 是一个只读字段，表示消息的类型，不同类型的消息可能有不同的处理方式。
   */
  public readonly msg_type: number;

  /**
   * reply_id 用于存储回复的消息ID，如果当前消息是回复其他消息的。
   */
  public reply_id: string = '';

  /**
   * room_id 表示消息所属的房间ID。
   */
  public room_id: string = '';

  /**
   * 构造函数，初始化消息类型。
   * @param msgType 消息类型，用于区分不同的消息种类。
   */
  protected constructor(msgType: number) {
    this.msg_type = msgType;
  }

  /**
   * 设置消息的目标房间和频道。
   * @param roomId 目标房间的ID。
   * @param channelId 目标频道的ID。
   * @returns 返回当前实例，支持链式调用。
   */
  public to(roomId: string, channelId: string): this {
    this.room_id = roomId;
    this.channel_id = channelId;
    return this;
  }

  /**
   * 设置当前消息为回复指定消息ID的消息。
   * @param msgId 被回复的消息的ID。
   * @returns 返回当前实例，支持链式调用。
   */
  public reply(msgId: string): this {
    this.reply_id = msgId;
    return this;
  }

  /**
   * 抽象方法，需要在子类中实现。
   * 用于将当前消息实例转换为 Message 接口定义的消息格式。
   * @returns 返回转换后的 Message 实例。
   */
  public abstract convert(): Message;
}

/**
 * 实现了ExtendedMarkdownMessage接口的类，用于创建和操作扩展Markdown消息
 */
export class ExtendedMarkdownMessageImpl extends AbstractMessageImpl implements ExtendedMarkdownMessage {
  // 定义了消息中@角色的ID
  public at_role_id: string = '';
  // 定义了消息中@用户的ID
  public at_user_id: string = '';
  // 定义了是否@所有人
  public at_all? = false;
  // 定义了是否@在线用户
  public at_hear? = false;
  // 定义了频道类型
  public channel_type: number = 1;
  // 定义了提及频道的ID
  public mention_channel_id: string = '';
  // 定义了消息类型，固定为10
  public readonly msg_type: 10 = 10 as const;

  /**
   * 私有构造函数，确保类的实例只能通过create方法创建
   */
  private constructor() {
    super(10);
  }

  /**
   * 创建ExtendedMarkdownMessageImpl类的实例
   * @returns ExtendedMarkdownMessageImpl的实例
   */
  public static create(): ExtendedMarkdownMessageImpl {
    return new ExtendedMarkdownMessageImpl();
  }

  /**
   * 添加文本内容到消息中，支持Markdown格式
   * @param text 要添加的文本
   * @param bold 是否加粗文本
   * @param italic 是否斜体文本
   * @param strikethrough 是否划线文本
   * @returns 当前实例，支持链式调用
   */
  public text(text: string, bold: boolean = false, italic: boolean = false, strikethrough: boolean = false): this {
    let msg = `${text}`;
    if (italic) msg = `*${msg}*`;
    if (bold) msg = `**${msg}**`;
    if (strikethrough) msg = `~~${msg}~~`;
    const flag = this.msg.endsWith('*') || this.msg.endsWith('~');
    if (this.msg[this.msg.length - 1] == msg[0] && flag) this.msg += ' ';
    this.msg += msg;
    return this;
  }

  /**
   * 添加超链接到消息中，支持Markdown格式
   * @param url 链接地址
   * @param text 显示的文本
   * @param bold 是否加粗文本
   * @param italic 是否斜体文本
   * @param strikethrough 是否划线文本
   * @returns 当前实例，支持链式调用
   */
  public link(
    url: string,
    text: string = url,
    bold: boolean = false,
    italic: boolean = false,
    strikethrough: boolean = false
  ): this {
    this.msg += `[`;
    this.text(text, bold, italic, strikethrough);
    this.msg += `](${url})`;
    return this;
  }

  /**
   * 添加图片到消息中，支持Markdown格式
   * @param url 图片地址
   * @param width 图片宽度
   * @param height 图片高度
   * @returns 当前实例，支持链式调用
   */
  private addImage(url: string, width: number, height: number): this {
    this.addition_original?.img_files_info.push({
      url,
      width,
      height
    });
    this.msg += `![](${url})`;
    this.addition = JSON.stringify(this.addition_original);
    return this;
  }

  /**
   * 公共方法，用于添加图片，支持本地文件或URL
   * @param url 图片地址或本地文件
   * @param width 图片宽度
   * @param height 图片高度
   * @returns 当前实例，支持链式调用
   */
  public image(url: BufferSource | string, width: number, height: number): this {
    if (typeof url !== 'string' || !url.includes(Constants.CDN_URL)) {
      this.addImage(Request.uploadFileSync(url), width, height);
      return this;
    } else {
      this.addImage(url, width, height);
    }
    return this;
  }

  /**
   * 添加@用户到消息中
   * @param user 用户信息
   * @returns 当前实例，支持链式调用
   */
  public at(user: UserInfo): this {
    if (this.at_user_id != '') this.at_user_id += ',';
    const userId = user.user_base_info.user_id;
    this.at_user_id += `${userId}`;
    this.text(`@{id:${userId}} `);
    return this;
  }

  /**
   * 添加@角色到消息中
   * @param roleId 角色ID
   * @returns 当前实例，支持链式调用
   */
  public atRole(roleId: string): this {
    if (this.at_role_id != '') this.at_role_id += ',';
    this.at_role_id += `${roleId}`;
    this.text(`@{id:${roleId}} `);
    return this;
  }

  /**
   * 添加提及频道到消息中
   * @param mentionChannelId 频道ID
   * @returns 当前实例，支持链式调用
   */
  public mentionChannel(mentionChannelId: string): this {
    if (this.mention_channel_id != '') this.mention_channel_id += ',';
    this.mention_channel_id += `${mentionChannelId}`;
    this.text(`#{id:${mentionChannelId}} `);
    return this;
  }

  /**
   * 添加@所有人到消息中
   * @returns 当前实例，支持链式调用
   */
  public atAll(): this {
    this.at_all = true;
    this.text('@{all} ');
    return this;
  }

  /**
   * 添加@在线用户到消息中
   * @returns 当前实例，支持链式调用
   */
  public atHear(): this {
    this.at_hear = true;
    this.text('@{hear} ');
    return this;
  }

  /**
   * 添加标题到消息中，支持Markdown格式
   * @param text 标题文本
   * @param level 标题级别，1或2
   * @returns 当前实例，支持链式调用
   */
  public header(text: string, level: 1 | 2 = 1): this {
    if (!this.msg.endsWith('\n')) this.text('\n');
    this.text(`${'#'.repeat(level)} ${text}\n`);
    return this;
  }

  /**
   * 添加有序列表到消息中
   * @param text 有序列表文本
   * @returns 当前实例，支持链式调用
   */
  public order(text: string): this {
    const lastLine = this.getLastLine();
    const lastLineNum = lastLine.split('.')[0];
    let num = 1;
    if (lastLineNum.match(/^\d+$/)) {
      num = parseInt(lastLineNum) + 1;
    }
    if (!this.msg.endsWith('\n')) this.text('\n');
    this.text(`${num}. ${text}\n`);
    return this;
  }

  /**
   * 添加列表项到消息中，支持Markdown格式
   * @param text 列表项文本
   * @param indent 缩进级别，默认为1
   * @returns 当前实例，支持链式调用
   */
  public list(text: string, indent: number = 1): this {
    if (!this.msg.endsWith('\n')) this.text('\n');
    for (let i = 1; i < indent; i++) {
      this.text('  ');
    }
    this.text(`* ${text}\n`);
    return this;
  }

  /**
   * 获取消息中的最后一行文本
   * @returns 最后一行文本
   */
  public getLastLine(): string {
    const line = this.msg.split('\n').pop();
    return line || '';
  }

  /**
   * 转换当前实例为Message类型，移除不必要的属性
   * @returns 转换后的Message实例
   */
  public convert(): Message {
    const message: this = {
      ...this
    };
    delete message.at_all;
    delete message.at_hear;
    delete message.addition_original;
    return message;
  }
}

/**
 * 定义卡片模块的类型
 */
export declare type CardOriginalModuleType = 'header' | 'section' | 'images' | 'divider' | 'button-group' | 'countdown';

/**
 * 定义卡片模块的结构
 */
export declare type CardOriginalModule = {
  type: CardOriginalModuleType;
};

/**
 * 定义卡片文本内容的类型
 */
export declare type CardOriginalTextContentType = 'plain-text' | 'markdown';

/**
 * 定义卡片内容的类型
 */
export declare type CardOriginalContentType = CardOriginalTextContentType | 'button' | 'image';

/**
 * 定义卡片内容的结构
 */
export declare type CardOriginalContent = {
  type: CardOriginalContentType;
};

/**
 * 定义卡片文本内容的结构
 */
export declare type CardOriginalTextContent = CardOriginalContent & {
  type: CardOriginalTextContentType;
  text: string;
  width?: string;
};

/**
 * 定义卡片纯文本内容的结构
 */
export declare type CardOriginalPlainTextContent = CardOriginalTextContent & {
  type: 'plain-text';
};

/**
 * 定义卡片按钮内容事件的类型
 */
export declare type CardOriginalButtonContentEventType = 'server' | 'link-to' | 'internal' | 'exchange' | 'none';

/**
 * 定义卡片按钮内容主题的类型
 */
export declare type CardOriginalButtonContentTheme = 'primary' | 'default' | 'danger' | 'success';

/**
 * 定义卡片按钮配置的结构
 */
export declare type CardOriginalButtonConfig = {
  text: string;
  event?: CardOriginalButtonContentEventType;
  value?: string;
  theme?: CardOriginalButtonContentTheme;
};

/**
 * 定义卡片按钮内容的结构
 */
export declare type CardOriginalButtonContent = CardOriginalContent & {
  type: 'button';
  event: CardOriginalButtonContentEventType;
  value: string;
  text: string;
  theme: CardOriginalButtonContentTheme;
};

/**
 * 定义卡片图片内容的结构
 */
export declare type CardOriginalImageContent = CardOriginalContent & {
  type: 'image';
  url: string;
  size: CardOriginalSize;
};

/**
 * 定义卡片标题模块的结构
 */
export declare type CardOriginalHeaderModule = CardOriginalModule & {
  type: 'header';
  content: CardOriginalPlainTextContent;
};

/**
 * 定义卡片段落模块的结构
 */
export declare type CardOriginalSectionModule = CardOriginalModule & {
  type: 'section';
  paragraph: CardOriginalContent[];
};

/**
 * 定义卡片图片模块的结构
 */
export declare type CardOriginalImagesModule = CardOriginalModule & {
  type: 'image';
  urls: { url: string }[];
};

/**
 * 定义卡片分割线模块的结构
 */
export declare type CardOriginalDividerModule = CardOriginalModule & {
  type: 'divider';
  text?: string;
};

/**
 * 定义卡片按钮组模块的结构
 */
export declare type CardOriginalButtonGroupModule = CardOriginalModule & {
  type: 'button-group';
  btns: CardOriginalButtonContent[];
};

/**
 * 定义卡片倒计时模块模式的类型
 */
export declare type CardOriginalCountdownModuleMode = 'default' | 'calendar' | 'second';

/**
 * 定义卡片倒计时模块的结构
 */
export declare type CardOriginalCountdownModule = CardOriginalModule & {
  type: 'countdown';
  mode: CardOriginalCountdownModuleMode;
  end_time: number;
};

/**
 * 定义卡片尺寸的类型
 */
export declare type CardOriginalSize = 'small' | 'medium';

/**
 * 定义卡片数据的结构
 */
export declare type CardOriginalData = {
  type: 'card';
  border_color: string;
  size: CardOriginalSize;
  modules: CardOriginalModule[];
};

/**
 * 表示原始卡片信息
 * 此类用于存储原始卡片数据的集合和相关处理逻辑
 */
export class CardOriginal {
  // 存储卡片数据的数组
  public data: CardOriginalData[];

  // 当前操作的卡片索引
  public index: number = 0;

  /**
   * 构造函数，初始化卡片数据
   * @param borderColor 边框颜色，默认为空字符串
   * @param size 卡片大小，默认为'medium'
   */
  public constructor(borderColor: string = '', size: CardOriginalSize = 'medium') {
    this.data = [
      {
        type: 'card',
        border_color: borderColor,
        size: size,
        modules: []
      }
    ];
  }

  /**
   * 新增一个卡片
   * @param borderColor 边框颜色，默认为空字符串
   * @param size 卡片大小，默认为'medium'
   * @returns 返回当前实例
   */
  public newCard(borderColor: string = '', size: CardOriginalSize = 'medium'): this {
    this.data.push({
      type: 'card',
      border_color: borderColor,
      size: size,
      modules: []
    });
    this.index = this.data.length - 1;
    return this;
  }

  /**
   * 添加一个模块到当前卡片
   * @param module 要添加的模块
   * @returns 返回当前实例
   */
  public addModule(module: CardOriginalModule): this {
    this.data[this.index].modules.push(module);
    return this;
  }

  /**
   * 添加一个标题模块
   * @param text 标题文本
   * @returns 返回当前实例
   */
  public header(text: string): this {
    this.addModule({
      type: 'header',
      content: {
        type: 'plain-text',
        text: text
      }
    } as CardOriginalHeaderModule);
    return this;
  }

  /**
   * 添加一个段落模块
   * @param paragraph 段落内容
   * @returns 返回当前实例
   */
  public section(...paragraph: CardOriginalTextContent[]): this {
    if (paragraph.length > 5) {
      throw new Error('段落内容不能超过5列');
    }
    this.addModule({
      type: 'section',
      paragraph: paragraph
    } as CardOriginalSectionModule);
    return this;
  }

  /**
   * 添加一个带图片的文本模块
   * @param text 文本内容
   * @param image 图片路径
   * @param position 图片位置
   */
  public textWithImage(text: string, image: string, position: 'left' | 'right' = 'right') {
    const txt = {
      type: 'plain-text',
      text: text
    } as CardOriginalPlainTextContent;
    const img = {
      type: 'image',
      url: Request.uploadFileSync(image),
      size: 'medium'
    } as CardOriginalImagesModule;
    this.addModule({
      type: 'section',
      paragraph: position == 'right' ? [txt, img] : [img, txt]
    } as CardOriginalSectionModule);
  }

  /**
   * 添加一个带图片的Markdown模块
   * @param markdown Markdown内容
   * @param image 图片路径
   * @param position 图片位置
   */
  public markdownWithImage(markdown: string, image: string, position: 'left' | 'right' = 'right') {
    const md = {
      type: 'markdown',
      text: markdown
    } as CardOriginalTextContent;
    const img = {
      type: 'image',
      url: Request.uploadFileSync(image),
      size: 'medium'
    } as CardOriginalImagesModule;
    this.addModule({
      type: 'section',
      paragraph: position == 'right' ? [md, img] : [img, md]
    } as CardOriginalSectionModule);
  }

  /**
   * 添加一个带按钮的文本模块
   * @param text 文本内容
   * @param button 按钮配置
   * @returns 返回当前实例
   */
  public textWithButton(text: string, button: CardOriginalButtonConfig | CardOriginalButtonContent): this {
    (button as CardOriginalButtonContent).type = 'button';
    this.addModule({
      type: 'section',
      paragraph: [
        {
          type: 'plain-text',
          text: text
        } as CardOriginalPlainTextContent,
        {
          type: 'button',
          event: button.event || 'internal',
          value: button.value || button.text,
          text: button.text,
          theme: button.theme || 'primary'
        }
      ]
    } as CardOriginalSectionModule);
    return this;
  }

  /**
   * 添加一个带按钮的Markdown模块
   * @param markdown Markdown内容
   * @param button 按钮配置
   * @returns 返回当前实例
   */
  public markdownWithButton(markdown: string, button: CardOriginalButtonConfig | CardOriginalButtonContent): this {
    (button as CardOriginalButtonContent).type = 'button';
    this.addModule({
      type: 'section',
      paragraph: [
        {
          type: 'markdown',
          text: markdown
        } as CardOriginalTextContent,
        {
          type: 'button',
          event: button.event || 'internal',
          value: button.value || button.text,
          text: button.text,
          theme: button.theme || 'primary'
        }
      ]
    } as CardOriginalSectionModule);
    return this;
  }

  /**
   * 添加一个纯文本模块
   * @param text 文本内容
   * @returns 返回当前实例
   */
  public text(text: string) {
    this.addModule({
      type: 'section',
      paragraph: [
        {
          type: 'plain-text',
          text: text
        } as CardOriginalPlainTextContent
      ]
    } as CardOriginalSectionModule);
    return this;
  }

  /**
   * 添加一个Markdown模块
   * @param markdown Markdown内容
   * @returns 返回当前实例
   */
  public markdown(markdown: string) {
    this.addModule({
      type: 'section',
      paragraph: [
        {
          type: 'markdown',
          text: markdown
        } as CardOriginalTextContent
      ]
    } as CardOriginalSectionModule);
    return this;
  }

  /**
   * 添加一个图片模块
   * @param images 图片路径数组
   * @returns 返回当前实例
   */
  public images(...images: BufferSource[] | string[]): this {
    if (images.length > 9) {
      throw new Error('图片数量不能超过9张');
    }
    this.addModule({
      type: 'images',
      urls: images.map(image => ({ url: Request.uploadFileSync(image) }))
    } as CardOriginalImagesModule);
    return this;
  }

  /**
   * 添加一个按钮组模块
   * @param buttons 按钮配置数组
   * @returns 返回当前实例
   */
  public buttons(...buttons: CardOriginalButtonConfig[] | CardOriginalButtonContent[]): this {
    if (buttons.length > 3) {
      throw new Error('按钮数量不能超过3个');
    }
    this.addModule({
      type: 'button-group',
      btns: buttons.map(button => {
        return {
          type: 'button',
          event: button.event || 'internal',
          value: button.value || button.text,
          text: button.text,
          theme: button.theme || 'primary'
        };
      })
    } as CardOriginalButtonGroupModule);
    return this;
  }

  /**
   * 添加一个分割线模块
   * @param text 分割线文本，可选
   * @returns 返回当前实例
   */
  public divider(text: string | undefined = undefined): this {
    this.addModule({
      type: 'divider',
      text: text
    } as CardOriginalDividerModule);
    return this;
  }

  /**
   * 添加一个倒计时模块
   * @param time 倒计时时间戳
   * @param mode 倒计时模式
   * @returns 返回当前实例
   */
  public countdown(time: number, mode: CardOriginalCountdownModuleMode): this {
    this.addModule({
      type: 'countdown',
      mode: mode,
      end_time: time
    } as CardOriginalCountdownModule);
    return this;
  }

  /**
   * 将卡片数据转换为字符串
   * @returns 返回卡片数据的JSON字符串
   */
  public toString(): string {
    return JSON.stringify(this);
  }
}

/**
 * 实现卡片消息的类
 */
export class CardMessageImpl extends AbstractMessageImpl implements CardMessage {
  // 消息类型，固定为20
  public readonly msg_type: 20 = 20 as const;

  // 卡片原始对象
  public card_original?: CardOriginal = new CardOriginal();

  // 私有构造函数，防止外部直接实例化
  private constructor() {
    super(20);
  }

  /**
   * 创建卡片消息实例
   * @returns 返回卡片消息实例
   */
  public static create(): CardMessageImpl & Promise<CardMessageImpl> {
    const impl = new CardMessageImpl();
    return Object.assign(impl, Promise.resolve(impl));
  }

  /**
   * 添加一个标题模块
   * @param text 标题文本
   * @returns 返回当前实例
   */
  public header(text: string): this {
    this.card_original!.header(text);
    this.msg = this.card_original!.toString();
    return this;
  }

  /**
   * 添加一个段落模块
   * @param paragraph 段落内容
   * @returns 返回当前实例
   */
  public section(...paragraph: CardOriginalTextContent[]): this {
    this.card_original!.section(...paragraph);
    this.msg = this.card_original!.toString();
    return this;
  }

  /**
   * 添加一个带图片的文本模块
   * @param text 文本内容
   * @param image 图片路径
   * @param position 图片位置
   */
  public textWithImage(text: string, image: string, position: 'left' | 'right' = 'right') {
    this.card_original!.textWithImage(text, image, position);
    this.msg = this.card_original!.toString();
    return this;
  }

  /**
   * 添加一个带图片的Markdown模块
   * @param markdown Markdown内容
   * @param image 图片路径
   * @param position 图片位置
   */
  public markdownWithImage(markdown: string, image: string, position: 'left' | 'right' = 'right') {
    this.card_original!.markdownWithImage(markdown, image, position);
    this.msg = this.card_original!.toString();
    return this;
  }

  /**
   * 添加一个带按钮的文本模块
   * @param text 文本内容
   * @param button 按钮配置
   * @returns 返回当前实例
   */
  public textWithButton(text: string, button: CardOriginalButtonConfig | CardOriginalButtonContent): this {
    this.card_original!.textWithButton(text, button);
    this.msg = this.card_original!.toString();
    return this;
  }

  /**
   * 添加一个带按钮的Markdown模块
   * @param markdown Markdown内容
   * @param button 按钮配置
   * @returns 返回当前实例
   */
  public markdownWithButton(markdown: string, button: CardOriginalButtonConfig | CardOriginalButtonContent): this {
    this.card_original!.markdownWithButton(markdown, button);
    this.msg = this.card_original!.toString();
    return this;
  }

  /**
   * 添加一个纯文本模块
   * @param text 文本内容
   * @returns 返回当前实例
   */
  public text(text: string) {
    this.card_original!.text(text);
    this.msg = this.card_original!.toString();
    return this;
  }

  /**
   * 添加一个Markdown模块
   * @param markdown Markdown内容
   * @returns 返回当前实例
   */
  public markdown(markdown: string) {
    this.card_original!.markdown(markdown);
    this.msg = this.card_original!.toString();
    return this;
  }

  /**
   * 添加一个图片模块
   * @param images 图片路径数组
   * @returns 返回当前实例
   */
  public images(...images: BufferSource[] | string[]): this {
    this.card_original!.images(...images);
    this.msg = this.card_original!.toString();
    return this;
  }

  /**
   * 添加一个按钮组模块
   * @param buttons 按钮配置数组
   * @returns 返回当前实例
   */
  public buttons(...buttons: CardOriginalButtonConfig[] | CardOriginalButtonContent[]): this {
    this.card_original!.buttons(...buttons);
    this.msg = this.card_original!.toString();
    return this;
  }

  /**
   * 添加一个分割线模块
   * @param text 分割线文本，可选
   * @returns 返回当前实例
   */
  public divider(text: string | undefined = undefined): this {
    this.card_original!.divider(text);
    this.msg = this.card_original!.toString();
    return this;
  }

  /**
   * 添加一个倒计时模块
   * @param time 倒计时时间戳
   * @param mode 倒计时模式
   * @returns 返回当前实例
   */
  public countdown(time: number, mode: 'default' | 'calendar' | 'second'): this {
    dayjs.extend(utc);
    this.card_original!.countdown(dayjs().utc().local().add(time, 'seconds').unix(), mode);
    this.msg = this.card_original!.toString();
    return this;
  }

  /**
   * 将卡片消息转换为通用消息格式
   * @returns 返回转换后的消息对象
   */
  public convert(): Message {
    const message: this = {
      ...this
    };
    delete message.card_original;
    delete message.addition_original;
    return message;
  }
}

/**
 * MessageBuilder类用于构建各种类型的消息对象
 * 它提供了一系列方法来创建和定制消息，如文本、Markdown、卡片消息等
 */
export class MessageBuilder {
  // 初始化消息对象为一个空文本消息
  private message: AbstractMessageImpl = this.text('');

  /**
   * 将消息类型转换为Markdown格式
   * @returns {ExtendedMarkdownMessageImpl} 返回一个扩展的Markdown消息实现对象
   */
  public markdown(): ExtendedMarkdownMessageImpl {
    return (this.message = ExtendedMarkdownMessageImpl.create());
  }

  /**
   * 创建一个卡片消息对象
   * @returns {CardMessageImpl & Promise<CardMessageImpl>} 返回一个实现了卡片消息接口的对象
   */
  public card(): CardMessageImpl & Promise<CardMessageImpl> {
    return (this.message = CardMessageImpl.create());
  }

  /**
   * 在消息中添加一张图片
   * @param {string} url 图片的URL地址
   * @param {number} width 图片的宽度
   * @param {number} height 图片的高度
   * @returns {AbstractMessageImpl} 返回消息对象本身，以便进行链式调用
   */
  public image(url: string, width: number, height: number): AbstractMessageImpl {
    return (this.message = this.markdown().image(url, width, height));
  }

  /**
   * 在消息中添加一段文本
   * @param {string} text 要添加的文本内容
   * @param {boolean} bold 是否以粗体显示文本，默认为false
   * @param {boolean} italic 是否以斜体显示文本，默认为false
   * @returns {AbstractMessageImpl} 返回消息对象本身，以便进行链式调用
   */
  public text(text: string, bold: boolean = false, italic: boolean = false): AbstractMessageImpl {
    return (this.message = this.markdown().text(text, bold, italic));
  }

  /**
   * 构建最终的消息对象
   * @returns {Message} 返回构建完成的消息对象
   */
  public build(): Message {
    return this.message.convert();
  }
}

/**
 * 定义一个抽象的用户消息实现类，提供了消息的基本属性和方法
 * @implements {UserMessage}
 */
export abstract class AbstractUserMessageImpl implements UserMessage {
  /**
   * 消息类型，由具体实现类指定
   */
  public abstract msg_type: number;

  /**
   * Heychat确认ID，所有消息的确认ID都是唯一的
   */
  public readonly heychat_ack_id: string = `${Util.getAckId()}`;

  /**
   * 接收消息的用户ID，默认为0
   */
  public to_user_id: number = 0;

  /**
   * 设置消息的接收者ID
   * @param {number} userId - 接收消息的用户ID
   * @returns {this} 返回当前实例，支持链式调用
   */
  public to(userId: number): this {
    this.to_user_id = userId;
    return this;
  }

  /**
   * 将当前实例转换为UserMessage接口定义的消息格式
   * @returns {UserMessage} 转换后的消息对象
   */
  public abstract convert(): UserMessage;
}

/**
 * Markdown用户消息的具体实现类，用于创建和操作Markdown格式的消息
 * @implements {MarkdownUserMessage}
 * @extends {AbstractUserMessageImpl}
 */
export class MarkdownUserMessageImpl extends AbstractUserMessageImpl implements MarkdownUserMessage {
  /**
   * 消息类型常量，Markdown消息类型为4
   */
  public readonly msg_type: 4 = 4 as const;

  /**
   * Markdown消息内容
   */
  public msg: string = '';

  /**
   * 消息的附加信息，以字符串形式存储
   */
  public addition: string = '{}';

  /**
   * 消息的原始附加信息，包含图片文件信息
   */
  public addition_original?: AdditionOriginal = {
    img_files_info: []
  };

  /**
   * 构造函数，私有以防止外部直接实例化
   */
  private constructor() {
    super();
  }

  /**
   * 创建一个新的MarkdownUserMessageImpl实例
   * @returns {MarkdownUserMessageImpl} 新的实例对象
   */
  public static create(): MarkdownUserMessageImpl {
    return new MarkdownUserMessageImpl();
  }

  /**
   * 添加文本内容到消息中，支持Markdown格式
   * @param {string} text - 要添加的文本
   * @param {boolean} bold - 是否加粗文本，默认为false
   * @param {boolean} italic - 是否斜体文本，默认为false
   * @param {boolean} strikethrough - 是否删除线文本，默认为false
   * @returns {this} 返回当前实例，支持链式调用
   */
  public text(text: string, bold: boolean = false, italic: boolean = false, strikethrough: boolean = false): this {
    let msg = `${text}`;
    if (italic) msg = `*${msg}*`;
    if (bold) msg = `**${msg}**`;
    if (strikethrough) msg = `~~${msg}~~`;
    const flag = this.msg.endsWith('*') || this.msg.endsWith('~');
    if (this.msg[this.msg.length - 1] == msg[0] && flag) this.msg += ' ';
    this.msg += msg;
    return this;
  }

  /**
   * 添加超链接到消息中
   * @param {string} url - 链接地址
   * @param {string} text - 显示的链接文本，默认为链接地址
   * @param {boolean} bold - 是否加粗文本，默认为false
   * @param {boolean} italic - 是否斜体文本，默认为false
   * @param {boolean} strikethrough - 是否删除线文本，默认为false
   * @returns {this} 返回当前实例，支持链式调用
   */
  public link(
    url: string,
    text: string = url,
    bold: boolean = false,
    italic: boolean = false,
    strikethrough: boolean = false
  ): this {
    this.msg += `[`;
    this.text(text, bold, italic, strikethrough);
    this.msg += `](${url})`;
    return this;
  }

  /**
   * 添加图片到消息中，内部使用
   * @param {string} url - 图片链接地址
   * @param {number} width - 图片宽度
   * @param {number} height - 图片高度
   * @returns {this} 返回当前实例，支持链式调用
   */
  private addImage(url: string, width: number, height: number): this {
    this.addition_original?.img_files_info.push({
      url,
      width,
      height
    });
    this.msg += `![](${url})`;
    this.addition = JSON.stringify(this.addition_original);
    return this;
  }

  /**
   * 添加图片到消息中，支持不同来源的图片
   * @param {BufferSource | string} url - 图片链接地址或文件
   * @param {number} width - 图片宽度
   * @param {number} height - 图片高度
   * @returns {this} 返回当前实例，支持链式调用
   */
  public image(url: BufferSource | string, width: number, height: number): this {
    if (typeof url !== 'string' || !url.includes(Constants.CDN_URL)) {
      this.addImage(Request.uploadFileSync(url), width, height);
      return this;
    } else {
      this.addImage(url, width, height);
    }
    return this;
  }

  /**
   * 添加标题到消息中
   * @param {string} text - 标题文本
   * @param {1 | 2} level - 标题级别，默认为1
   * @returns {this} 返回当前实例，支持链式调用
   */
  public header(text: string, level: 1 | 2 = 1): this {
    if (!this.msg.endsWith('\n')) this.text('\n');
    this.text(`${'#'.repeat(level)} ${text}\n`);
    return this;
  }

  /**
   * 添加有序列表到消息中
   * @param {string} text - 有序列表文本
   * @returns {this} 返回当前实例，支持链式调用
   */
  public order(text: string): this {
    const lastLine = this.getLastLine();
    const lastLineNum = lastLine.split('.')[0];
    let num = 1;
    if (lastLineNum.match(/^\d+$/)) {
      num = parseInt(lastLineNum) + 1;
    }
    if (!this.msg.endsWith('\n')) this.text('\n');
    this.text(`${num}. ${text}\n`);
    return this;
  }

  /**
   * 添加列表项到消息中
   * @param {string} text - 列表项文本
   * @param {number} indent - 缩进级别，默认为1
   * @returns {this} 返回当前实例，支持链式调用
   */
  public list(text: string, indent: number = 1): this {
    if (!this.msg.endsWith('\n')) this.text('\n');
    for (let i = 1; i < indent; i++) {
      this.text('  ');
    }
    this.text(`* ${text}\n`);
    return this;
  }

  /**
   * 获取消息的最后一行文本
   * @returns {string} 最后一行文本，如果没有则返回空字符串
   */
  public getLastLine(): string {
    const line = this.msg.split('\n').pop();
    return line || '';
  }

  /**
   * 将当前实例转换为UserMessage接口定义的消息格式
   * @returns {UserMessage} 转换后的消息对象
   */
  public convert(): UserMessage {
    const message: this = {
      ...this
    };
    delete message.addition_original;
    return message;
  }
}

/**
 * 图片用户消息的具体实现类，用于创建和操作图片消息
 * @implements {ImageUserMessage}
 * @extends {AbstractUserMessageImpl}
 */
export class ImageUserMessageImpl extends AbstractUserMessageImpl implements ImageUserMessage {
  /**
   * 消息类型常量，图片消息类型为3
   */
  public readonly msg_type: 3 = 3 as const;

  /**
   * 图片消息内容，可以是图片链接地址或文件
   */
  public readonly img: string;

  /**
   * 构造函数，私有以防止外部直接实例化
   * @param {BufferSource | string} img - 图片链接地址或文件
   */
  private constructor(img: BufferSource | string) {
    super();
    this.img = Request.uploadFileSync(img);
  }

  /**
   * 创建一个新的ImageUserMessageImpl实例
   * @param {BufferSource | string} img - 图片链接地址或文件
   * @returns {ImageUserMessageImpl} 新的实例对象
   */
  public static create(img: BufferSource | string): ImageUserMessageImpl {
    return new ImageUserMessageImpl(img);
  }

  /**
   * 将当前实例转换为UserMessage接口定义的消息格式
   * @returns {UserMessage} 转换后的消息对象
   */
  public convert(): UserMessage {
    return this;
  }
}

/**
 * 用户消息构建器，用于创建和操作不同类型的消息
 */
export class UserMessageBuilder {
  /**
   * 当前构建的消息实例，默认为Markdown消息实例
   */
  private message: AbstractUserMessageImpl = MarkdownUserMessageImpl.create();

  /**
   * 创建一个新的Markdown消息实例
   * @returns {MarkdownUserMessageImpl} 新的Markdown消息实例
   */
  public markdown(): MarkdownUserMessageImpl {
    return (this.message = MarkdownUserMessageImpl.create());
  }

  /**
   * 创建一个新的图片消息实例
   * @param {BufferSource | string} image - 图片链接地址或文件
   * @returns {AbstractUserMessageImpl} 新的图片消息实例
   */
  public image(image: BufferSource | string): AbstractUserMessageImpl {
    return (this.message = ImageUserMessageImpl.create(image));
  }

  /**
   * 创建一个新的Markdown消息实例，并添加文本内容
   * @param {string} text - 要添加的文本
   * @returns {AbstractUserMessageImpl} 新的Markdown消息实例
   */
  public text(text: string): AbstractUserMessageImpl {
    return (this.message = MarkdownUserMessageImpl.create().text(text));
  }

  /**
   * 构建并返回当前消息实例
   * @returns {UserMessage} 构建后的消息对象
   */
  public build(): UserMessage {
    return this.message.convert();
  }
}
