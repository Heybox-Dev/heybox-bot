import { CommandOption, CommandWSMsgData, ILogger, Message } from '@/type';
import { CommandFile, CommandImage, CommandOptionFile, CommandOptionImage, CommandUser } from '@/type/info';
import { MessageBuilder } from '@/type/message';

/**
 * 定义命令源接口，用于执行命令后的反馈
 */
export interface CommandSource {
  getName: () => string;
  hasPermission: (permission: string) => boolean;
  success: (msg: Message | string) => void;
  fail: (msg: Message | string) => void;
  successBy: (callback: (builder: MessageBuilder) => void) => void;
  failBy: (callback: (builder: MessageBuilder) => void) => void;
}

/**
 * 定义一个命令参数的类，用于解析和处理命令中的参数
 */
class HeyBoxCommandArgument<T> {
  public readonly name: string;
  public readonly type: number;
  public readonly description: string;
  public readonly required: boolean;

  public constructor(name: string, type: number, description: string, required: boolean) {
    this.name = name;
    this.type = type;
    this.description = description;
    this.required = required;
  }

  /**
   * 将给定的字符串值解析为指定类型T
   * 此函数主要用于类型转换，它假设传入的字符串可以安全地被视为类型T
   * 如果类型转换失败，函数将返回undefined
   *
   * @param _value 待解析的字符串值
   * @param _file 可选的File对象，用于提供额外的信息或上下文
   * @param _image 可选的Image对象，用于提供额外的信息或上下文
   * @template T 表示要解析为的类型
   * @returns 返回解析后的值，如果解析失败则返回undefined
   */
  public parse(_value: string, _file?: CommandOptionFile, _image?: CommandOptionImage): T | undefined {
    return _value as T;
  }

  /**
   * 解析命令参数的逻辑，根据参数类型创建不同的参数对象
   * 此函数处理特定格式的字符串参数，将其转换为相应的命令参数对象
   * 支持解析STRING、NUMBER、BOOLEAN和USER类型的参数，以及自定义选项参数
   *
   * @param argument 命令参数字符串，格式如"{name:TYPE}"
   * @returns 返回解析后的HeyBoxCommandArgument对象
   * @throws 如果参数格式不支持，抛出错误
   */
  public static parseArgument(argument: string): HeyBoxCommandArgument<any> {
    // 解析命令参数的逻辑，根据参数类型创建不同的参数对象
    if (argument.startsWith('{') && argument.endsWith('}')) {
      const nodes: string[] = argument.substring(1, argument.length - 1).split(':');
      let name = nodes[0].trim();
      const type = nodes[1].trim();
      let required = false;
      if (name.endsWith('?')) {
        name = name.slice(0, -1);
        required = true;
      }
      switch (type) {
        case 'STRING':
          return new HeyBoxCommandStingArgument(name, name, required);
        case 'NUMBER':
          return new HeyBoxCommandNumberArgument(name, name, required);
        case 'BOOLEAN':
          return new HeyBoxCommandBooleanArgument(name, name, required);
        case 'USER':
          return new HeyBoxCommandUserArgument(name, name, required);
        case 'IMAGE':
          return new HeyBoxCommandImageArgument(name, name, required);
        case 'FILE':
          return new HeyBoxCommandFileArgument(name, name, required);
        default: {
          if (type.includes('|')) {
            const options = nodes[1].split('|');
            return new HeyBoxCommandOptionArgument(name, name, required, options);
          }
        }
      }
    }
    // 如果参数格式不支持，抛出错误
    throw new Error(
      `Not implemented, argument: ${argument}, can only be STRING | NUMBER | BOOLEAN | USER | IMAGE | FILE and options`
    );
  }
}

/**
 * 定义一个带有选项的命令参数类，继承自HeyBoxCommandArgument
 */
class HeyBoxCommandOptionArgument<T extends string> extends HeyBoxCommandArgument<T> {
  private readonly options: T[];

  public constructor(name: string, description: string, required: boolean, options: T[]) {
    super(name, 3, description, required);
    this.options = options;
  }

