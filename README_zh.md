# GestureInteraction 手势交互粒子系统

一个基于 Web 的增强现实（AR）粒子交互系统，通过手势识别控制 3D 粒子效果。
使用 MediaPipe Hands 进行实时手势检测，Three.js 渲染 3D 粒子动画，支持多种手势控制不同的粒子形状。

## ✨ 主要特性

### 🎮 手势识别与控制
- **实时手势检测**：基于 MediaPipe Hands 的实时手部追踪
- **5 种手势模式**：
  - ✋ **张开手掌** → 球体粒子
  - ✊ **握拳** → 圆环粒子
  - ✌️ **剪刀手（V字）** → "I LOVE WORLD" 文字粒子
  - 👆 **单指指向** → 星形粒子
  - 👍 **竖拇指** → 爱心粒子
  - 可继续拓展

### 🎨 视觉效果
- **Vision Pro 风格物理系统**：丝滑的粒子跟随效果
- **彩虹粒子效果**：动态渐变色粒子
- **三段式磁力吸附**：手部与粒子的自然交互
- **深度感知**：3D 空间中的手部位置追踪
- **遮挡模拟**：手部遮挡粒子时的淡出效果
- **自适应粒子数量**：根据设备性能自动调整

### 📱 功能特性
- **前后摄像头切换**：自动检测并支持多摄像头切换
- **HTTPS 安全连接**：使用自签证书，支持一键下载安装
- **二维码分享**：自动生成访问二维码，方便其他设备扫码
- **调试面板**：实时显示手势状态、位置、速度等调试信息
- **演示模式**：无摄像头时自动进入演示模式
- **响应式设计**：完美适配桌面端、平板和移动设备

## 🚀 快速开始

### 环境要求

- Python 3.8+
- 浏览器（支持 WebGL 和 MediaDevices API）
- 摄像头设备（可选，无摄像头将进入演示模式）

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd GestureInteraction
   ```

2. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

3. **准备 SSL 证书**
   
   在 `ssl/` 目录下放置以下文件：
   - `server.crt` - SSL 证书文件
   - `server.key` - SSL 私钥文件
   
   > **提示**：可以使用 OpenSSL 生成自签证书：
   > ```bash
   > openssl req -x509 -newkey rsa:4096 -nodes -keyout ssl/server.key -out ssl/server.crt -days 365
   > ```

4. **启动服务**
   ```bash
   python app.py
   ```

5. **访问应用**
   
   服务启动后会自动打开浏览器，访问地址为：
   ```
   https://<your-local-ip>:5001
   ```
   
   首次访问时，浏览器会提示证书不安全，需要：
   - 点击"下载证书"按钮下载证书
   - 安装证书到系统信任列表
   - 刷新页面即可正常访问

## 📖 使用说明

### 基本操作

1. **允许摄像头权限**
   - 首次访问时，浏览器会请求摄像头权限
   - 点击"允许"以启用手势识别功能

2. **手势控制**
   - 将手放在摄像头前
   - 做出不同的手势来切换粒子形状
   - 移动手部，粒子会跟随手部位置

3. **摄像头切换**
   - 如果设备有多个摄像头，右上角会显示切换按钮
   - 点击"前置相机"或"后置相机"进行切换

4. **调试信息**
   - 点击"调试面板"按钮查看实时调试信息
   - 包括手势状态、位置坐标、速度等

### 手势说明

| 手势 | 效果 | 说明 |
|------|------|------|
| ✋ 张开手掌（5指） | 球体 | 所有手指都张开 |
| ✊ 握拳（0指） | 圆环 | 所有手指都收起 |
| ✌️ 剪刀手（2指） | 文字 | 食指和中指张开 |
| 👆 单指指向 | 星形 | 只有食指张开 |
| 👍 竖拇指 | 爱心 | 只有拇指张开 |

### 功能按钮

- **测试摄像头**：测试摄像头是否可用
- **调试面板**：显示/隐藏调试信息面板
- **下载证书**：下载 HTTPS 自签证书（仅在检测到摄像头时显示）
- **前置/后置相机**：切换摄像头（仅在检测到多个摄像头时显示）

## 🏗️ 项目结构

```
GestureInteraction/
├── app.py                    # Flask 后端入口
├── requirements.txt          # Python 依赖
├── README_en.md              # 英文文档
├── README_zh.md              # 中文文档
├── tools/                    # 工具目录
│   ├── utils.py              # 工具函数（获取本地IP等）
│   ├── gsignature.py         # 证书签名工具
│   └── svgtool.py            # SVG 处理工具
├── ssl/                      # SSL 证书目录
│   ├── server.crt            # SSL 证书（需手动生成）
│   └── server.key            # SSL 私钥（需手动生成）
├── static/                   # 静态资源
│   ├── gicss/                # CSS 样式文件
│   │   └── styles.css
│   ├── gijss/                # JavaScript 模块
│   │   ├── config.js         # 配置和全局状态
│   │   ├── particleSystem.js # 粒子系统和物理引擎
│   │   ├── gestureHandling.js # 手势识别和摄像头管理
│   │   ├── glhand3D.js       # 3D 手部工具函数
│   │   ├── debug.js          # 调试工具
│   │   └── modelLoader.js    # 3D 模型加载器
│   ├── giimg/                # 图片资源
│   │   └── c_dragon.jpg
│   └── giresource/           # 资源文件
│       └── favicon.ico
└── templates/                # HTML 模板
    └── index.html            # 主页面
