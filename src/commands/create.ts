import fs from 'fs-extra';
import { log, download, runCommand, metaHandler } from '../utils';
import inquirer from 'inquirer';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import klaw from 'klaw';
import ora from 'ora';
import { pkgManagerPrompt } from '../config';
import { requestConfig } from '../utils/request';

const META_FILE_NAME = 'meta.js'; // 单个模板的配置文件名称
let templateTempPath: string; // 模板暂时存放的路径
const nameReg = /[A-Z][a-z]+|[a-z]+/g;
const spinner = ora('整理模板文件');
const pkgJsonReg = /package\.json/g;

// 插入一个npm包管理的内置问答
const pkgManagerPromptOption = {
  name: 'pkgManager',
  type: 'list',
  message: '请选择包管理工具',
  choices: pkgManagerPrompt
};

export default async function(projectName: string) {
  const cwd = process.cwd();

  if (!projectName) {
    log.warn('请输入项目名后重试');
    return;
  }

  const git: SimpleGit = simpleGit({
    baseDir: cwd
  });
  const isRepo = await git.checkIsRepo();

  if (isRepo) {
    log.error('不可在 git 项目中操作!');
    return;
  }

  const defaultMetaData = metaHandler(projectName);
  const metaMaps = Object.keys(defaultMetaData);

  // 提示
  log.info(`
  #### ########  ####  ######  
   ##  ##     ##  ##  ##    ## 
   ##  ##     ##  ##  ##       
   ##  ########   ##   ######  
   ##  ##   ##    ##        ## 
   ##  ##    ##   ##  ##    ## 
  #### ##     ## ####  ###### 
  `);

  // 1. 检查目录
  const prepareRes = await prepareDir(projectName, cwd);
  if (!prepareRes.stage) {
    return;
  }

  // 2. 选择模板
  const chooseTempRes = await chooseTemplate();
  // 3. 下载模板
  const downloadRes = await downloadTemplate(chooseTempRes.result);

  if (!fs.existsSync(downloadRes.result)) {
    log.error('不支持该类型模板，请尝试使用其他模板，或联系模板作者更新！');
    return;
  }

  // 4. 配置问询
  const queryRes = await queryConfig(downloadRes.result, defaultMetaData, metaMaps);
  // 5. 整理问询结果
  const formatRes = await formatAnswers(queryRes.result.answers);
  // 6. 整理模板
  await arrangeSourceFolder(formatRes.result, downloadRes.result);
  // 7. 生成目录
  await generateDir(prepareRes.folderPath, prepareRes.result, downloadRes.result);
  // 8. 安装依赖
  await installDep(queryRes.result.pkgManager, prepareRes.folderPath);
  // 9. 清理
  cleanup(downloadRes.result);
  log.success(`您可以使用 IDE 打开 ${projectName} 了`);
  // 提示
}

// 检查目录
async function prepareDir(folderName: string, currentDir: string) {
  const folderPath = path.join(currentDir, folderName);
  const isExisted = fs.existsSync(folderPath);
  if (isExisted) {
    log.error('检测到同名文件夹，即将进行风险操作!!!');
    const res = await inquirer.prompt({
      name: 'isCover',
      message: '是否覆盖原有项目?',
      type: 'list',
      default: 'n',
      choices: [
        {
          type: 'choice',
          name: '是',
          value: 'y'
        },
        {
          type: 'choice',
          name: '否',
          value: 'n'
        }
      ]
    });
    if (res.isCover === 'y') {
      return { stage: true, result: 'cover', folderPath };
    } else {
      return { stage: false, result: 'not cover', folderPath };
    }
  }
  return { stage: true, result: 'create', folderPath };
}

// 选择模板
async function chooseTemplate() {
  const { templates } = await requestConfig();
  const { selectTemplate } = await inquirer.prompt({
    name: 'selectTemplate',
    type: 'list',
    message: '请选择模板',
    choices: templates
  });
  return { stage: true, result: selectTemplate };
}

// 下载模板
async function downloadTemplate(downloadUrl: string) {
  const savePath = path.join(process.cwd(), '.download-temp');
  const exsited = fs.existsSync(savePath);
  if (exsited) {
    log.info('清除历史模板...');
    fs.removeSync(savePath);
  }
  templateTempPath = await download(downloadUrl, process.cwd(), true);
  return { stage: true, result: path.join(templateTempPath, '/template') };
}

