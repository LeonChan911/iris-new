#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */

import program from 'commander';
import { listTemplate, makeTemplate, createTemplate } from './commands';
const pkg = require('../package.json');

const cmdList = process.argv;

// 命令列表
const cm = ['list', 'ls', 'init', 'make', 'create'];

program.version(pkg.version, '-v, --version').usage('create <project-name>');

program
  .command('list')
  .alias('ls')
  .description('显示 IRIS 当前可用的模板')
  .action(listTemplate);

program
  .command('make')
  .description('为当前项目创建或更新 IRIS 可用的模板分支')
  .action(makeTemplate);

program
  .command('create <project-name>')
  .description('在当前目录中创建项目')
  .action(createTemplate);

program.parse(process.argv);

// 初始化提示
const argsReg = /^-+\w+$/;
const hasUserOptions = cmdList.find(d => argsReg.test(d));
const hasCommands = cmdList.find(d => cm.includes(d));

if (!hasUserOptions && !hasCommands) {
  // const options = program.opts();
  // console.log('options', options);
  // console.log(process.argv);
  // program.commands.list();
  listTemplate().then(() => {
    program.help();
  });
}
