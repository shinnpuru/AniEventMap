# 开发与部署

## 本地运行

使用 Node.js 22+，在仓库根目录执行：

```sh
npm ci
npm run dev
```

本地地址：http://127.0.0.1:5173/AniEventMap/ 。验证：

```sh
npm test
npm run build
git diff --check
```

## 结构

- `src/App.tsx`：侧栏、筛选、收藏、活动详情与分享。
- `src/MapView.tsx`：地图、同址分组与定位。
- `src/style.css`：桌面和移动端样式。
- `src/data/events.json`：作品与活动数据。
- `src/data.ts`：Zod 校验、日期筛选与坐标转换。
- `src/data.test.ts`：日期边界、分组与坐标转换测试。
- `.github/workflows/deploy.yml`：验证、构建及 Pages 发布。

技术栈为 React、TypeScript、Vite、MapLibre GL JS、Zod 和 Vitest。版本以 package.json 和锁文件为准。

数据维护见 [活动数据文档](docs/ACTIVITY_DATA.md)，Agent 投稿见 [AGENT.md](AGENT.md)。新增类别需同步更新数据枚举和界面筛选，并检查窄屏布局；只新增活动无需修改界面。

## 约定

全屏地图，侧栏默认收起，同址多活动默认折叠。地区由数据生成，不绑定上海。保持界面简洁，避免营销文案、票价免责声明和冗长入场须知；保留价格单位、场次和预约入口等有效信息。

日期当前统一采用 Asia/Shanghai。收藏仅保存在浏览器，深链接使用 `#event=<id>`。没有服务端、账户同步或自动投稿审核服务。

## 地图

默认使用 OpenStreetMap 栅格瓦片。保留可见版权标识，正常使用浏览器缓存，不做离线批量预下载。公共瓦片不保证可用性，扩大规模时需选择合适的托管服务。

可在 `.env.local` 或构建环境设置：

```env
VITE_TILE_URL=https://your-provider.example/{z}/{x}/{y}.png
VITE_TILE_ATTRIBUTION=Your provider attribution
```

VITE_* 会进入公开前端产物，不能存放私密凭证。遵循 [OSM 瓦片政策](https://operations.osmfoundation.org/policies/tiles/)。

## 发布

仓库 Settings → Pages → Source 选择 GitHub Actions。PR 运行测试和构建；合并到 main 后才部署 Pages。贡献者通过 PR 投稿，不直接推送主分支。

Vite base 为 `/AniEventMap/`，更换部署路径时同步调整。不要提交 dist、node_modules、本地抓取文件或凭证。
