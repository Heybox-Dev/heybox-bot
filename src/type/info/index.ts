/**
 * 定义头像装饰的类型，包括装饰的类型和URL
 */
export declare type AvatarDecoration = {
  src_type: string;
  src_url: string;
};

// 定义简单的用户信息类型
export declare type SimpleUserInfo = {
  avatar: string;
  level: number;
  nickname: string;
  user_id: number;
};

// 定义命令用户信息类型
export declare type CommandUserInfo = SimpleUserInfo & {
  roles: string[];
};

/**
 * 定义用户基础信息的类型，包括用户的头像、头像装饰、是否为机器人、等级等信息
 */
export declare type UserBaseInfo = CommandUserInfo & {
  avatar_decoration: AvatarDecoration;
  bot: boolean;
  medals: any;
  room_nickname: string;
  tag: any;
};

/**
 * 定义用户信息的类型，目前仅包括用户的基础信息
 */
export declare type UserInfo = {
  user_base_info: UserBaseInfo;
};

/**
 * 定义频道基础信息的类型，包括频道ID、频道名称和频道类型
 */
export declare type ChannelBaseInfo = {
  channel_id: string;
  channel_name: string;
  channel_type: number;
};

/**
 * 定义房间基础信息的类型，包括房间头像、房间ID和房间名称
 */
export declare type RoomBaseInfo = {
  room_avatar: string;
  room_id: string;
  room_name: string;
};

/**
 * 定义命令选项文件的类型，包括文件的名称、URL、大小、类型和ID
 */
export declare type CommandOptionFile = {
  name: string;
  url: string;
  size: number;
  type: string;
  id: string;
  option_index: number;
};

/**
 * 定义命令选项图片的类型，继承自命令选项文件类型，并增加宽度和高度属性
 */
export declare type CommandOptionImage = CommandOptionFile & {
  width: number;
  height: number;
};

/**
 * 定义命令选项的类型，包括选项的名称、类型和值
 */
export declare type CommandOption = {
  name: string;
  type: number;
  value: string;
  image?: CommandOptionImage;
  file?: CommandOptionFile;
};

/**
 * 定义命令信息的类型，包括命令的ID、名称、选项列表和类型
 */
export declare type CommandInfo = {
  id: string;
  name: string;
  options?: CommandOption[];
  type: number;
  images: CommandOptionImage[];
  files: CommandOptionFile[];
};

/**
 * 定义命令用户的类型，目前仅包括用户的ID
 */
export declare type CommandUser = {
  id: number;
};

/**
 * 定义命令文件的类型，包括文件的名称、URL、大小和类型
 */
export declare type CommandFile = {
  name: string;
  url: string;
  size: number;
  type: string;
};

/**
 * 定义命令图片的类型，继承自命令文件类型，并增加宽度和高度属性
 */
export declare type CommandImage = CommandFile & {
  width: number;
  height: number;
};