  public override parse(value: string): T | undefined {
    // 重写解析方法，如果值不在选项中则返回undefined
    if (!this.options.includes(value as T)) return value as T;
    else return undefined;
  }
}

/**
 * 定义一个字符串类型的命令参数类，继承自HeyBoxCommandArgument
 */
class HeyBoxCommandStingArgument extends HeyBoxCommandArgument<string> {
  public constructor(name: string, description: string, required: boolean) {
    super(name, 9, description, required);
  }

  public override parse(value: string): string | undefined {
    // 重写解析方法，直接返回字符串值
    return value;
  }
}

/**
 * 定义一个数字类型的命令参数类，继承自HeyBoxCommandArgument
 */
class HeyBoxCommandNumberArgument extends HeyBoxCommandArgument<number> {
  public constructor(name: string, description: string, required: boolean) {
    super(name, 4, description, required);
  }

  public override parse(value: string): number | undefined {
    // 重写解析方法，将字符串值解析为数字
    return Number.parseInt(value);
  }
}

/**
 * 定义一个布尔类型的命令参数类，继承自HeyBoxCommandArgument
 */
class HeyBoxCommandBooleanArgument extends HeyBoxCommandArgument<boolean> {
  public constructor(name: string, description: string, required: boolean) {
    super(name, 5, description, required);
  }

  public override parse(value: string): boolean | undefined {
    // 重写解析方法，将字符串值解析为布尔值
    if (value === 'True') {
      return true;
    } else if (value === 'False') {
      return false;
    }
    return undefined;
  }
}

/**
 * 定义一个用户类型的命令参数类，继承自HeyBoxCommandArgument
 */
class HeyBoxCommandUserArgument extends HeyBoxCommandArgument<CommandUser> {
  public constructor(name: string, description: string, required: boolean) {
    super(name, 6, description, required);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public override parse(_value: string): CommandUser | undefined {
    // 重写解析方法
    return {
      id: Number.parseInt(_value)
    };
  }
}

/**
 * 图像参数类，用于处理命令中的图像类型参数
 */
class HeyBoxCommandImageArgument extends HeyBoxCommandArgument<CommandImage> {
  /**
   * 构造函数
   * @param name 参数名称
   * @param description 参数描述
   * @param required 参数是否必选
   */
  public constructor(name: string, description: string, required: boolean) {
    super(name, 11, description, required);
  }

  /**
   * 解析图像参数
   * @param _value 输入值
   * @param _file 文件对象（未使用）
   * @param _image 图像对象
   * @returns 返回解析后的图像对象，如果图像对象不存在则返回undefined
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public override parse(
    _value: string,
    _file?: CommandOptionFile,
    _image?: CommandOptionImage
  ): CommandImage | undefined {
    return _image
      ? {
          name: _image.name,
          size: _image.size,
          type: _image.type,
          url: _image.url,
          width: _image.width,
          height: _image.height
        }
      : undefined;
  }
}

/**
 * 文件参数类，用于处理命令中的文件类型参数
 */
class HeyBoxCommandFileArgument extends HeyBoxCommandArgument<CommandFile> {
  /**
   * 构造函数
   * @param name 参数名称
   * @param description 参数描述
   * @param required 参数是否必选
   */
  public constructor(name: string, description: string, required: boolean) {
    super(name, 12, description, required);
  }

  /**
   * 解析文件参数
   * @param _value 输入值
   * @param _file 文件对象
   * @returns 返回解析后的文件对象，如果文件对象不存在则返回undefined
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public override parse(_value: string, _file?: CommandOptionFile): CommandFile | undefined {
    return _file
      ? {
          name: _file.name,
          size: _file.size,
          type: _file.type,
          url: _file.url
        }
      : undefined;
  }
}

/**
 * 定义一个命令类，用于管理命令的执行和相关信息
 */
class HeyBoxCommand {
  public readonly name;
  public readonly description: string;
  public readonly permission?: string;
  public readonly arguments: HeyBoxCommandArgument<any>[] = [];
  public readonly executor: (...args: any) => boolean;

