<p align="center"><a href="https://www.heybox.dev" target="_blank" rel="noopener noreferrer"><img width="100" src="https://www.heybox.dev/icon.svg" alt="Heybox Dev logo"></a></p>

<p align="center">
  <a href="https://github.com/heybox-dev/heybox-bot/actions/workflows/node.ci.yml"><img src="https://github.com/heybox-dev/heybox-bot/actions/workflows/node.ci.yml/badge.svg" alt="Build Status"></a>
  <a href="https://www.npmjs.com/package/heybox-bot"><img src="https://img.shields.io/npm/v/heybox-bot.svg?sanitize=true" alt="Version"></a>
  <a href="https://www.npmjs.com/package/heybox-bot"><img src="https://img.shields.io/npm/l/heybox-bot.svg?sanitize=true" alt="License"></a>
</p>

## Quick Start

### Install

```bash
cd your/project/path
npm i -g heybox-bot
heybox --init
npm i
```

### Configuration

* `your/project/path/src/define.ts`

```typescript
import { HeyBoxBot } from 'heybox-bot';
import { CommandSource } from 'heybox-bot/command';
import { RawData } from 'ws';

const bot: HeyBoxBot = new HeyBoxBot({ token: 'your token' }); // parse your bot token

new (class MyBot {
  @bot.command('/hello')
  public test(source: CommandSource) {
    source.success('world');
  }
})()

bot.start();
```

### Run

```bash
cd your/project/path
npm run dev
```

## New Features

### 房间管理功能

```typescript
// 获取房间信息
const roomInfo = await bot.getRoomInfo('房间ID');

// 获取加入的房间列表
const rooms = await bot.getJoinedRooms(0, 20);

// 获取房间用户列表
const users = await bot.getRoomUsers('房间ID', '用户ID');

// 修改房间昵称
await bot.changeRoomNickname('房间ID', '新昵称');

// 退出房间
await bot.leaveRoom('房间ID');

// 踢出用户
await bot.kickOutUser('房间ID', 用户ID, 3600, '违规行为');

// 禁言用户
await bot.banUser('房间ID', 用户ID, 3600, '违反规则', true);
```

### 消息操作功能

```typescript
// 更新消息
await bot.updateMessage('消息ID', '新内容', '房间ID', '频道ID');

// 删除消息
await bot.deleteMessage('消息ID', '房间ID', '频道ID');

// 添加/取消表情回应
await bot.emojiReply('消息ID', '房间ID', '频道ID', '👍', true);
```

### 新增示例命令

项目示例文件中添加了以下新命令：

- `/roominfo {房间ID}` - 获取房间详细信息
- `/myrooms` - 列出机器人加入的所有房间
- `/roomusers {房间ID}` - 显示房间内的用户列表
- `/setnick {房间ID} {昵称}` - 修改机器人在房间的昵称
- `/updatemsg {新内容}` - 更新机器人发送的最后一条消息
- `/emoji {消息ID} {表情符号}` - 给指定消息添加表情

### API 接口完善

新增了以下 HTTP API 接口支持：

- 更新频道消息
- 删除频道消息
- 获取房间信息
- 分页获取加入的房间列表
- 获取房间用户列表
- 消息表情回应
- 修改房间内昵称
- 退出房间
- 房间踢人
- 禁言/解禁用户

## Advanced Usage

### 消息ID管理

为了使用消息更新功能，你需要保存发送消息时返回的消息ID：

```typescript
// 发送消息并保存ID
const response = await Request.sendMessage({
  // 消息内容...
});
const msgId = response.data.result.heychat_ack_id;
// 保存msgId用于后续更新操作
```

### 错误处理

所有异步方法都会返回 Promise，建议使用 try-catch 进行错误处理：

```typescript
try {
  const result = await bot.getRoomInfo('房间ID');
  if (result.data.status === 'ok') {
    // 处理成功响应
  } else {
    console.error('API调用失败:', result.data.msg);
  }
} catch (error) {
  console.error('网络错误:', error);
}
```
