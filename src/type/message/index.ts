import Constants from '@/constants';
import { UserInfo } from '@/type/info';
import { Util } from '@/utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

export declare type ImgFilesInfo = {
  url: string;
  width: number;
  height: number;
};

export declare type AdditionOriginal = {
  img_files_info: ImgFilesInfo[];
};

export declare type Message = {
  heychat_ack_id: string;
  msg_type: number;
  msg: string;
  room_id: string;
  channel_id: string;
  reply_id: string;
  addition: string;
};

export declare type ExtendedMarkdownMessage = Message & {
  msg_type: 10;
  at_user_id: string;
  at_role_id: string;
  mention_channel_id: string;
  channel_type: number;
};

export declare type CardMessage = Message & {
  msg_type: 20;
};

export abstract class AbstractMessageImpl<T extends AbstractMessageImpl<T>> implements Message {
  public addition_original: AdditionOriginal = {
    img_files_info: []
  };
  public addition: string = '{"img_files_info":[]}';
  public channel_id: string = '';
  public readonly heychat_ack_id: string = `${Util.getAckId()}`;
  public msg: string = '';
  public readonly msg_type: number;
  public reply_id: string = '';
  public room_id: string = '';

  protected constructor(msgType: number) {
    this.msg_type = msgType;
  }

  public to(roomId: string, channelId: string): this {
    this.room_id = roomId;
    this.channel_id = channelId;
    return this;
  }

  public reply(msgId: string): this {
    this.reply_id = msgId;
    return this;
  }

  public abstract convert(): Message;
}

export class ExtendedMarkdownMessageImpl
  extends AbstractMessageImpl<ExtendedMarkdownMessageImpl>
  implements ExtendedMarkdownMessage
{
  public at_role_id: string = '';
  public at_user_id: string = '';
  public at_all? = false;
  public at_hear? = false;
  public channel_type: number = 1;
  public mention_channel_id: string = '';
  public readonly msg_type: 10 = 10 as const;

  private constructor() {
    super(10);
  }

  public static create(): ExtendedMarkdownMessageImpl {
    return new ExtendedMarkdownMessageImpl();
  }

  public text(text: string, bold: boolean = false, italic: boolean = false, strikethrough: boolean = false): this {
    let msg = `${text}`;
    if (italic) msg = `*${msg}*`;
    if (bold) msg = `**${msg}**`;
    if (strikethrough) msg = `~~${msg}~~`;
    const flag = this.msg.endsWith('*') || this.msg.endsWith('~');
    if (this.msg[this.msg.length - 1] == msg[0] && flag) this.msg += ' ';
    this.msg += msg;
    return Object.assign(this, Promise.resolve(this));
  }

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
    return Object.assign(this, Promise.resolve(this));
  }

  public sendImage(url: string, width: number, height: number): this {
    this.addition_original.img_files_info.push({
      url,
      width,
      height
    });
    this.msg += `![](${url})`;
    this.addition = JSON.stringify(this.addition_original);
    return Object.assign(this, Promise.resolve(this));
  }

  public image(url: BufferSource | string, width: number, height: number): this {
    if (typeof url !== 'string' || !url.includes(Constants.CDN_URL)) {
      this.sendImage(Util.uploadFileSync(url), width, height);
      return this;
    } else {
      this.sendImage(url, width, height);
    }
    return Object.assign(this, Promise.resolve(this));
  }

  public at(user: UserInfo): this {
    if (this.at_user_id != '') this.at_user_id += ',';
    const userId = user.user_base_info.user_id;
    this.at_user_id += `${userId}`;
    this.text(`@{id:${userId}} `);
    return Object.assign(this, Promise.resolve(this));
  }

  public atRole(roleId: string): this {
    if (this.at_role_id != '') this.at_role_id += ',';
    this.at_role_id += `${roleId}`;
    this.text(`@{id:${roleId}} `);
    return Object.assign(this, Promise.resolve(this));
  }

  public mentionChannel(mentionChannelId: string): this {
    if (this.mention_channel_id != '') this.mention_channel_id += ',';
    this.mention_channel_id += `${mentionChannelId}`;
    this.text(`#{id:${mentionChannelId}} `);
    return Object.assign(this, Promise.resolve(this));
  }

  public atAll(): this {
    this.at_all = true;
    this.text('@{all} ');
    return Object.assign(this, Promise.resolve(this));
  }

  public atHear(): this {
    this.at_hear = true;
    this.text('@{hear} ');
    return Object.assign(this, Promise.resolve(this));
  }

  public header(text: string, level: 1 | 2 = 1): this {
    if (!this.msg.endsWith('\n')) this.text('\n');
    this.text(`${'#'.repeat(level)} ${text}\n`);
    return Object.assign(this, Promise.resolve(this));
  }

  public order(text: string): this {
    const lastLine = this.getLastLine();
    const lastLineNum = lastLine.split('.')[0];
    let num = 1;
    if (lastLineNum.match(/^\d+$/)) {
      num = parseInt(lastLineNum) + 1;
    }
    if (!this.msg.endsWith('\n')) this.text('\n');
    this.text(`${num}. ${text}\n`);
    return Object.assign(this, Promise.resolve(this));
  }

  public list(text: string, indent: number = 1): this {
    if (!this.msg.endsWith('\n')) this.text('\n');
    for (let i = 1; i < indent; i++) {
      this.text('  ');
    }
    this.text(`* ${text}\n`);
    return Object.assign(this, Promise.resolve(this));
  }

  public getLastLine(): string {
    const line = this.msg.split('\n').pop();
    return line || '';
  }

  public convert(): Message {
    const message: this = {
      ...this
    };
    delete message.at_all;
    delete message.at_hear;
    return message;
  }
}

