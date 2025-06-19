/**
 * 定义响应结果的类型
 * 包含了chatmobile和heychat的确认ID
 */
export declare type ResponseResult = {
  chatmobile_ack_id: string;
  heychat_ack_id: string;
};

/**
 * 定义响应的类型
 * 包含了消息内容、响应结果和状态
 */
export declare type Response = {
  msg: string;
  result: ResponseResult;
  status: string;
};