```

> **注意**：第三方库（MediaPipe、Three.js）通过 CDN 在 `index.html` 中加载。

### 📦 代码模块说明

- **config.js** - 配置模块
  - 所有配置常量和参数定义
  - 全局状态变量声明
  - 工具函数（加载提示、流管理等）

- **particleSystem.js** - 粒子系统模块
  - Three.js 场景初始化和渲染
  - 粒子系统创建和批量加载
  - 多种形状生成器（球体、圆环、星形、爱心、文字、龙等）
  - 物理更新和动画循环
  - 彩虹粒子效果

- **gestureHandling.js** - 手势处理模块
  - MediaPipe 手势识别初始化
  - 摄像头检测和切换
  - 手势识别算法和稳定性处理
  - 演示模式
  - 调试面板和健康检查
  - 应用主入口

- **glhand3D.js** - 3D 手部工具函数
  - 手部关键点处理
  - 3D 坐标转换

- **debug.js** - 调试工具
  - 性能监控
  - 调试面板管理

- **modelLoader.js** - 3D 模型加载器
  - 3D 模型加载和处理

## 🔧 技术栈

### 后端
- **Flask 3.13.2** - Python Web 框架
- **qrcode 8.0** - 二维码生成
- **Pillow 12.0.0** - 图像处理
- **SSL/TLS** - HTTPS 安全连接（自签证书）

### 前端
- **Three.js 0.149.0** - 3D 图形渲染引擎
- **MediaPipe Hands** - 实时手势识别框架
- **WebGL** - 硬件加速 3D 渲染
- **MediaDevices API** - 摄像头访问和流管理
- **ES6+ JavaScript** - 模块化代码组织

### 架构设计
- **模块化设计** - 代码拆分为配置、粒子系统、手势处理三个模块
- **响应式布局** - 自适应不同屏幕尺寸
- **性能优化** - 自动检测设备性能并调整参数
- **错误处理** - 完善的错误捕获和恢复机制

## ⚙️ 配置说明

### 端口配置

默认端口为 `5001`，可在 `app.py` 中修改：

```python
app.run(
    host=use_local_ip,
    port=5001,  # 修改此处
    ...
)
```

### 粒子数量配置

在 `static/gijss/config.js` 中可以调整粒子相关参数：

```javascript
const PARTICLE_COUNT = 9000;      // 粒子数量（自适应）
const PARTICLE_SIZE = 0.1;         // 粒子大小
const EXPLOSION_FORCE = 2.0;       // 爆炸力度
const RETURN_SPEED = 0.08;        // 回位速度
const DAMPING = 0.92;              // 阻尼系数
const DEPTH_PUSH_STRENGTH = 0.18;  // 深度推力强度
```

### 手势识别配置

在 `static/gijss/config.js` 中可以调整手势识别参数：

```javascript
const GESTURE_STABILITY_FRAMES = 3;  // 手势稳定性帧数
const HAND_SMOOTHING = 0.35;          // 手部移动平滑度
const FOLLOW_STIFFNESS = 2.0;         // 跟随刚度
const FOLLOW_DAMPING = 0.80;          // 跟随阻尼
const MAX_SPEED = 0.4;                // 最大跟随速度
```

### 性能优化

系统会根据设备性能自动调整：
- 低性能设备（≤4 核心）：粒子数量减少 45%
- 响应式粒子数量：根据屏幕宽度自动调整
- 批量加载：粒子分批加载，避免卡顿

## 🐛 故障排除

### 证书问题

**问题**：浏览器提示"您的连接不是私密连接"

**解决**：
1. 点击"下载证书"按钮
2. 安装证书到系统信任列表
3. 刷新页面

### 摄像头问题

**问题**：无法访问摄像头

**解决**：
1. 检查浏览器权限设置
2. 确保摄像头未被其他应用占用
3. 如果无摄像头，系统会自动进入演示模式

### 性能问题

**问题**：页面卡顿或帧率低

**解决**：
1. 关闭其他占用资源的应用
2. 降低浏览器标签页数量
3. 系统会自动降级粒子数量

## 📝 开发说明

### 代码结构

项目采用模块化设计，便于维护和扩展：

- **config.js** - 集中管理所有配置和全局状态
- **particleSystem.js** - 独立的粒子系统模块，易于添加新形状
- **gestureHandling.js** - 手势识别和业务逻辑，易于扩展新功能

### 添加新手势

1. **在 `gestureHandling.js` 中添加手势识别逻辑**

   在 `recognizeGesture()` 函数中添加新的手势识别：

   ```javascript
   function recognizeGesture(landmarks) {
       // ... 现有代码 ...
       
       // 添加新手势
       if (/* 新手势条件 */) {
           return 'newShape';
       }
   }
   ```

2. **在 `particleSystem.js` 中添加形状生成函数**

   ```javascript
   function generateNewShape() {
       for (let i = 0; i < PARTICLE_COUNT; i++) {
           // 计算新形状的坐标
           targets[i * 3] = /* x坐标 */;
           targets[i * 3 + 1] = /* y坐标 */;
           targets[i * 3 + 2] = /* z坐标 */;
       }
   }
   ```

3. **在 `gestureHandling.js` 中注册新形状**

   在 `onHandsResults()` 函数的 switch 语句中添加：

   ```javascript
   switch (stableGesture) {
       // ... 现有case ...
       case 'newShape': generateNewShape(); break;
   }
   ```

   在 `enterDemoMode()` 函数中也添加相同的 case。

### 修改物理参数

物理参数集中在 `config.js` 中，可以轻松调整：

- `RETURN_SPEED` - 控制粒子回到目标形状的速度
- `DAMPING` - 控制粒子的惯性衰减
- `FOLLOW_STIFFNESS` - 控制粒子跟随手部的响应速度
- `FOLLOW_DAMPING` - 控制跟随的平滑度

### 自定义样式

修改 `static/gicss/styles.css` 可以自定义界面样式，包括：
- 按钮颜色和大小
- 调试面板样式
- QR 码容器样式
- 响应式断点
- 加载动画效果

### 性能优化建议

1. **粒子数量调整**：在 `config.js` 中修改 `getResponsiveParticleCount()` 函数
2. **批量加载**：调整 `BATCH_SIZE` 参数控制加载速度
3. **低性能设备**：系统会自动检测并降级粒子数量（减少45%）
4. **彩虹效果**：在低性能设备上自动降低更新频率

### 调试技巧

- 使用调试面板查看实时状态信息
- 检查浏览器控制台的错误信息
- 使用 `debugEnabled` 变量控制调试面板显示
- 查看 `lastError` 变量获取最新错误信息

## 🔄 更新日志

### v2.0 - 代码重构（最新）
- ✨ **模块化拆分**：将 `app.js`（1255行）拆分为三个模块
  - `config.js` - 配置和全局状态管理
  - `particleSystem.js` - 粒子系统和物理引擎
  - `gestureHandling.js` - 手势识别和业务逻辑
- 🎯 **代码组织优化**：提高可维护性和可扩展性
- 📝 **文档更新**：完善开发说明和配置指南

### v1.0 - 初始版本
- 🎮 基础手势识别功能
- 🎨 5种粒子形状效果
- 📱 响应式设计
- 🔒 HTTPS 安全连接

## 📄 许可证

本项目采用 MIT 许可证。

## 🙏 致谢

- [Three.js](https://threejs.org/) - 3D图形库
- [MediaPipe](https://mediapipe.dev/) - Google的手势识别框架
- [Flask](https://flask.palletsprojects.com/) - 轻量级 Python Web 框架
- [qrcode](https://github.com/lincolnloop/python-qrcode) - Python 二维码生成库

---

**享受手势交互的乐趣！** 🎉

> 💡 **提示**：项目采用模块化设计，便于二次开发和功能扩展。建议在修改代码前先阅读代码结构说明。


