# Image Background Remover 网站 MVP 需求文档

## 1. 项目概述

### 1.1 项目名称
**Image Background Remover**

### 1.2 项目目标
开发一个极简的在线抠图网站，用户上传图片后，系统调用 Remove.bg API 自动去除背景，并返回透明背景 PNG 下载结果。

### 1.3 MVP 核心原则
- 快速上线
- 不做用户系统
- 不做图片存储
- 不做复杂编辑器
- 先验证需求、转化和成本

### 1.4 产品定位
一个专注于“图片去背景”的在线工具站，强调：
- 无需注册
- 不保存图片
- 操作简单
- 返回结果快

### 1.5 一句话定位
**Remove background from any image instantly. No signup, no storage, just clean transparent PNGs.**

---

## 2. 用户需求

### 2.1 目标用户
第一阶段面向以下用户：

#### A. 普通用户
- 想快速抠图
- 做头像、海报、社媒图
- 不想装软件

#### B. 电商卖家
- 想把商品图处理成白底图或透明底图
- 希望快速出图

#### C. 设计/运营人员
- 需要处理 logo、人物、产品素材
- 希望提升效率

### 2.2 用户核心痛点
1. 不会用 Photoshop
2. 抠图软件复杂
3. 只想快速拿到透明背景图
4. 不想注册账号
5. 不希望图片被长期保存
6. 想在线直接完成

### 2.3 用户核心诉求
- 上传图片后尽快看到结果
- 抠图结果清晰
- 下载方便
- 使用门槛低
- 安全、隐私友好

---

## 3. 产品目标

### 3.1 MVP 目标
上线一个可用的在线抠图工具，验证：
1. 用户是否愿意使用
2. 关键词是否有流量潜力
3. Remove.bg 成本是否可控
4. 免费工具是否能带来后续转化机会

### 3.2 本阶段不追求
- 多功能图像编辑
- 复杂商业系统
- 批量处理
- 账号体系
- 支付体系
- 历史记录保存

---

## 4. MVP 功能范围

### 4.1 必须功能

#### 4.1.1 图片上传
用户可上传本地图片文件。

**支持格式**
- JPG
- JPEG
- PNG
- WEBP

**限制**
- 最大文件大小：10MB
- 单次仅支持 1 张图片

#### 4.1.2 去背景处理
后端接收图片后，调用 Remove.bg API 进行背景移除。

**要求**
- 调用稳定
- 返回结果尽量快
- 对失败情况有错误提示

#### 4.1.3 结果展示
处理完成后，前端展示：
- 原图
- 去背景结果图
- 下载按钮

#### 4.1.4 下载结果
用户可下载处理后的透明 PNG。

**要求**
- 一键下载
- 下载文件命名清晰
- 下载前不要求登录

#### 4.1.5 基础错误处理
处理以下异常情况：
- 文件格式不支持
- 文件过大
- API 失败
- 额度不足
- 网络超时

#### 4.1.6 基础限流
防止滥用。

**MVP 方案**
- 按 IP 做简单限流
- 每个 IP 每天限制若干次（例如 3~10 次）
- 超出后提示稍后再试

### 4.2 可选但建议有

#### 4.2.1 拖拽上传
支持 drag & drop，提高体验。

#### 4.2.2 加载状态
用户点击上传后，显示：
- Processing...
- Removing background...

#### 4.2.3 FAQ 区块
帮助 SEO 和转化。

#### 4.2.4 隐私说明
突出“不保存图片”。

### 4.3 MVP 明确不做
以下功能不纳入第一版：
- 登录/注册
- 用户中心
- 图片历史记录
- 图片云存储
- 批量处理
- API 服务开放
- 支付/订阅
- 在线编辑器
- 背景替换
- 白底图二次生成
- 多语言支持
- 多模型路由

---

## 5. 用户流程

### 5.1 主流程
1. 用户打开首页
2. 用户上传图片
3. 系统校验格式和大小
4. 系统调用 Remove.bg API
5. 返回去背景结果
6. 页面展示结果图
7. 用户点击下载

### 5.2 异常流程
#### 文件不合法
- 提示：Unsupported format / File too large

#### API 调用失败
- 提示：Failed to remove background. Please try again later.

#### 超过限额
- 提示：Daily limit reached. Please try again tomorrow.

---

## 6. 页面需求

### 6.1 首页
**目标**：承接搜索流量，完成上传转化。

**页面模块**
1. Hero 标题
2. 上传区域
3. 使用说明
4. 优势说明
5. FAQ
6. SEO 文案区块

**Hero 文案建议**
- H1：Remove Background from Image Online
- 副标题：Upload an image and get a transparent PNG in seconds. No signup. No storage.
- 主按钮：Upload Image

