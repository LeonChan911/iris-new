<!--
 * @Author: chneyin
 * @Date: 2022-04-26 09:25:40
 * @LastEditTime: 2022-04-26 10:56:46
 * @LastEditors: your name
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: /iris-new/README.md
-->
# iris

> 一个简单的模板管理工具

## 基本命令

```
sudo iris-new create <project-name>                # 初始化项目
```

## 模板

### 静态模板

无法结合模板问答配置进行动态的模板，初始化此类模板 直接将模板仓库文件拷贝到本地项目

### 动态模板

基于 handlebars，支持模板问答配置`meta.js`，可根据用户数据动态渲染文件，具体编写规范后续给出。


