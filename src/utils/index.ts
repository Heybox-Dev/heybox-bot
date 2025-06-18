// noinspection JSUnusedGlobalSymbols

import Constants from '@/constants';
import { HeyBoxBot } from '@/index';
import axios from 'axios';
import { ILogger, Message } from '@/type';
import * as fs from 'node:fs';
import { Logger } from 'winston';
import FormData from 'form-data';
import * as path from 'path';
import mime from 'mime-types';
import deasync from 'deasync';

export class HeyboxBotRuntimeContext {
  private static bot?: HeyBoxBot = undefined;
  private static logger?: Logger = undefined;

  public static getBot(): HeyBoxBot {
    if (HeyboxBotRuntimeContext.bot === undefined) {
      throw new Error('Bot not initialized');
    }
    return HeyboxBotRuntimeContext.bot;
  }

  public static setBot(bot: HeyBoxBot) {
    HeyboxBotRuntimeContext.bot = bot;
  }

  public static getLogger(): Logger {
    if (HeyboxBotRuntimeContext.logger === undefined) {
      throw new Error('Logger not initialized');
    }
    return HeyboxBotRuntimeContext.logger;
  }

  public static setLogger(logger: Logger) {
    HeyboxBotRuntimeContext.logger = logger;
  }
}

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

  public static getAckId(): number {
    return Util.ackID++;
  }

  public static getProxy():
    | {
        host: string;
        port: number;
        protocol: 'http' | 'https';
      }
    | undefined {
    return HeyboxBotRuntimeContext.getBot().getConfig().proxy;
  }

  public static getHeaders() {
    return {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Content-Type': 'application/json;charset=UTF-8',
      'token': HeyboxBotRuntimeContext.getBot().getConfig().token
    };
  }

  public static async sendMessage(payload: Message) {
    const url = `${Constants.HTTP_HOST}${Constants.SEND_MSG_URL}${Constants.COMMON_PARAMS}`;
    Util.log.debug(`send message: ${JSON.stringify(payload, null, 2)}`);
    axios
      .post(url, payload, {
        headers: Util.getHeaders(),
        proxy: Util.getProxy()
      })
      .then();
  }

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
      axios
        .post(url, payload, {
          headers: {
            ...payload.getHeaders(),
            ...Util.getHeaders()
          },
          proxy: Util.getProxy(),
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

  public static uploadFileSync(file: BufferSource | string): string {
    let cdnUrl = '';
    let done = false;
    Util.uploadFile(file)
      .then(res => {
        done = true;
        cdnUrl = res;
      })
      .catch(err => {
        Util.log.error(JSON.stringify(err, null, 2));
        done = true;
      });
    deasync.loopWhile(() => !done);
    return cdnUrl;
  }

  public static hashDJB2(str: string) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash >>> 0; // 确保结果为非负整数
  }
}

let ackID: number = Number.parseInt(Math.floor(Math.random() * 1000000).toString(10));

export function getAckId() {
  return ackID++;
}

export function getHeaders(token: string | undefined = undefined) {
  return {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Content-Type': 'application/json;charset=UTF-8',
    'token': token
  };
}

export class SeededRandom {
  seed: number;
  m: number;
  a: number;
  c: number;
  state: number;

  constructor(seed: number) {
    this.seed = seed;
    this.m = 0x80000000; // 2^31
    this.a = 1103515245;
    this.c = 12345;
    this.state = ((seed % this.m) + this.m) % this.m;
  }

  next() {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / this.m;
  }

  nextInt(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export class BlobImpl implements Blob {
  public size: number;
  public type: string;
  public buffer: ArrayBuffer;

  constructor(size: number, type: string, buffer: ArrayBuffer) {
    this.size = size;
    this.type = type;
    this.buffer = buffer;
  }

  public static create(buffer: ArrayBuffer, type: string) {
    return new BlobImpl(buffer.byteLength, type, buffer);
  }

  public static createBy(buffer: Uint8Array, type: string) {
    return new BlobImpl(buffer.byteLength, type, buffer);
  }

  public arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(this.buffer);
  }

  public bytes(): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array(this.buffer));
  }

  public slice(start: number = 0, end: number = this.buffer.byteLength, contentType: string = this.type): Blob {
    return new BlobImpl(end - start, contentType, this.buffer.slice(start, end));
  }

  public stream(): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
      start: controller => {
        controller.enqueue(new Uint8Array(this.buffer));
        controller.close();
      }
    });
  }

  text(): Promise<string> {
    return Promise.resolve(new TextDecoder().decode(this.buffer));
  }
}
