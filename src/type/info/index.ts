/**
 * 定义头像装饰的类型，包括装饰的类型和URL
 */
export declare type AvatarDecoration = {
  src_type: string;
  src_url: string;
};

/**
 * 定义用户基础信息的类型，包括用户的头像、头像装饰、是否为机器人、等级等信息
 */
export declare type UserBaseInfo = {
  avatar: string;
  avatar_decoration: AvatarDecoration;
  bot: boolean;
  level: number;
  medals: any;
  nickname: string;
  roles: string[];
  room_nickname: string;
  tag: any;
  user_id: number;
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
 * 定义命令选项的类型，包括选项的名称、类型和值
 */
export declare type CommandOption = {
  name: string;
  type: number;
  value: string;
};

/**
 * 定义命令信息的类型，包括命令的ID、名称、选项列表和类型
 */
export declare type CommandInfo = {
  id: string;
  name: string;
  options: CommandOption[];
  type: number;
};
