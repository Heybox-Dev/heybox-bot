#!/usr/bin/env node
import * as fs from 'node:fs';
import process from 'node:process';

const rootDirectory: string = process.cwd();
const args: string[] = [];
args.push(...process.argv.slice(2));
const initPackageJson = {
  name: 'bot-name',
  version: '1.0.0',
  description: '',
  main: 'src/define.js',
  types: 'src/define.d.ts',
  scripts: {
    dev: 'pnpx nodemon exec babel-node',
    build: 'tsc --declaration'
  },
  author: 'author',
  license: 'LGPL-3.0-or-later',
  dependencies: {
    'heybox-bot': '^1.2.35'
  },
  devDependencies: {
    '@eslint/js': '^9.24.0',
    '@types/nodemon': '^1.19.6',
    '@types/ws': '^8.18.1',
    eslint: '^9.24.0',
    'eslint-config-prettier': '^9.1.0',
    'eslint-plugin-prettier': '^5.2.6',
    globals: '^15.15.0',
    prettier: '^3.5.3',
    'ts-node': '^10.9.2',
    typescript: '^5.8.3',
    'typescript-eslint': '^8.29.1'
  }
};
const initTsConfigJson = {
  compilerOptions: {
    target: 'es2017',
    module: 'commonjs',
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    baseUrl: './',
    paths: {
      '@/*': ['src/*']
    }
  },
  include: ['src/**/*.ts'],
  exclude: ['src/**/*.d.ts', 'src/**/*.js']
};
const initBabelRc = {
  plugins: ['@babel/plugin-proposal-decorators']
};
const initPrettierrcJs =
  '//此处的规则供参考，其中多半其实都是默认值，可以根据个人习惯改写\n' +
  'module.exports = {\n' +
  '    tabWidth: 2, //缩进长度\n' +
  '    semi: true, //句末使用分号\n' +
  '    singleQuote: true, //使用单引号\n' +
  '    printWidth: 120, //单行长度\n' +
  "    trailingComma: 'none', //多行时尽可能打印尾随逗号\n" +
  "    quoteProps: 'preserve', //仅在必需时为对象的key添加引号\n" +
  '    bracketSameLine: true, //多属性html标签的‘>’折行放置\n' +
  '    jsxBracketSameLine: true, //多属性html标签的‘>’折行放置\n' +
  "    arrowParens: 'avoid', //单参数箭头函数参数周围使用圆括号-eg: (x) => x\n" +
  "    htmlWhitespaceSensitivity: 'ignore', //对HTML全局空白不敏感\n" +
  '    useTabs: false, //使用空格代替tab缩进\n' +
  '    jsxSingleQuote: true, // jsx中使用单引号\n' +
  '    bracketSpacing: true, //在对象前后添加空格-eg: { foo: bar }\n' +
  '    requirePragma: false, //无需顶部注释即可格式化\n' +
  '    insertPragma: false, //在已被preitter格式化的文件顶部加上标注\n' +
  "    proseWrap: 'preserve', //不知道怎么翻译\n" +
  '    vueIndentScriptAndStyle: false, //不对vue中的script及style标签缩进\n' +
  "    endOfLine: 'lf', //结束行形式\n" +
  "    embeddedLanguageFormatting: 'auto', //对引用代码进行格式化\n" +
  '};';
const initEslintConfigMjs =
  "import globals from 'globals';\n" +
  "import pluginJs from '@eslint/js';\n" +
  "import tseslint from 'typescript-eslint';\n" +
  "import configPrettier from 'eslint-config-prettier';\n" +
  "import pluginPrettier from 'eslint-plugin-prettier/recommended';\n" +
  '\n' +
  'export default [\n' +
  "  { files: ['**/*.{js,mjs,cjs,ts,vue}'] },\n" +
  '  { languageOptions: { globals: globals.browser } },\n' +
  '  { languageOptions: { globals: { uni: true, wx: true } } },\n' +
  '  pluginJs.configs.recommended,\n' +
  '  ...tseslint.configs.recommended,\n' +
  '  pluginPrettier,\n' +
  '  configPrettier,\n' +
  "  { files: ['**/*.vue'], languageOptions: { parserOptions: { parser: tseslint.parser } } },\n" +
  '  {\n' +
  '    rules: {\n' +
  "      '@typescript-eslint/no-explicit-any': 'off'\n" +
  '    }\n' +
  '  },\n' +
  '  {\n' +
  '    ignores: [\n' +
  "      '.prettierrc.js',\n" +
  "      'postcss.config.js',\n" +
  "      'tailwind.config.js',\n" +
  "      'shims-uni.d.ts',\n" +
  "      '**/shime-uni.d.ts',\n" +
  "      'eslint.config.mjs'\n" +
  '    ]\n' +
  '  }\n' +
  '];\n';
const initNodemonJson = {
  watch: ['src'],
  ext: '.ts',
  exec: 'tsx src/index.ts'
};

const initIndexTs =
  "import { HeyBoxBot } from 'heybox-bot';\n" +
  "import { CommandSource } from 'gugle-command';\n" +
  "import { RawData } from 'ws';\n" +
  '\n' +
  "const bot: HeyBoxBot = new HeyBoxBot({ token:'your token' });\n" +
  '\n' +
  'new (class MyBot {\n' +
  "  @bot.command('/test')\n" +
  '  public test(source: CommandSource) {\n' +
  "    source.success('test');\n" +
  '  }\n' +
  '\n' +
  "  @bot.subscribe('websocket-message')\n" +
  '  public onWebsocketMsg(bot: HeyBoxBot, msg: RawData) {\n' +
  "    console.log(msg.toString('utf-8'));\n" +
  '  }\n' +
  '})()\n' +
  '\n' +
  'bot.start();\n';
if (args.findIndex(arg => arg === 'init')) init();

function init() {
  console.log('HeyBox Bot initializing...');
  const sourcePath = `${rootDirectory}/src`;
  if (!fs.existsSync(sourcePath)) fs.mkdirSync(sourcePath);
  const packageJsonPath = `${rootDirectory}/package.json`;
  if (!fs.existsSync(packageJsonPath)) fs.writeFileSync(packageJsonPath, JSON.stringify(initPackageJson, null, 2));
  const tsconfigJsonPath = `${rootDirectory}/tsconfig.json`;
  if (!fs.existsSync(tsconfigJsonPath)) fs.writeFileSync(tsconfigJsonPath, JSON.stringify(initTsConfigJson, null, 2));
  const babelRcPath = `${rootDirectory}/.babelrc`;
  if (!fs.existsSync(babelRcPath)) fs.writeFileSync(babelRcPath, JSON.stringify(initBabelRc, null, 2));
  const prettierrcJs = `${rootDirectory}/.prettierrc.js`;
  if (!fs.existsSync(prettierrcJs)) fs.writeFileSync(prettierrcJs, initPrettierrcJs);
  const eslintConfigMjs = `${rootDirectory}/eslint.config.mjs`;
  if (!fs.existsSync(eslintConfigMjs)) fs.writeFileSync(eslintConfigMjs, initEslintConfigMjs);
  const nodemonJson = `${rootDirectory}/nodemon.json`;
  if (!fs.existsSync(nodemonJson)) fs.writeFileSync(nodemonJson, JSON.stringify(initNodemonJson, null, 2));
  const indexTs = `${rootDirectory}/src/index.ts`;
  if (!fs.existsSync(indexTs)) fs.writeFileSync(indexTs, initIndexTs);
  console.log('HeyBox Bot initialized!');
}
