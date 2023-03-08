import inquirer from 'inquirer';
import latestVersion from 'latest-version';
import { pkgManagerPrompt } from '../config';
import log from './log';
import runCommand from './runCommand';

const pkg = require('../../package');

const { name, version: localVersion } = pkg;

/**
 * 检测版本
 */
export default function checkVersion() {
  return new Promise(async (resolve, reject) => {
    try {
      const remoteVersion = await latestVersion(name);
      const remoteVersionArr = remoteVersion.split('.');
      const localVersionArr = localVersion.split('.');
      const hasNew = remoteVersionArr.some((item, index) => {
        return Number(item) > Number(localVersionArr[index]);
      });
      if (hasNew) {
        log.info(`${name}存在新版本，本地: ${localVersion}, 远端: ${remoteVersion} 🦍`);
        const choices = Object.values(pkgManagerPrompt).map(t => ({
          name: t.name,
          value: t.value
        }));
        const { pkgManager } = await inquirer.prompt({
          name: 'pkgManager',
          type: 'list',
          message: '请选择更新工具',
          choices
        });
        await updateCli(pkgManager);
      } else {
        log.info(`${name}版本为最新版本：${localVersion} ✨`);
      }
    } catch (error) {
      log.error(`Checking version error: ${error.message}`);
      reject(new Error(`Checking version error: ${error.message}`));
    }
    resolve();
  });
}

/**
 * 更新脚手架版本
 * @param pkgManager npm or yarn
 */
async function updateCli(pkgManager: string | boolean) {
  try {
    if (pkgManager === 'yarn') {
      await runCommand('yarn', ['global', 'add', name], {});
      log.success(`${name} 更新成功  🎉`);
    }
    if (pkgManager === 'npm') {
      await runCommand('npm', ['install', name, '-g'], {});
      log.success(`${name} 更新成功  🎉`);
    }
    process.exit(-1);
  } catch (error) {
    log.error(`${name}更新失败: ${error}，请手动更新 💣`);
    process.exit(-1);
  }
}
