import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import fetch from "node-fetch";
import bcrypt from "bcrypt";

const app = express();
const PORT = 9740;

// 定义常量
const ALLOWED_HOST = "example.com"; // 允许的主机名
const URL_HOST = "example.com"; // 替换为图片链接主机名
const USERNAME = "admin"; // 替换为你的用户名
const PASSWORD = "password"; // 替换为你的密码
const ADMIN_PATH = "/admin"; // 管理员路径

// 哈希密码
const hashedPassword = await bcrypt.hash(PASSWORD, 10);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "images";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now(); // 获取当前时间的毫秒级时间戳
    const newFilename = `${timestamp}.${file.originalname.split(".").pop()}`; // 生成文件名
    cb(null, newFilename);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/gif", "image/jpeg", "image/jpg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("不支持的文件类型。"), false);
    }
  }
});

// 中间件：检查请求的域名或主机名
const checkHost = (req, res, next) => {
  const host = req.headers.host; // 获取请求的主机名

  if (host === ALLOWED_HOST) {
    next(); // 允许请求继续
  } else {
    return res.status(403).json({ error: "禁止访问：仅允许特定域名上传。" });
  }
};

// 中间件：检查基本认证
const checkAuth = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    // 未提供认证信息，返回 401 状态码并提示浏览器弹出对话框
    res.set("WWW-Authenticate", "Basic realm=\"Admin Area\"");
    return res.status(401).json({ error: "未提供认证信息。" });
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
  const [username, password] = credentials.split(":");

  if (username === USERNAME && await bcrypt.compare(password, hashedPassword)) {
    next(); // 认证成功，继续请求
  } else {
    return res.status(403).json({ error: "认证失败。" });
  }
};

app.use(express.json()); // 解析 JSON 请求体

// 上传路由
app.post("/upload", checkHost, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "文件上传失败，请重试。" });
  }
  
  const data = `https://${URL_HOST}/images/${req.file.filename}`; // 使用 URL_HOST
  res.json({ data: data });
});

// 新的路由来处理 Bing 图片请求
app.get("/bing-images", async (req, res) => {
  try {
    const bingData = await handleBingImagesRequest();
    res.json(bingData);
  } catch (error) {
    res.status(500).json({ error: "获取 Bing 图片失败。" });
  }
});

// 获取 Bing 图片的函数
async function handleBingImagesRequest() {
  const response = await fetch(`https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=5`);
  const bingData = await response.json();
  const images = bingData.images.map(image => ({
    url: `https://cn.bing.com${image.url}`
  }));
  const returnData = {
    status: true,
    message: "操作成功",
    data: images
  };
  return returnData; // 直接返回数据
}

// 新的路由来获取图片列表
app.get("/imageslist", checkAuth, (req, res) => { // 添加 checkAuth 中间件
  const imagesDir = path.join(process.cwd(), "images");
  fs.readdir(imagesDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "无法读取图片目录。" });
    }
    // 过滤出图片文件
    const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/.test(file));
    const imageUrls = images.map(file => `https://${URL_HOST}/images/${file}`); // 使用 URL_HOST
    res.json(imageUrls);
  });
});

// 新的路由来获取特定图片
app.get("/images/:filename", (req, res) => {
  const filename = req.params.filename; // 从请求参数中获取文件名
  const filePath = path.join(process.cwd(), "images", filename); // 构建文件路径

  // 检查文件是否存在
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send("Not Found"); // 文件不存在，返回 404
    }
    res.sendFile(filePath); // 文件存在，发送文件
  });
});

// 删除图片的路由
app.delete("/delete-images", checkAuth, (req, res) => {
  const { filenames } = req.body; // 从请求体中获取文件名数组

  if (!Array.isArray(filenames) || filenames.length === 0) {
    return res.status(400).json({ error: "文件名是必需的。" });
  }

  const imagesDir = path.join(process.cwd(), "images");
  const deletePromises = filenames.map(filename => {
    const filePath = path.join(imagesDir, filename); // 构建文件路径
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err) {
          reject(`删除文件失败: ${filename}`);
        } else {
          resolve(`文件已删除: ${filename}`);
        }
      });
    });
  });

  Promise.all(deletePromises)
    .then(results => res.json({ message: results }))
    .catch(err => res.status(500).json({ error: err }));
});

// 路由：访问根目录时加载 index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "index.html")); // 发送 index.html 文件
});

// 路由：访问 ADMIN_PATH 时加载 admin.html
app.get(ADMIN_PATH, checkAuth, (req, res) => {
  res.sendFile(path.join(process.cwd(), "admin.html")); // 发送 admin.html 文件
});

// 路由：处理所有其他请求
app.get("*", (req, res) => {
  res.status(404).send("Not Found"); // 返回 404 错误
});

// 启动服务器
app.listen(PORT, "127.0.0.1", () => {
  console.log(`服务器正在运行在 http://127.0.0.1:${PORT}`);
});