export declare type CardOriginalModuleType = 'header' | 'section' | 'images' | 'divider' | 'button-group' | 'countdown';

export declare type CardOriginalModule = {
  type: CardOriginalModuleType;
};

export declare type CardOriginalTextContentType = 'plain-text' | 'markdown';

export declare type CardOriginalContentType = CardOriginalTextContentType | 'button' | 'image';

export declare type CardOriginalContent = {
  type: CardOriginalContentType;
};

export declare type CardOriginalTextContent = CardOriginalContent & {
  type: CardOriginalTextContentType;
  text: string;
  width?: string;
};

export declare type CardOriginalPlainTextContent = CardOriginalTextContent & {
  type: 'plain-text';
};

export declare type CardOriginalButtonContentEventType = 'server' | 'link-to' | 'internal' | 'exchange' | 'none';

export declare type CardOriginalButtonContentTheme = 'primary' | 'default' | 'danger' | 'success';

export declare type CardOriginalButtonConfig = {
  event: CardOriginalButtonContentEventType;
  value: string;
  text: string;
  theme: CardOriginalButtonContentTheme;
};

export declare type CardOriginalButtonContent = CardOriginalContent &
  CardOriginalButtonConfig & {
    type: 'button';
  };

export declare type CardOriginalImageContent = CardOriginalContent & {
  type: 'image';
  url: string;
  size: CardOriginalSize;
};

export declare type CardOriginalHeaderModule = CardOriginalModule & {
  type: 'header';
  content: CardOriginalPlainTextContent;
};

export declare type CardOriginalSectionModule = CardOriginalModule & {
  type: 'section';
  paragraph: CardOriginalContent[];
};

export declare type CardOriginalImagesModule = CardOriginalModule & {
  type: 'image';
  urls: { url: string }[];
};

export declare type CardOriginalDividerModule = CardOriginalModule & {
  type: 'divider';
  text?: string;
};

export declare type CardOriginalButtonGroupModule = CardOriginalModule & {
  type: 'button-group';
  btns: CardOriginalButtonContent[];
};
export declare type CardOriginalCountdownModuleMode = 'default' | 'calendar' | 'second';

export declare type CardOriginalCountdownModule = CardOriginalModule & {
  type: 'countdown';
  mode: CardOriginalCountdownModuleMode;
  end_time: number;
};

export declare type CardOriginalSize = 'small' | 'medium';

export declare type CardOriginalData = {
  type: 'card';
  border_color: string;
  size: CardOriginalSize;
  modules: CardOriginalModule[];
};

export class CardOriginal {
  public data: CardOriginalData[];
  public index: number = 0;

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

  public addModule(module: CardOriginalModule): this {
    this.data[this.index].modules.push(module);
    return this;
  }

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

  public section(...paragraph: CardOriginalTextContent[]): this {
    this.addModule({
      type: 'section',
      paragraph: paragraph
    } as CardOriginalSectionModule);
    return this;
  }

  public textWithImage(text: string, image: string) {
    this.addModule({
      type: 'section',
      paragraph: [
        {
          type: 'plain-text',
          text: text
        } as CardOriginalPlainTextContent,
        {
          type: 'image',
          url: Util.uploadFileSync(image),
          size: 'medium'
        } as CardOriginalImagesModule
      ]
    } as CardOriginalSectionModule);
  }

  public markdownWithImage(markdown: string, image: string) {
    this.addModule({
      type: 'section',
      paragraph: [
        {
          type: 'markdown',
          text: markdown
        } as CardOriginalTextContent,
        {
          type: 'image',
          url: Util.uploadFileSync(image),
          size: 'medium'
        } as CardOriginalImagesModule
      ]
    } as CardOriginalSectionModule);
  }

  public textWithButton(text: string, button: CardOriginalButtonConfig | CardOriginalButtonContent): this {
    (button as CardOriginalButtonContent).type = 'button';
    this.addModule({
      type: 'section',
      paragraph: [
        {
          type: 'plain-text',
          text: text
        } as CardOriginalPlainTextContent,
        button
      ]
    } as CardOriginalSectionModule);
    return this;
  }

