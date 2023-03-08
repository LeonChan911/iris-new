const { src, dest, series, task } = require('gulp');
const fs = require('fs');
const path = require('path');
const replace = require('gulp-replace');
const clean = require('gulp-clean');

const destFolder = 'template/';
const currentPath = process.cwd().replace('/dist', '');

let ignoreMap;
try {
  ignoreMap = require(path.join(currentPath, './iris.ignore'));
} catch (error) {
  console.error(error);
}

function clear() {
  const exists = fs.existsSync(path.join(currentPath, destFolder));
  if (!exists) {
    return Promise.resolve('No Cleaning Need');
  }
  return src(destFolder, { read: false, cwd: currentPath }).pipe(clean());
}

function build() {
  if (!ignoreMap) {
    throw new Error('请在项目根目录中添加 iris.ignore.js 文件，添加完成后再重试');
    return;
  }
  return src(['**/*.*', '**/.*.*', '.*.*', '.*', ...ignoreMap.map(d => `!${d}`)], {
    cwd: currentPath
  }).pipe(dest(path.join(currentPath, destFolder)));
}

module.exports = { default: series(clear, build) };
