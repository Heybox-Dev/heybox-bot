// 导入所需的工具类和模块
import { WSMsgImpl } from '@/type';
import { CommandFile, CommandImage, CommandUser } from '@/type/info';
import { Util, SeededRandom } from '@/utils';
import { CommandSource } from '@/command';
import { HeyBoxBot } from '@/index';
import dayjs from 'dayjs';

// 初始化HeyBoxBot实例
const bot: HeyBoxBot = new HeyBoxBot({
  token: 'your token',
  logLevel: 'info'
});

// 定义一个新类MyBot，用于处理各种命令
new (class MyBot {
  /**
   * 处理/calc命令，执行简单的数学计算
   * @param source 命令源
   * @param arg0 第一个操作数
   * @param arg1 运算符，支持+、-、*、/、^
   * @param arg2 可选的第二个操作数，默认为arg0
   * @returns 总是返回true，表示命令处理成功
   */
  @bot.command('/calc {arg0: NUMBER} {arg1: +|-|*|/|^} {arg2?: NUMBER}')
  public calc(source: CommandSource, arg0: number, arg1: '+' | '-' | '*' | '/' | '^', arg2?: number): boolean {
    // 根据运算符选择对应的计算函数
    let calc: (a: number, b: number) => number;
    switch (arg1) {
      case '-':
        calc = (a, b) => a - b;
        break;
      case '*':
        calc = (a, b) => a * b;
        break;
      case '/':
        calc = (a, b) => {
          if (b === 0) {
            throw new Error('除数不能为零');
          }
          return a / b;
        };
        break;
      case '^':
        calc = (a, b) => Math.pow(a, b);
        break;
      default:
        calc = (a, b) => a + b;
        break;
    }
    // 执行计算并返回结果
    try {
      source.success(`${arg0} ${arg1} ${arg2 || arg0} = ${calc(arg0, arg2 === undefined ? arg0 : arg2)}`);
    } catch (e: any) {
      source.fail(`计算出错，${e?.message || '未知错误'}`);
    }
    return true;
  }

  /**
   * 处理/roll命令，模拟掷骰子
   * @param source 命令源
   * @param arg0 骰子的最大点数
   * @returns 总是返回true，表示命令处理成功
   */
  @bot.command('/roll {arg0: NUMBER}')
  public roll(source: CommandSource, arg0: number): boolean {
    // 生成随机骰子点数并返回
    source.success(`${arg0}点骰子: ${Math.floor(Math.random() * arg0) + 1}`);
    return true;
  }

  /**
   * 处理/jrrp命令，返回用户今天的“人品值”
   * @param source 命令源
   * @returns 总是返回true，表示命令处理成功
   */
  @bot.command('/jrrp')
  public jrrp(source: CommandSource): boolean {
    // 根据当前日期和用户名称生成种子，以确保每天每个用户的“人品值”是固定的
    const rp = new SeededRandom(Util.hashDJB2(dayjs().format('YYYY-MM-DD') + source.getName())).nextInt(0, 100);
    if (source instanceof WSMsgImpl) {
      const wsMsgImpl = source as WSMsgImpl;
      source.successBy(builder => {
        builder
          .card()
          .header('今日人品值')
          .divider()
          .textWithImage(`${rp}`, wsMsgImpl.user_info.user_base_info.avatar, 'left')
          .buttons({ text: `${rp > 70 ? '好耶！' : rp > 40 ? '一般' : '6'}` });
      });
    } else {
      source.success(`您今日的人品值为：${rp}`);
    }
    return true;
  }

  /**
   * 测试用户命令处理器
   *
   * 当用户发送 "/testuser {用户}" 命令时，此方法会被调用它将用户信息以JSON格式返回给命令发送者
   * 主要用于演示如何处理和响应包含用户的命令
   *
   * @param source 命令的来源，用于发送反馈信息
   * @param user 命令中指定的用户对象，包含用户的相关信息
   * @returns 总是返回true，表示命令处理成功
   */
  @bot.command('/testuser {user: USER}')
  public testUser(source: CommandSource, user: CommandUser): boolean {
    source.success(JSON.stringify(user));
    return true;
  }

  /**
   * 测试图片命令处理器
   *
   * 当用户发送 "/testimg {图片}" 命令时，此方法会被调用它将图片信息以JSON格式返回给命令发送者
   * 主要用于演示如何处理和响应包含图片的命令
   *
   * @param source 命令的来源，用于发送反馈信息
   * @param img 命令中指定的图片对象，包含图片的相关信息
   * @returns 总是返回true，表示命令处理成功
   */
  @bot.command('/testimg {img: IMAGE}')
  public testImage(source: CommandSource, img: CommandImage): boolean {
    source.success(JSON.stringify(img));
    return true;
  }

  /**
   * 测试文件命令处理器
   *
   * 当用户发送 "/testfile {文件}" 命令时，此方法会被调用它将文件信息以JSON格式返回给命令发送者
   * 主要用于演示如何处理和响应包含文件的命令
   *
   * @param source 命令的来源，用于发送反馈信息
   * @param file 命令中指定的文件对象，包含文件的相关信息
   * @returns 总是返回true，表示命令处理成功
   */
  @bot.command('/testfile {file: FILE}')
  public testFile(source: CommandSource, file: CommandFile): boolean {
    source.success(JSON.stringify(file));
    return true;
  }
})();

// 启动Bot实例
bot.start().then();
