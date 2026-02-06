// 高级功能示例文件
// 展示如何使用新增的API功能

import { HeyBoxBot } from '@/index';
import { CommandSource } from '@/command';
import { Util } from '@/utils';
import { WSMsgImpl } from '@/type';

// 初始化机器人实例
const bot: HeyBoxBot = new HeyBoxBot({
  token: 'your token',
  logLevel: 'info'
});

// 高级功能示例类
new (class AdvancedBot {
  // 存储最近发送的消息ID，用于更新功能
  private lastMessageIds: Map<string, string> = new Map();

  /**
   * 发送可更新的消息
   * @param source 命令源
   * @param content 消息内容
   */
  @bot.command('/sendupdatable {content: STRING}')
  public async sendUpdatableMessage(source: CommandSource, content: string): Promise<boolean> {
    try {
      // 构建消息
      // let messageId = '';

      if (source instanceof WSMsgImpl) {
        // const wsMsgImpl = source as WSMsgImpl;

        // 发送消息
        bot.sendMsgBy(builder => {
          builder.markdown().text(content);
        });

        // 注意：这里需要从实际的API响应中获取messageId
        // 在实际应用中，你可能需要修改sendMessage方法来返回消息ID

        source.success('消息已发送，可以使用 /updatelast {新内容} 来更新');
      } else {
        source.fail('此命令只能在频道中使用');
      }
    } catch (error: any) {
      source.fail(`发送消息出错: ${error.message}`);
    }
    return true;
  }

  /**
   * 更新最后发送的消息
   * @param source 命令源
   * @param newContent 新内容
   */
  @bot.command('/updatelast {newContent: STRING}')
  public async updateLastMessage(source: CommandSource, newContent: string): Promise<boolean> {
    if (source instanceof WSMsgImpl) {
      const wsMsgImpl = source as WSMsgImpl;
      const key = `${wsMsgImpl.room_id}_${wsMsgImpl.channel_id}`;
      const messageId = this.lastMessageIds.get(key);

      if (messageId) {
        try {
          await bot.updateMessage(messageId, newContent, wsMsgImpl.room_id, wsMsgImpl.channel_id);
          source.success('消息已更新');
        } catch (error: any) {
          source.fail(`更新消息失败: ${error.message}`);
        }
      } else {
        source.fail('没有找到可更新的消息，请先发送消息');
      }
    } else {
      source.fail('此命令只能在频道中使用');
    }
    return true;
  }

  /**
   * 房间统计信息
   * @param source 命令源
   */
  @bot.command('/roomstats')
  public async getRoomStats(source: CommandSource): Promise<boolean> {
    try {
      // 获取房间信息
      if (source instanceof WSMsgImpl) {
        const wsMsgImpl = source as WSMsgImpl;
        const roomResponse = await bot.getRoomInfo(wsMsgImpl.room_id);

        if (roomResponse.data.status === 'ok') {
          const room = roomResponse.data.result.room;

          // 获取用户列表
          const botUserId = '84005510'; // 实际使用时应该从配置获取
          const usersResponse = await bot.getRoomUsers(wsMsgImpl.room_id, botUserId, 0, 100);

          let onlineCount = 0;
          let totalCount = 0;

          if (usersResponse.data.status === 'ok') {
            const userInfo = usersResponse.data.result.room_info;
            totalCount = userInfo.user_count;
            onlineCount = userInfo.online_count;
          }

          source.successBy(builder => {
            builder
              .card()
              .header('房间统计信息')
              .divider()
              .text(`房间名称: ${room.room_name}`)
              .text(`成员总数: ${totalCount}`)
              .text(`在线人数: ${onlineCount}`)
              .text(`创建者ID: ${room.create_by}`)
              .text(`房间类型: ${room.is_public ? '公开' : '私有'}`)
              .text(`房间ID: ${room.room_id}`);
          });
        } else {
          source.fail(`获取房间信息失败: ${roomResponse.data.msg}`);
        }
      }
    } catch (error: any) {
      source.fail(`获取统计信息出错: ${error.message}`);
    }
    return true;
  }

  /**
   * 批量清理消息（管理员功能）
   * @param source 命令源
   * @param count 清理消息数量
   */
  @bot.command('/cleanup {count: NUMBER}')
  public async cleanupMessages(source: CommandSource, count: number): Promise<boolean> {
    // 这里只是一个示例，实际实现需要存储消息历史
    source.success(`计划清理最近的 ${count} 条消息`);
    return true;
  }

  /**
   * 定时发送房间日报
   */
  @bot.cron('0 9 * * *') // 每天上午9点执行
  public async dailyReport(bot: HeyBoxBot): Promise<void> {
    try {
      // 获取加入的房间列表
      const roomsResponse = await bot.getJoinedRooms(0, 100);

      if (roomsResponse.data.status === 'ok') {
        const rooms = roomsResponse.data.result.rooms;

        // 为每个房间发送日报
        for (const room of rooms) {
          try {
            // 获取房间详细信息
            const roomInfoResponse = await bot.getRoomInfo(room.room_id);
            if (roomInfoResponse.data.status === 'ok') {
              const roomDetail = roomInfoResponse.data.result.room;

              // 发送日报消息
              bot.sendMsgBy(builder => {
                builder
                  .markdown()
                  .text(`## 📊 房间日报 - ${roomDetail.room_name}\n\n`)
                  .text(`- 成员数量: ${roomDetail.member_count}\n`)
                  .text(`- 在线人数: ${roomDetail.online_count}\n`)
                  .text(`- 生成时间: ${new Date().toLocaleString('zh-CN')}`);
              });
            }
          } catch (error) {
            Util.log.error(`发送房间 ${room.room_name} 日报失败: ${error}`);
          }
        }
      }
    } catch (error) {
      Util.log.error(`生成日报失败: ${error}`);
    }
  }

  /**
   * 用户欢迎消息
   */
  @bot.subscribe('user-join-or-leave-room')
  public async welcomeUser(bot: HeyBoxBot, user: any, eventData: any): Promise<void> {
    // 当有用户加入房间时发送欢迎消息
    if (eventData.state) {
      // state为true表示用户加入
      try {
        // 发送欢迎消息到房间
        bot.sendMsgBy(builder => {
          builder.markdown().text(`🎉 欢迎 ${user.nickname} 加入房间！`);
        });
      } catch (error) {
        Util.log.error(`发送欢迎消息失败: ${error}`);
      }
    }
  }

  /**
   * 消息撤回监控
   */
  @bot.subscribe('websocket-message')
  public async monitorDeletedMessages(bot: HeyBoxBot, data: any): Promise<void> {
    // 监控消息删除事件
    try {
      const msg = data.toString('utf-8');
      if (msg.startsWith('{') && msg.endsWith('}')) {
        const jsonData = JSON.parse(msg);
        // 可以在这里处理消息删除事件
        if (jsonData.type === 'message_deleted') {
          Util.log.info(`检测到消息删除事件: ${JSON.stringify(jsonData)}`);
        }
      }
    } catch (error) {
      // 忽略解析错误
    }
  }
})();

// 启动机器人
bot
  .start()
  .then(() => {
    console.log('高级功能机器人已启动');
  })
  .catch(error => {
    console.error('启动失败:', error);
  });
