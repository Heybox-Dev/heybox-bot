#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';

interface InitConfig {
  packageName: string;
  description: string;
  author: string;
}

const rootDirectory: string = process.cwd();
const args: string[] = process.argv.slice(2);
const COMMANDS = {
  INIT: 'init'
} as const;

/**
 * 获取默认的 package.json 配置
 */
function getDefaultPackageJson(config: InitConfig) {
  return {
    name: config.packageName,
    version: '1.0.0',
    description: config.description,
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    scripts: {
      dev: 'nodemon',
      build: 'tsc && tsc-alias',
      start: 'node dist/index.js'
    },
    author: config.author,
    license: 'MIT',
    dependencies: {
      'heybox-bot': '^1.3.1'
    },
    devDependencies: {
      '@types/node': '^20.11.0',
      '@types/ws': '^8.18.1',
      'nodemon': '^3.0.2',
      'ts-node': '^10.9.2',
      'tsc-alias': '^1.8.16',
      'typescript': '^5.8.3'
    }
  };
}

/**
 * 获取默认的 tsconfig.json 配置
 */
function getDefaultTsConfig() {
  return {
    compilerOptions: {
      target: 'es2017',
      module: 'commonjs',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      outDir: 'dist',
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      baseUrl: './',
      paths: {
        '@/*': ['src/*']
      }
    },
    include: ['src/**/*.ts'],
    exclude: ['node_modules', 'dist']
  };
}

/**
 * 获取 Prettier 配置
 */
function getPrettierConfig() {
  return `// Prettier 配置文件
module.exports = {
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  printWidth: 100,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf'
};`;
}

/**
 * 获取 ESLint 配置
 */
function getEslintConfig() {
  return `import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import configPrettier from 'eslint-config-prettier';
import pluginPrettier from 'eslint-plugin-prettier/recommended';

export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: { ...globals.node } } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginPrettier,
  configPrettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn'
    }
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.prettierrc.js',
      'eslint.config.mjs'
    ]
  }
];`;
}

/**
 * 获取 nodemon 配置
 */
function getNodemonConfig() {
  return {
    watch: ['src'],
    ext: 'ts',
    exec: 'ts-node src/index.ts',
    ignore: ['dist/']
  };
}

/**
 * 获取初始的 index.ts 文件内容
 */
function getInitIndexTs() {
  return `import { HeyBoxBot } from 'heybox-bot';
import { CommandSource } from 'heybox-bot/dist/command';
import { RawData } from 'ws';

// 请将 'your-token-here' 替换为你的实际 token
const bot: HeyBoxBot = new HeyBoxBot({ 
  token: process.env.BOT_TOKEN || 'your-token-here' 
});

class MyBot {
  @bot.command('/test')
  public test(source: CommandSource) {
    source.success('Hello from HeyBox Bot!');
  }

  @bot.subscribe('websocket-message')
  public onWebsocketMsg(bot: HeyBoxBot, msg: RawData) {
    console.log('Received message:', msg.toString('utf-8'));
  }
}

// 实例化机器人
new MyBot();

// 启动机器人
bot.start().catch(console.error);
`;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
HeyBox Bot CLI 工具

用法:
  heybox init    初始化一个新的 HeyBox Bot 项目

选项:
  --help, -h     显示帮助信息
  --version, -v  显示版本信息
  `);
}

/**
 * 显示版本信息
 */
function showVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
  console.log(`HeyBox Bot CLI v${packageJson.version}`);
}

// 主程序入口
async function main() {
  // 处理帮助和版本命令
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    return;
  }

  // 处理初始化命令
  if (args.includes(COMMANDS.INIT)) {
    const config: InitConfig = {
      packageName: path.basename(rootDirectory),
      description: 'A HeyBox chat bot',
      author: 'Your Name'
    };

    try {
      await init(config);
      console.log('✅ HeyBox Bot initialized successfully!');
      console.log('\nNext steps:');
      console.log('1. cd', rootDirectory);
      console.log('2. pnpm install  # 或 npm install / yarn install');
      console.log('3. 设置环境变量 BOT_TOKEN');
      console.log('4. pnpm run dev');
    } catch (error) {
      console.error('❌ Initialization failed:', (error as Error).message);
      process.exit(1);
    }
    return;
  }

  // 如果没有匹配的命令，显示帮助
  showHelp();
  process.exit(1);
}

/**
 * 初始化项目
 */
async function init(config: InitConfig): Promise<void> {
  console.log('🚀 Initializing HeyBox Bot...');

  // 检查是否在非空目录
  const files = fs.readdirSync(rootDirectory);
  const significantFiles = files.filter(file => !file.startsWith('.') && file !== 'LICENSE' && file !== 'README.md');

  if (significantFiles.length > 0) {
    console.warn('⚠️  Warning: Current directory is not empty!');
    console.warn('Existing files:', significantFiles.join(', '));

    const answer = await promptUser('Do you want to continue? (y/N): ');
    if (answer.toLowerCase() !== 'y') {
      throw new Error('Initialization cancelled by user');
    }
  }

  try {
    // 创建必要的目录
    const dirs = ['src'];
    for (const dir of dirs) {
      const dirPath = path.join(rootDirectory, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }

    // 写入配置文件
    await writeFileIfNotExists(
      path.join(rootDirectory, 'package.json'),
      JSON.stringify(getDefaultPackageJson(config), null, 2)
    );

    await writeFileIfNotExists(
      path.join(rootDirectory, 'tsconfig.json'),
      JSON.stringify(getDefaultTsConfig(), null, 2)
    );

    await writeFileIfNotExists(path.join(rootDirectory, '.prettierrc.js'), getPrettierConfig());

    await writeFileIfNotExists(path.join(rootDirectory, 'eslint.config.mjs'), getEslintConfig());

    await writeFileIfNotExists(path.join(rootDirectory, 'nodemon.json'), JSON.stringify(getNodemonConfig(), null, 2));

    await writeFileIfNotExists(path.join(rootDirectory, 'src', 'index.ts'), getInitIndexTs());

    // 创建环境变量文件模板
    await writeFileIfNotExists(path.join(rootDirectory, '.env.example'), 'BOT_TOKEN=your-bot-token-here\n');

    console.log('✨ All files created successfully!');
  } catch (error) {
    throw new Error(`Failed to initialize: ${(error as Error).message}`);
  }
}

/**
 * 如果文件不存在则写入文件
 */
function writeFileIfNotExists(filePath: string, content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.access(filePath, fs.constants.F_OK, err => {
      if (!err) {
        console.log(`⏭️  Skipped (already exists): ${path.relative(rootDirectory, filePath)}`);
        resolve();
        return;
      }

      fs.writeFile(filePath, content, writeErr => {
        if (writeErr) {
          reject(writeErr);
        } else {
          console.log(`📝 Created: ${path.relative(rootDirectory, filePath)}`);
          resolve();
        }
      });
    });
  });
}

/**
 * 用户输入提示
 */
function promptUser(question: string): Promise<string> {
  return new Promise(resolve => {
    process.stdout.write(question);
    process.stdin.once('data', data => {
      resolve(data.toString().trim());
    });
  });
}

// 执行主程序
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
