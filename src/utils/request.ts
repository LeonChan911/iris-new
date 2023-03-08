/*
 * @Author: your name
 * @Date: 2022-04-26 09:25:40
 * @LastEditTime: 2022-04-26 16:29:44
 * @LastEditors: Please set LastEditors
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: /iris/src/utils/request.ts
 */
/* eslint-disable no-console */
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
// import ora from 'ora';
import log from './log';

const errorHandler = (status: number) => {
  switch (status) {
    default:
      console.log();
      log.error(`配置信息请求失败，HTTP ERROR CODE: ${status}`);
      break;
  }
};

const instance = axios.create({
  timeout: 5000 // 超时时间 3s
});

interface Response<T> {
  code: number;
  msg: string;
  data: T;
}

// 增加请求拦截器
instance.interceptors.request.use(
  config => config,
  error => Promise.reject(error)
);

// 增加响应拦截器
instance.interceptors.response.use(
  response => {
    const { data } = response;
    if (data.code !== 0) {
      return Promise.reject(data);
    }
    // 业务正常流程返回数据
    return data.data;
  },
  (error: AxiosError) => {
    const { response } = error;
    if (response) {
      const { status } = response;
      // 根据不同code 可进行不同操作
      errorHandler(status);
    }
    // 抛出错误 中断流程 减少判空操作
    return Promise.reject(error);
  }
);

export function request<T>(config: AxiosRequestConfig): Promise<T> {
  return (instance.request<Response<T>>(config) as any) as Promise<T>;
}

// interface TemplateAPI {
//   Response: {
//     template: {
//       list: string;
//     };
//   };
// }

export type List = {
  name: string;
  value: string;
}[];

export const requestConfig = async () => {
  // const spinner = ora(`请求配置信息`);
  // try {
  //   spinner.start();
  //   const { template } = await request<TemplateAPI['Response']>({
  //     method: 'get',
  //     url: 'https://m.ximalaya.com/xmds-node-spa/configures/query',
  //     params: {
  //       appName: 'iris-config',
  //       lock: false
  //     }
  //   });
  //   spinner.succeed();
    // return { templates: JSON.parse(template.list) as List };
  // } catch (error) {
  //   spinner.fail();
  //   if (error && typeof error.code === 'number' && error.msg) {
  //     console.log();
  //     log.error(`配置请求信息失败，错误原因: ${error.msg}`);
  //     console.log();
  //   }
  //   throw new Error('配置信息请求失败');
  // }
  return {
    templates:[
      
        {
            "name": "React-h5项目模板",
            "value": "git@gitlab.ximalaya.com:chenyin/h5-template-ts.git"
        },
        {
            "name": "React-PC端项目模板",
            "value": "git@gitlab.ximalaya.com:liik/pc-template-ts.git"
        },
        {
            "name": "Meerkat-BFF项目模板",
            "value": "git@gitlab.ximalaya.com:liik/meerkat-iris-template.git"
        },
        {
            "name": "信息化通用模板",
            "value": "git@gitlab.ximalaya.com:ops/ops-template-ts.git"
        }
    ]
  }
};
