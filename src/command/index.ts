import { CommandMessage, ILogger, TextMessage } from '../type/define';

export interface CommandSource {
  success: (msg: TextMessage | string) => void;
  fail: (msg: TextMessage | string) => void;
  getName: () => string;
  hasPermission: (permission: string) => boolean;
}

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

  public parse(value: string): T | undefined {
    return value as T;
  }

  public static parseArgument(argument: string): HeyBoxCommandArgument<any> {
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
        default: {
          if (type.includes('|')) {
            const options = nodes[1].split('|');
            return new HeyBoxCommandOptionArgument(name, name, required, options);
          }
        }
      }
    }
    throw new Error(`Not implemented, argument: ${argument}`);
  }
}

class HeyBoxCommandOptionArgument<T extends string> extends HeyBoxCommandArgument<T> {
  private readonly options: T[];

  public constructor(name: string, description: string, required: boolean, options: T[]) {
    super(name, 3, description, required);
    this.options = options;
  }

  public override parse(value: string): T | undefined {
    if (!this.options.includes(value as T)) return value as T;
    else return undefined;
  }
}

class HeyBoxCommandStingArgument extends HeyBoxCommandArgument<string> {
  public constructor(name: string, description: string, required: boolean) {
    super(name, 9, description, required);
  }

  public override parse(value: string): string | undefined {
    return value;
  }
}

class HeyBoxCommandNumberArgument extends HeyBoxCommandArgument<number> {
  public constructor(name: string, description: string, required: boolean) {
    super(name, 4, description, required);
  }

  public override parse(value: string): number | undefined {
    return Number.parseInt(value);
  }
}

class HeyBoxCommandBooleanArgument extends HeyBoxCommandArgument<boolean> {
  public constructor(name: string, description: string, required: boolean) {
    super(name, 5, description, required);
  }

  public override parse(value: string): boolean | undefined {
    if (value === 'True') {
      return true;
    } else if (value === 'False') {
      return false;
    }
    return undefined;
  }
}

class HeyBoxCommandUserArgument extends HeyBoxCommandArgument<null> {
  public constructor(name: string, description: string, required: boolean) {
    super(name, 6, description, required);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public override parse(_value: string): null | undefined {
    return undefined;
  }
}

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

export class HeyBoxCommandManager {
  public readonly commands: Map<string, HeyBoxCommand> = new Map<string, HeyBoxCommand>();
  public readonly logger: ILogger;

  public constructor(logger: ILogger) {
    this.logger = logger;
  }

  public register(command: HeyBoxCommand): void {
    if (this.commands.has(command.name)) {
      this.logger.error(`Command ${command.name} is already registered!`);
      return;
    }
    this.commands.set(command.name, command);
  }

  public execute(command: CommandMessage, ...prefixArgs: any): void {
    const commandName = command.command_info.name;
    if (this.commands.has(commandName)) {
      const commandInfo = this.commands.get(commandName)!;
      let argOptions = command.command_info.options;
      const args: any = [];
      for (const argument of commandInfo.arguments) {
        let arg: any = undefined;
        for (let i = 0; i < argOptions.length; i++) {
          const argOption = argOptions[i];
          if (argument.name === argOption.name) {
            argOptions = argOptions.filter(option => option.name !== argOption.name);
            arg = argument.parse(argOption.value);
            if (arg === undefined) {
              this.logger.error(`Argument ${argOption.name} is not valid in command ${commandName}`);
              return;
            }
            break;
          }
        }
        args.push(arg);
      }
      commandInfo.executor(...prefixArgs, ...args);
    }
  }

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