  public constructor(name: string, description: string, executor: (...args: any) => boolean, permission?: string) {
    this.name = name;
    this.description = description;
    this.permission = permission;
    this.executor = executor;
  }
}

/**
 * 定义一个命令管理器类，用于注册和执行命令
 */
/**
 * HeyBoxCommandManager 类负责管理命令的注册和执行
 */
export class HeyBoxCommandManager {
  // 存储已注册的命令，使用 Map 数据结构以便快速查找
  public readonly commands: Map<string, HeyBoxCommand> = new Map<string, HeyBoxCommand>();
  // 日志记录器，用于记录错误信息
  public readonly logger: ILogger;

  /**
   * 构造函数
   * @param logger 日志记录器，用于记录错误信息
   */
  public constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * 注册命令的方法，如果命令已存在则记录错误
   * @param command 要注册的命令对象
   */
  public register(command: HeyBoxCommand): void {
    if (this.commands.has(command.name)) {
      this.logger.error(`Command ${command.name} is already registered!`);
      return;
    }
    this.commands.set(command.name, command);
  }

  /**
   * 执行命令的方法，根据命令名称和参数执行相应的逻辑
   * @param command 命令消息数据，包含命令信息和参数
   * @param prefixArgs 额外的参数，传递给命令的执行器
   */
  public execute(command: CommandWSMsgData, ...prefixArgs: any): void {
    const commandName: string = command.command_info.name;
    if (this.commands.has(commandName)) {
      const commandInfo: HeyBoxCommand = this.commands.get(commandName)!;
      let argOptions: CommandOption[] | undefined = command.command_info.options;
      let optionFiles: CommandOptionFile[] = command.command_info.files;
      let optionImages: CommandOptionImage[] = command.command_info.images;
      // 将文件和图片信息关联到对应的参数上
      if (!argOptions) {
        commandInfo.executor(...prefixArgs);
        return;
      }
      for (let i: number = argOptions.length - 1; i >= 0; i--) {
        const files: CommandOptionFile | undefined = optionFiles?.filter(file => file.option_index === i)[0];
        const images: CommandOptionImage | undefined = optionImages?.filter(image => image.option_index === i)[0];
        argOptions[i].file = files;
        argOptions[i].image = images;
      }
      const args: any = [];
      // 解析并验证命令参数，如果参数无效则记录错误
      for (const argument of commandInfo.arguments) {
        let arg: any = undefined;
        for (let i = 0; i < argOptions.length; i++) {
          const argOption: CommandOption = argOptions[i];
          if (argument.name === argOption.name) {
            argOptions = argOptions.filter(option => option.name !== argOption.name);
            arg = argument.parse(argOption.value, argOption.file, argOption.image);
            if (arg === undefined) {
              this.logger.error(`Argument ${argOption.name} is not valid in command ${commandName}`);
              return;
            }
            break;
          }
        }
        args.push(arg);
      }
      // 调用命令的执行器函数，并传入相应的参数
      commandInfo.executor(...prefixArgs, ...args);
    }
  }

  /**
   * 解析命令字符串的方法，用于将命令字符串转换为命令对象并注册
   * @param command 命令字符串
   * @param permission 命令的权限级别，可选参数
   * @returns 返回一个函数，该函数接受命令的执行器作为参数
   */
  public parse(
    command: string,
    permission: string | undefined = undefined
  ): (executor: (...args: any) => boolean) => void {
    if (!command.startsWith('/')) throw new Error('Invalid command');
    const register = (command: HeyBoxCommand) => this.register(command);
    return function (executor: (...args: any) => boolean) {
      const commands = command.split(/(?<!:)\s/);
      const heyBoxCommand = new HeyBoxCommand(commands[0], commands[0], executor, permission);
      for (let i = 1; i < commands.length; i++) {
        heyBoxCommand.arguments.push(HeyBoxCommandArgument.parseArgument(commands[i]));
      }
      register(heyBoxCommand);
    };
  }
}
