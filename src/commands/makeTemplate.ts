import simpleGit, { SimpleGit } from 'simple-git';
const targetBranch = 'template';
import path from 'path';
import fs from 'fs';
import { log, runCommand } from '../utils';

export default async function() {
  // 1. 获取当前项目分支
  const git: SimpleGit = simpleGit({
    baseDir: process.cwd()
  });

  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    console.error('未初始化为 Git 项目，请在 Git 中进行操作');
    return;
  }

  const branchRes = await git.branch({
    '-vv': null
  });

  const oldBranch = branchRes.current;
  const allBranch = branchRes.all;

  const remoteList = await git.branch(['-v']);
  const existTemplateRemote = remoteList.all.filter(d => {
    return /template/g.test(d);
  });

  let status = await git.status();
  let changeLen =
    status.files.length + status.created.length + status.deleted.length + status.modified.length;

  if (changeLen) {
    log.warn('iris make 要求所在分支 clean，请提交你的文件变动后再进行操作~');
    return;
  }

  if (oldBranch !== targetBranch) {
    if (!allBranch.includes(targetBranch)) {
      log.info(
        `不存在 ${targetBranch} 分支，自动从当前分支 ${oldBranch} 创建本地 ${targetBranch} 分支`
      );
      await git.checkoutBranch(targetBranch, oldBranch);
    } else {
      log.info(`查找到已有发布分支${targetBranch}`);
      await git.checkout(targetBranch);
      const status = await git.status(['--ahead-behind']);
      if (status.ahead + status.behind > 0) {
        log.error(
          `${targetBranch} 分支代码 落后/超前 远程分支，请 push 或 pull 完成后再尝试使用 iris make`
        );
        return;
      }
      await git.mergeFromTo(oldBranch, targetBranch);
    }
  }

  // 2. 生成模板文件夹
  const gulpfilePath = path.join(__dirname, '../gulpfile.js');
  const gulpExecPath = path.join(__dirname, '../../node_modules/.bin/gulp');
  await runCommand(gulpExecPath, ['-f', gulpfilePath, '--cwd', process.cwd()], {});

  // 3. 添加相关文件夹到目标分支
  const templateFolder = fs.existsSync(path.join(process.cwd(), './template'));
  if (!templateFolder) {
    log.error('未构建完全 /template 文件夹不存在!');
    await git.checkout(oldBranch);
    return;
  }
  status = await git.add('./template/*').status();
  changeLen =
    status.files.length + status.created.length + status.deleted.length + status.modified.length;
  if (changeLen) {
    await git.commit(`feat(template): update temp ${new Date().getTime()}`);
  } else {
    log.success('未检测到代码变动，无需更新模板!');
    await git.push();
    await git.checkout(oldBranch);
    return;
  }

  // 4. 推送相关文件到目标分支
  if (existTemplateRemote.length) {
    await git.push('origin', 'template');
    log.info('推送到已有分支');
  } else {
    await git.push('origin', 'template', ['--set-upstream']);
    log.info('推送到新分支');
  }
  log.info('切换到原有分支');
  await git.checkout(oldBranch);
  await runCommand('rm', ['-rf', 'template'], {});
  log.info('删除文件临时文件');
  log.success('模板文件更新成功，如第一次添加该模板，请联系配置管理人员添加模板!');
}
