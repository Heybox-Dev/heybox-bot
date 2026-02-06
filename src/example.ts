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
          .textWithImage(`${rp}`, wsMsgImpl.user_info.avatar, 'left')
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

  /**
   * 获取房间信息命令处理器
   *
   * 当用户发送 "/roominfo {房间ID}" 命令时，此方法会获取并显示房间的详细信息
   *
   * @param source 命令的来源，用于发送反馈信息
   * @param roomId 房间ID
   * @returns 总是返回true，表示命令处理成功
   */
  @bot.command('/roominfo {roomId: STRING}')
  public async getRoomInfo(source: CommandSource, roomId: string): Promise<boolean> {
    try {
      const response = await bot.getRoomInfo(roomId);
      if (response.data.status === 'ok') {
        const room = response.data.result.room;
        source.successBy(builder => {
          builder
            .card()
            .header('房间信息')
            .divider()
            .text(`房间名称: ${room.room_name}`)
            .text(`房间ID: ${room.room_id}`)
            .text(`成员数量: ${room.member_count}`)
            .text(`在线人数: ${room.online_count}`)
            .text(`简介: ${room.introduction || '无'}`);
        });
      } else {
        source.fail(`获取房间信息失败: ${response.data.msg}`);
      }
    } catch (error: any) {
      source.fail(`获取房间信息出错: ${error.message}`);
    }
    return true;
  }

  /**
   * 获取我的房间列表命令处理器
   *
   * 当用户发送 "/myrooms" 命令时，此方法会列出机器人加入的所有房间
   *
   * @param source 命令的来源，用于发送反馈信息
   * @returns 总是返回true，表示命令处理成功
   */
  @bot.command('/myrooms')
  public async getMyRooms(source: CommandSource): Promise<boolean> {
    try {
      const response = await bot.getJoinedRooms(0, 10);
      if (response.data.status === 'ok') {
        const rooms = response.data.result.rooms;
        if (rooms && rooms.length > 0) {
          source.successBy(builder => {
            builder.card().header('我的房间列表').divider();
            rooms.forEach((room: any, index: number) => {
              builder.text(`${index + 1}. ${room.room_name} (${room.room_id})`);
            });
          });
        } else {
          source.success('暂无加入的房间');
        }
      } else {
        source.fail(`获取房间列表失败: ${response.data.msg}`);
      }
    } catch (error: any) {
      source.fail(`获取房间列表出错: ${error.message}`);
    }
    return true;
  }

  /**
   * 获取房间用户列表命令处理器
   *
   * 当用户发送 "/roomusers {房间ID}" 命令时，此方法会显示房间内的用户列表
   *
   * @param source 命令的来源，用于发送反馈信息
   * @param roomId 房间ID
   * @returns 总是返回true，表示命令处理成功
   */
  @bot.command('/roomusers {roomId: STRING}')
  public async getRoomUsers(source: CommandSource, roomId: string): Promise<boolean> {
    try {
      // 这里需要获取机器人的用户ID，暂时使用示例ID
      const botUserId = '84005510'; // 实际使用时应该从机器人配置中获取
      const response = await bot.getRoomUsers(roomId, botUserId, 0, 20);
      if (response.data.status === 'ok') {
        const userInfo = response.data.result.room_info;
        source.successBy(builder => {
          builder
            .card()
            .header(`房间用户列表 (${userInfo.user_count}人)`)
            .divider();
          
          if (userInfo.user_info && userInfo.user_info.length > 0) {
            userInfo.user_info.slice(0, 10).forEach((user: any) => {
              builder.text(`• ${user.nickname} (${user.username})`);
            });
            if (userInfo.user_info.length > 10) {
              builder.text(`...还有${userInfo.user_info.length - 10}人`);
            }
          } else {
            builder.text('房间内暂无用户');
          }
        });
      } else {
        source.fail(`获取用户列表失败: ${response.data.msg}`);
      }
    } catch (error: any) {
      source.fail(`获取用户列表出错: ${error.message}`);
    }
    return true;
  }

  /**
   * 修改房间昵称命令处理器
   *
   * 当用户发送 "/setnick {房间ID} {昵称}" 命令时，此方法会修改机器人在该房间的昵称
   *
   * @param source 命令的来源，用于发送反馈信息
   * @param roomId 房间ID
   * @param nickname 新昵称
   * @returns 总是返回true，表示命令处理成功
   */
  @bot.command('/setnick {roomId: STRING} {nickname: STRING}')
  public async setRoomNickname(source: CommandSource, roomId: string, nickname: string): Promise<boolean> {
    try {
      const response = await bot.changeRoomNickname(roomId, nickname);
      if (response.data.status === 'ok') {
        source.success(`房间昵称已修改为: ${nickname}`);
      } else {
        source.fail(`修改昵称失败: ${response.data.msg}`);
      }
    } catch (error: any) {
      source.fail(`修改昵称出错: ${error.message}`);
    }
    return true;
  }

  /**
   * 更新最后一条消息命令处理器
   *
   * 当用户发送 "/updatemsg {新内容}" 命令时，此方法会更新机器人发送的最后一条消息
   * 注意：这需要先保存消息ID才能使用
   *
   * @param source 命令的来源，用于发送反馈信息
   * @param newContent 新的消息内容
   * @returns 总是返回true，表示命令处理成功
   */
  @bot.command('/updatemsg {newContent: STRING}')
  public async updateLastMessage(source: CommandSource, newContent: string): Promise<boolean> {
    // 这是一个示例，实际使用时需要保存消息ID
    // const lastMsgId = '1845715947309797376'; // 示例消息ID
    // const roomId = '3690041195409809408'; // 示例房间ID
    // const channelId = '3690041195638218754'; // 示例频道ID
    
    source.fail('此功能需要先保存消息ID才能使用，请参考文档实现');
    return true;
  }

  /**
   * 给消息添加表情回应命令处理器
   *
   * 当用户发送 "/emoji {消息ID} {表情符号}" 命令时，此方法会给指定消息添加表情
   *
   * @param source 命令的来源，用于发送反馈信息
   * @param msgId 消息ID
   * @param emoji 表情符号
   * @returns 总是返回true，表示命令处理成功
   */
  @bot.command('/emoji {msgId: STRING} {emoji: STRING}')
  public async addEmoji(source: CommandSource, msgId: string, emoji: string): Promise<boolean> {
    if (source instanceof WSMsgImpl) {
      const wsMsgImpl = source as WSMsgImpl;
      try {
        const response = await bot.emojiReply(
          msgId,
          wsMsgImpl.room_id,
          wsMsgImpl.channel_id,
          emoji,
          true
        );
        if (response.data.status === 'ok') {
          source.success(`已添加表情: ${emoji}`);
        } else {
          source.fail(`添加表情失败: ${response.data.msg}`);
        }
      } catch (error: any) {
        source.fail(`添加表情出错: ${error.message}`);
      }
    } else {
      source.fail('此命令只能在频道中使用');
    }
    return true;
  }
})();

// 启动Bot实例
bot.start().then();
