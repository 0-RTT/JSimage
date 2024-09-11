# 简介

一个基于 Node.js 和 Express 的图像上传和管理服务。

# 功能
- 支持粘贴上传。
- 支持多文件上传。
- 支持查看历史记录。
- 支持后台文件管理。
- 支持修改后台路径。
- 支持选择图片后会自动上传。
- 支持压缩功能，默认选择图片后自动压缩。
- 支持在管理界面显示图片上传时间，并按上传时间排序。
- 支持URL、BBCode和Markdown格式，点击对应按钮可自动复制相应格式的链接。

# 安装

一键安装

```
bash -c "$(curl -L https://raw.githubusercontent.com/0-RTT/index/main/JSimage.sh)" @ install
```

一键卸载

```
bash -c "$(curl -L https://raw.githubusercontent.com/0-RTT/index/main/JSimage.sh)" @ remove
```

配置nginx反代

```
location / {
    proxy_pass http://127.0.0.1:9740;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

修改main.mjs文件中的变量
```
const ALLOWED_HOST = 'example.com'; // 允许的主机名，用于限制上传请求，确保只有来自特定域名的请求可以进行文件上传操作。
const URL_HOST = 'example.com'; // 构成图片URL的域名
const USERNAME = 'admin'; // 替换为你的用户名
const PASSWORD = 'password'; // 替换为你的密码
const ADMIN_PATH = '/admin; // 管理员路径
```

重启systemctl服务

```
sudo systemctl restart JSimage.service
```
