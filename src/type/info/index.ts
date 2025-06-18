export declare type AvatarDecoration = {
  src_type: string;
  src_url: string;
};

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

export declare type UserInfo = {
  user_base_info: UserBaseInfo;
};

export declare type ChannelBaseInfo = {
  channel_id: string;
  channel_name: string;
  channel_type: number;
};

export declare type RoomBaseInfo = {
  room_avatar: string;
  room_id: string;
  room_name: string;
};

export declare type CommandOption = {
  name: string;
  type: number;
  value: string;
};

export declare type CommandInfo = {
  id: string;
  name: string;
  options: CommandOption[];
  type: number;
};