// 配置问询
async function queryConfig(
  templatePath: string,
  defaultMeta: Record<string, string>,
  metaMaps: string[]
) {
  const filePath = path.resolve(templatePath, META_FILE_NAME);
  let promptOptions;
  if (fs.existsSync(filePath)) {
    //   动态模板
    const prompts = require(filePath);
    const mixinWidthDefault = prompts.map((d: any) => {
      if (metaMaps.includes(d.default)) {
        d.default = defaultMeta[d.default];
      }
      return d;
    });
    promptOptions = [...mixinWidthDefault, pkgManagerPromptOption];
  } else {
    promptOptions = [pkgManagerPromptOption];
    //   静态模板
  }
  const { pkgManager, ...answers } = await inquirer.prompt(promptOptions);
  return {
    stage: true,
    result: { pkgManager, answers, isStaicTemplate: promptOptions.length < 2 }
  };
}

// 整理问询结果
async function formatAnswers(ans: { [key: string]: string }) {
  const keys = Object.keys(ans);
  const values = Object.values(ans);
  const reFormatItems: Record<string, string> = keys.reduce((all, s, index) => {
    const [...words] = s.matchAll(nameReg);
    const kebabWord = words.map(e => e[0].toLowerCase()).join('-');
    return { ...all, [`--${kebabWord}`]: values[index] };
  }, {});
  return { stage: true, result: reFormatItems };
}

// 整理模板
function arrangeSourceFolder(replaceItems: Record<string, string>, sourcePath: string) {
  const replaceItemsArr = Object.keys(replaceItems);
  spinner.start();
  const metaPath = path.join(sourcePath, META_FILE_NAME);
  fs.removeSync(metaPath);
  return new Promise((resolve, reject) => {
    klaw(sourcePath)
      .on('data', item => {
        const isFile = item.stats.isFile();
        if (!isFile) {
          return;
        }
        const isPkgJson = pkgJsonReg.test(item.path);
        let pkgJson;
        if (isPkgJson) {
          pkgJson = fs.readJSONSync(item.path);
          const { dependencies, devDependencies } = pkgJson;
          // 依赖排序
          const [newDeps, newDevDeps] = [sortObject(dependencies), sortObject(devDependencies)];
          pkgJson.dependencies = newDeps;
          pkgJson.devDependencies = newDevDeps;
        }
        // 常规文件处理
        let file = isPkgJson ? JSON.stringify(pkgJson) : fs.readFileSync(item.path).toString();
        const containsReplaceItems = file.match(new RegExp(replaceItemsArr.join('|'), 'g'));
        if (!containsReplaceItems) {
          return;
        }

        replaceItemsArr.forEach(key => {
          file = file.replace(new RegExp(key, 'g'), replaceItems[key]);
        });
        fs.writeFileSync(item.path, Buffer.from(file));
        // package.json 文件处理
      })
      .on('end', () => {
        spinner.succeed();
        resolve({ stage: true, result: true });
      })
      .on('error', e => {
        spinner.fail();
        reject(e);
      });
  });
}

// 项目初始化
async function generateDir(projectDir: string, type: string, sourceDir: string) {
  // 生成目录
  if (type === 'create') {
    await fs.mkdir(projectDir);
  } else {
    fs.removeSync(projectDir);
    await fs.mkdir(projectDir);
  }

  // 拷贝代码
  fs.copySync(sourceDir, projectDir);
  // git 初始化
  const git: SimpleGit = simpleGit({
    baseDir: projectDir
  });
  await git.init();

  return { stage: true, result: true };
}

/**
 *
 * @param pkgManager 安装依赖 yarn or npm or false
 */
async function installDep(pkgManager: string | boolean, projectPath: string): Promise<boolean> {
  return new Promise(async resolve => {
    if (pkgManager !== false) {
      try {
        if (pkgManager === 'yarn') {
          await runCommand('yarn', [], { cwd: projectPath });
          resolve(true);
        }
        if (pkgManager === 'npm') {
          await runCommand('npm', ['install'], { cwd: projectPath });
          resolve(true);
        }
        log.success('依赖安装成功 🎉');
      } catch (error) {
        log.error(`依赖安装失败：${error.message}`);
        log.warn('请手动安装依赖');
        resolve(false);
      }
    } else {
      resolve(false);
    }
  });
}

// 清理工作
async function cleanup(tempPath: string) {
  fs.removeSync(tempPath);
}

function sortObject(obj: { [prop: string]: string }) {
  const sortedObject: { [prop: string]: string } = {};
  Object.keys(obj)
    .sort()
    .forEach(item => {
      sortedObject[item] = obj[item];
    });
  return sortedObject;
}

// 事务错误处理

// 事务成功处理
