# 开发与部署

## 本地运行

使用 Node.js 22+，在仓库根目录执行：

```sh
npm ci
npm run dev
```

本地地址：http://127.0.0.1:5173/ 。验证：

```sh
npm test
npm run build
git diff --check
```

## 结构

- `src/App.tsx`：侧栏、筛选、收藏、活动详情与分享。
- `src/MapView.tsx`：地图来源切换；`src/AMapView.tsx`、`src/OSMMapView.tsx` 分别实现高德和 OSM 地图；`src/amap.ts` 负责高德加载及坐标转换。
- `src/style.css`：桌面和移动端样式。
- `src/data/events.json`：作品与活动数据。
- `src/data.ts`：Zod 校验、日期筛选与坐标转换。
- `src/data.test.ts`：日期边界、分组与坐标转换测试。
- `.github/workflows/deploy.yml`：验证、构建及 Pages 发布。

技术栈为 React、TypeScript、Vite、MapLibre GL JS、Zod 和 Vitest。版本以 package.json 和锁文件为准。

数据维护见 [活动数据文档](docs/ACTIVITY_DATA.md)，Agent 投稿见 [SKILL.md](SKILL.md)。新增类别需同步更新数据枚举和界面筛选，并检查窄屏布局；只新增活动无需修改界面。

## 约定

全屏地图，侧栏默认收起，同址多活动缩略图横向排列，悬停或键盘聚焦显示标题。地区由数据生成，不绑定上海。保持界面简洁，避免营销文案、票价免责声明和冗长入场须知；价格统一为“xx元起”或“免费”，保留场次和预约入口。

日期当前统一采用 Asia/Shanghai。收藏仅保存在浏览器，深链接使用 `#event=<id>`。没有服务端、账户同步或自动投稿审核服务。

## 地图

配置高德凭证后默认使用高德 JS API 2.0，可在地图外观中切换至 OpenStreetMap；未配置凭证时使用 OSM（包括不提供 Secrets 的外部 PR 构建）。

在 GitHub 仓库 Settings → Secrets and variables → Actions 添加 `AMAP_KEY` 和 `AMAP_SECURITY_CODE`，部署工作流分别注入 `VITE_AMAP_KEY`、`VITE_AMAP_SECURITY_CODE`。更换 Secret 后需重新运行部署。高德控制台配置域名白名单 `map.shinnpuru.site`。本地开发在被 Git 忽略的 `.env.local` 中设置上述两个 `VITE_` 变量；不要提交实际值。

当前为用户选定的纯静态直连方案：两个凭证都会进入公开前端产物。GitHub Secrets 保护源码及构建日志，不隐藏浏览器中的值。若以后需要隐藏安全密钥，改为服务端代理。

高德直接使用数据中的 GCJ-02 坐标，WGS84 通过高德转换；OSM 使用 WGS84。高德密度通过背景、道路、兴趣点及建筑图层开关控制，主题使用官方样式。

OSM 使用栅格瓦片。保留可见版权标识，正常使用浏览器缓存，不做离线批量预下载。公共瓦片不保证可用性，扩大规模时需选择合适的托管服务。

可在 `.env.local` 或构建环境设置：

```env
VITE_TILE_URL=https://your-provider.example/{z}/{x}/{y}.png
VITE_TILE_ATTRIBUTION=Your provider attribution
```

VITE_* 会进入公开前端产物，不要将需要保密的服务端凭证放入这些变量。遵循 [OSM 瓦片政策](https://operations.osmfoundation.org/policies/tiles/)。

## 发布

仓库 Settings → Pages → Source 选择 GitHub Actions。PR 运行测试和构建；合并到 main 后才部署 Pages。贡献者通过 PR 投稿，不直接推送主分支。

自定义域名为 `map.shinnpuru.site`，Vite base 为 `/`。`public/CNAME` 在构建时自动复制到 `dist/CNAME`，随 Pages 产物一起上传。更换域名时同步更新此文件、仓库 Pages 自定义域名设置及 DNS；CNAME 文件本身不会配置 DNS。不要提交 dist、node_modules、本地抓取文件或凭证。
