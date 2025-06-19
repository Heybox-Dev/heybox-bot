// noinspection JSUnusedGlobalSymbols

/**
 * 导入常量和必要模块
 */
import Constants from '@/constants';
import { HeyBoxBot } from '@/index';
import axios, { AxiosInstance } from 'axios';
import { ILogger, Message, UserMessage } from '@/type';
import * as fs from 'node:fs';
import { Logger } from 'winston';
import FormData from 'form-data';
import * as path from 'path';
import mime from 'mime-types';
import deasync from 'deasync';

/**
 * HeyboxBot运行时上下文类，用于存储和提供全局的Bot实例和Logger实例
 */
export class HeyboxBotRuntimeContext {
  private static bot?: HeyBoxBot = undefined;
  private static logger?: Logger = undefined;

  /**
   * 获取Bot实例
   * @returns {HeyBoxBot} Bot实例
   * @throws {Error} 如果Bot未初始化
   */
  public static getBot(): HeyBoxBot {
    if (HeyboxBotRuntimeContext.bot === undefined) {
      throw new Error('Bot not initialized');
    }
    return HeyboxBotRuntimeContext.bot;
  }

  /**
   * 设置Bot实例
   * @param {HeyBoxBot} bot Bot实例
   */
  public static setBot(bot: HeyBoxBot) {
    HeyboxBotRuntimeContext.bot = bot;
  }

  /**
   * 获取Logger实例
   * @returns {Logger} Logger实例
   * @throws {Error} 如果Logger未初始化
   */
  public static getLogger(): Logger {
    if (HeyboxBotRuntimeContext.logger === undefined) {
      throw new Error('Logger not initialized');
    }
    return HeyboxBotRuntimeContext.logger;
  }

  /**
   * 设置Logger实例
   * @param {Logger} logger Logger实例
   */
  public static setLogger(logger: Logger) {
    HeyboxBotRuntimeContext.logger = logger;
  }
}

/**
 * 工具类，提供日志记录、获取确认ID、获取代理配置和字符串哈希功能
 */
export class Util {
  private static ackID: number = Number.parseInt(Math.floor(Math.random() * 1000000).toString(10));
  public static log: ILogger = {
    debug: msg => {
      HeyboxBotRuntimeContext.getLogger().debug(msg);
    },
    error: msg => {
      HeyboxBotRuntimeContext.getLogger().error(msg);
    },
    info: msg => {
      HeyboxBotRuntimeContext.getLogger().info(msg);
    },
    warning: msg => {
      HeyboxBotRuntimeContext.getLogger().warning(msg);
    }
  };

  /**
   * 获取确认ID
   * @returns {number} 确认ID
   */
  public static getAckId(): number {
    return Util.ackID++;
  }

  /**
   * 获取代理配置
   * @returns 代理配置对象或未定义
   */
  public static getProxy():
    | {
        host: string;
        port: number;
        protocol: 'http' | 'https';
      }
    | undefined {
    return HeyboxBotRuntimeContext.getBot().getConfig().proxy;
  }

  /**
   * 使用DJB2算法计算字符串哈希值
   * @param {string} str 输入字符串
   * @returns {number} 哈希值
   */
  public static hashDJB2(str: string) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash >>> 0; // 确保结果为非负整数
  }
}

/**
 * 请求类，处理与服务器的HTTP交互
 */
export class Request {
  public static readonly BASE_URL = `${Constants.BASE_URL}`;
  private static instance?: AxiosInstance = undefined;

  public static getInstance(): AxiosInstance {
    return (
      this.instance ||
      (this.instance = axios.create({
        baseURL: Request.BASE_URL,
        timeout: 15000,
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Content-Type': 'application/json;charset=UTF-8',
          'token': HeyboxBotRuntimeContext.getBot().getConfig().token
        },
        proxy: Util.getProxy()
      }))
    );
  }

  /**
   * 发送消息
   * @param {Message} payload 消息负载
   */
  public static async sendMessage(payload: Message) {
    const url = `${Constants.SEND_MSG_URL}${Constants.COMMON_PARAMS}`;
    Util.log.debug(`send message: ${JSON.stringify(payload)}`);
    Request.getInstance().post(url, payload).then();
  }

  /**
   * 发送用户消息
   * @param {UserMessage} payload 用户消息负载
   */
  public static async sendUserMessage(payload: UserMessage) {
    const url = `${Constants.SEND_USER_MSG_URL}${Constants.COMMON_PARAMS}`;
    Util.log.debug(`send user message: ${JSON.stringify(payload)}`);
    Request.getInstance().post(url, payload).then();
  }

  /**
   * 上传文件
   * @param {BufferSource | string} file 文件内容或文件路径
   * @returns {Promise<string>} 上传后的文件URL
   */
  public static async uploadFile(file: BufferSource | string): Promise<string> {
    if (typeof file === 'string' && file.includes(Constants.CDN_URL)) return Promise.resolve(file);
    let fileName = '';
    if (typeof file === 'string') {
      if (file.startsWith('http')) {
        let response = await axios.get(file, {
          responseType: 'arraybuffer',
          proxy: Util.getProxy()
        });
        file = Buffer.from(response.data, 'binary');
        const mimeType =
          (response.headers['Content-Type'] as string | undefined) ||
          (response.headers['content-type'] as string | undefined) ||
          'application/octet-stream';
        fileName = `file.${mime.extension(mimeType)}`;
      } else {
        fileName = path.parse(file).name;
        file = fs.readFileSync(file);
      }
    }
    const url = `${Constants.UPLOAD_URL}${Constants.COMMON_PARAMS}`;
    const payload = new FormData();
    payload.append('file', file, fileName);
    Util.log.debug(`upload file: <${fileName}>`);
    return new Promise((resolve, reject) => {
      Request.getInstance().post(url, payload, {
        transformRequest: [
          (data, headers) => {
            delete headers['Content-Type']; // 让 axios 自动设置 Content-Type
            return data;
          }
        ]
      })
        .then(value => {
          const data = value.data;
          if (data.status == 'ok') {
            resolve(data.result.url);
          } else {
            reject(data);
          }
        })
        .catch(reject);
    });
  }

  /**
   * 同步方式上传文件
   * @param {BufferSource | string} file 文件内容或文件路径
   * @returns {string} 上传后的文件URL
   */
  public static uploadFileSync(file: BufferSource | string): string {
    let cdnUrl = '';
    let done = false;
    Request.uploadFile(file)
      .then(res => {
        done = true;
        cdnUrl = res;
      })
      .catch(err => {
        Util.log.error(JSON.stringify(err));
        done = true;
      });
    deasync.loopWhile(() => !done);
    return cdnUrl;
  }
}

/**
 * 基于种子的随机数生成器类
 */
export class SeededRandom {
  seed: number;
  m: number;
  a: number;
  c: number;
  state: number;

  /**
   * 构造函数
   * @param {number} seed 种子
   */
  constructor(seed: number) {
    this.seed = seed;
    this.m = 0x80000000; // 2^31
    this.a = 1103515245;
    this.c = 12345;
    this.state = ((seed % this.m) + this.m) % this.m;
  }

  /**
   * 生成下一个随机数
   * @returns {number} 随机数
   */
  public next(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / this.m;
  }

  /**
   * 生成下一个整数
   * @param {number} min 最小值
   * @param {number} max 最大值
   * @returns {number} 随机整数
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}