  public markdownWithButton(markdown: string, button: CardOriginalButtonConfig | CardOriginalButtonContent): this {
    (button as CardOriginalButtonContent).type = 'button';
    this.addModule({
      type: 'section',
      paragraph: [
        {
          type: 'markdown',
          text: markdown
        } as CardOriginalTextContent,
        button
      ]
    } as CardOriginalSectionModule);
    return this;
  }

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

  public images(...images: BufferSource[] | string[]): this {
    if (images.length > 9) {
      throw new Error('图片数量不能超过9张');
    }
    this.addModule({
      type: 'images',
      urls: images.map(image => ({ url: Util.uploadFileSync(image) }))
    } as CardOriginalImagesModule);
    return this;
  }

  public buttons(...buttons: CardOriginalButtonConfig[] | CardOriginalButtonContent[]): this {
    if (buttons.length > 3) {
      throw new Error('按钮数量不能超过3个');
    }
    this.addModule({
      type: 'button-group',
      btns: buttons.map(button => {
        (button as CardOriginalButtonContent).type = 'button';
        return button;
      })
    } as CardOriginalButtonGroupModule);
    return this;
  }

  public divider(text: string | undefined = undefined): this {
    this.addModule({
      type: 'divider',
      text: text
    } as CardOriginalDividerModule);
    return this;
  }

  public countdown(time: number, mode: CardOriginalCountdownModuleMode): this {
    this.addModule({
      type: 'countdown',
      mode: mode,
      end_time: time
    } as CardOriginalCountdownModule);
    return this;
  }

  public toString(): string {
    return JSON.stringify(this);
  }
}

export class CardMessageImpl extends AbstractMessageImpl<CardMessageImpl> implements CardMessage {
  public readonly msg_type: 20 = 20 as const;
  public card_original?: CardOriginal = new CardOriginal();

  private constructor() {
    super(20);
  }

  public static create(): CardMessageImpl & Promise<CardMessageImpl> {
    const impl = new CardMessageImpl();
    return Object.assign(impl, Promise.resolve(impl));
  }

  public header(text: string): this {
    this.card_original!.header(text);
    this.msg = this.card_original!.toString();
    return this;
  }

  public section(...paragraph: CardOriginalTextContent[]): this {
    this.card_original!.section(...paragraph);
    this.msg = this.card_original!.toString();
    return this;
  }

  public textWithImage(text: string, image: string) {
    this.card_original!.textWithImage(text, image);
    this.msg = this.card_original!.toString();
    return this;
  }

  public markdownWithImage(markdown: string, image: string) {
    this.card_original!.markdownWithImage(markdown, image);
    this.msg = this.card_original!.toString();
    return this;
  }

  public textWithButton(text: string, button: CardOriginalButtonConfig | CardOriginalButtonContent): this {
    this.card_original!.textWithButton(text, button);
    this.msg = this.card_original!.toString();
    return this;
  }

  public markdownWithButton(markdown: string, button: CardOriginalButtonConfig | CardOriginalButtonContent): this {
    this.card_original!.markdownWithButton(markdown, button);
    this.msg = this.card_original!.toString();
    return this;
  }

  public text(text: string) {
    this.card_original!.text(text);
    this.msg = this.card_original!.toString();
    return this;
  }

  public markdown(markdown: string) {
    this.card_original!.markdown(markdown);
    this.msg = this.card_original!.toString();
    return this;
  }

  public images(...images: BufferSource[] | string[]): this {
    this.card_original!.images(...images);
    this.msg = this.card_original!.toString();
    return this;
  }

  public buttons(...buttons: CardOriginalButtonConfig[] | CardOriginalButtonContent[]): this {
    this.card_original!.buttons(...buttons);
    this.msg = this.card_original!.toString();
    return this;
  }

  public divider(text: string | undefined = undefined): this {
    this.card_original!.divider(text);
    this.msg = this.card_original!.toString();
    return this;
  }

  public countdown(time: number, mode: 'default' | 'calendar' | 'second'): this {
    dayjs.extend(utc);
    this.card_original!.countdown(dayjs().utc().local().add(time, 'seconds').unix(), mode);
    this.msg = this.card_original!.toString();
    return this;
  }

  public convert(): Message {
    const message: this = {
      ...this
    };
    delete message.card_original;
    return message;
  }
}

export class MessageBuilder {
  private message: AbstractMessageImpl<any> = this.text('');

  public markdown(): ExtendedMarkdownMessageImpl {
    return (this.message = ExtendedMarkdownMessageImpl.create());
  }

  public card(): CardMessageImpl & Promise<CardMessageImpl> {
    return (this.message = CardMessageImpl.create());
  }

  public image(url: string, width: number, height: number): AbstractMessageImpl<any> {
    return (this.message = this.markdown().image(url, width, height));
  }

  public text(text: string, bold: boolean = false, italic: boolean = false): AbstractMessageImpl<any> {
    return (this.message = this.markdown().text(text, bold, italic));
  }

  public build(): Message {
    return this.message;
    //return this.message.convert();
  }
}