### 6.2 结果页/结果区域
**包含内容**
- 原图预览
- 去背景图预览
- 下载按钮
- 再试一张按钮

**状态**
- 处理中
- 成功
- 失败

---

## 7. 技术方案

### 7.1 部署架构
- 前端：Cloudflare Pages
- 后端 API：Cloudflare Workers
- 抠图能力：Remove.bg API
- 存储：无
- 图片处理方式：内存中转

### 7.2 技术原则
- 无状态
- 不落盘
- 不保存原图与结果图
- 前端不暴露 Remove.bg API Key
- 所有第三方调用都通过 Worker 中转

### 7.3 API 设计
#### POST `/api/remove-background`
**请求**
- multipart/form-data
- 字段：`image_file`

**响应成功**
- 返回图片二进制流，格式为 `image/png`

**响应失败**
```json
{
  "error": "File too large"
}
```

### 7.4 环境变量
```env
REMOVE_BG_API_KEY=xxx
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW=86400
```

---

## 8. 非功能需求

### 8.1 性能
- 上传后应尽快进入处理状态
- 普通图片处理时间尽量控制在几秒内
- 前端首屏加载轻量

### 8.2 安全
- API Key 仅保存在服务端
- 不保存用户上传文件
- 限制文件类型和文件大小
- 增加基础限流，防止刷接口

### 8.3 隐私
- 不保存用户图片
- 图片仅在处理链路中短暂存在于内存
- 前端页面明确告知隐私策略

### 8.4 可维护性
- 前后端职责清晰
- API 错误结构统一
- 保留后续扩展支付/批量/API 的可能性

---

## 9. SEO 需求

### 9.1 主关键词
- image background remover
- remove background from image
- background remover online
- transparent background maker

### 9.2 首页 SEO
- Title：Image Background Remover – Remove Background Online
- Meta Description：Remove background from images instantly with our online background remover. No signup, no storage, fast transparent PNG export.
- H1：Remove Background from Image Online

### 9.3 内容需求
首页不能只有上传框，必须补充基础文字内容，包括：
- 工具说明
- 使用步骤
- 使用场景
- FAQ

否则页面过薄，不利于 SEO。

---

## 10. 运营与数据指标

### 10.1 MVP 关键指标
**使用指标**
- UV
- 上传次数
- 成功处理次数
- 下载次数

**漏斗指标**
- 首页访问 → 上传率
- 上传 → 处理成功率
- 处理成功 → 下载率

**成本指标**
- 单次调用成本
- 每日调用成本
- 滥用比例

### 10.2 埋点建议
记录但不存图片：
- 上传次数
- 上传失败原因
- API 成功/失败
- 下载按钮点击次数
- 限流触发次数

---

## 11. 风险与约束

### 11.1 核心风险
1. Remove.bg 成本偏高
2. 免费用户可能恶意刷接口
3. Cloudflare 上传与执行限制
4. 通用词竞争激烈
5. 仅单功能可能转化偏低

### 11.2 应对方案
- 严格限流
- 限制文件大小
- 做好错误提示
- 强化“不存储 + 快速 + 无注册”卖点
- 后续扩展长尾落地页

---

## 12. 后续迭代方向

### Phase 2
- 白底图生成
- 换背景颜色
- 更多 SEO 落地页
- 更好的 before/after 效果展示

### Phase 3
- 登录/额度系统
- 支付
- 高清下载
- 批量处理
- API 服务

### Phase 4
- 电商场景模板
- 证件照场景
- Logo 处理场景
- 多语言版本

---

## 13. 开发任务拆分建议

### 前端
- 首页 UI
- 上传组件
- 加载态
- 结果展示
- 下载交互
- FAQ 和 SEO 内容

### 后端
- 上传处理接口
- 调用 Remove.bg API
- 错误处理
- 限流逻辑

### 部署
- Cloudflare Pages
- Workers 配置
- 环境变量注入

### 验证
- 图片格式测试
- 超大文件测试
- API 报错测试
- 限流测试
- 下载测试

---

## 14. 验收标准

MVP 完成的标准：
1. 用户能上传图片
2. 系统能调用 Remove.bg 成功去背景
3. 用户能看到处理结果
4. 用户能下载透明 PNG
5. 图片不落盘、不保存
6. API Key 不暴露前端
7. 有基础限流
8. 页面具备基础 SEO 内容
9. Cloudflare 部署可用
10. 主要异常场景可处理

---

## 15. 最终结论

这个 MVP 的本质不是“做一个复杂 AI 产品”，而是：

> **用最轻架构验证一个高频工具需求。**

所以第一版最重要的不是功能多，而是：
- 上传顺
- 处理快
- 下载稳
- 不存图
- 成本可控
