/*
 * @Author: your name
 * @Date: 2022-04-26 09:25:40
 * @LastEditTime: 2022-04-26 16:25:38
 * @LastEditors: your name
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: /iris-new/src/utils/download.ts
 */
import originDownload from 'download-git-repo';
import ora from 'ora';
import path from 'path';
import { promisify } from 'util';

const download = promisify(originDownload);

/**
 * 下载远程模板
 * @param templateSourceURL 模板源 git地址
 * @param target  存放模板临时文件夹的地方
 * @param useTemplateBranch   从模板分支下载
 */
export default function(
  templateSourceURL: string,
  target: string = '.',
  useTemplateBranch = false
) {
  const downloadTempPath = path.join(target, '.download-temp');
  // 这里可以根据具体的模板地址设置下载的url，注意，如果是git，url后面的branch不能忽略
  const spinner = ora(`正在下载项目模板，源地址：${templateSourceURL}`);
  spinner.start();
  return download(
    `direct:${templateSourceURL}${useTemplateBranch ? '#template' : ''}`,
    downloadTempPath,
    { clone: true }
  )
    .then(() => {
      spinner.succeed();
      return downloadTempPath;
    })
    .catch((error: Error) => {
      spinner.fail();
      return Promise.reject(error);
    });
}
