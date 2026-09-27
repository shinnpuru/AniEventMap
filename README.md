# AniEventMap

上海二次元活动地图。按作品、日期和活动类型发现展览、快闪与演出。

**网站：https://shinnpuru.github.io/AniEventMap/**

## 开发

Node.js 22+。

```sh
npm ci
npm run dev
npm test
npm run build
```

本地地址：http://127.0.0.1:5173/AniEventMap/

## 当前功能

- 上海交互地图与场馆标记，移动端列表/地图切换。
- 作品、日期、类型及关键词筛选，空状态提示。
- 活动详情、Bangumi 关联、会员购来源、高德地点跳转。
- 本地收藏、可分享且刷新可恢复的活动链接。
- 上海时区的日期计算，区分展期与营业时间。
- GitHub Actions 校验、构建及 Pages 部署。

静态版本，不包含投稿服务、自动审核、实时票务库存或账户同步。

## 数据维护

编辑 `src/data/events.json`。每个活动必须保留稳定 ID、作品关联、日期、地点、坐标系、来源 URL 和核实时间。`src/data.ts` 使用 Zod 验证数据；测试覆盖日期边界、周末和坐标转换。

首个活动根据 [哔哩哔哩会员购](https://show.bilibili.com/platform/detail.html?id=1005507) 及该页面公开数据接口，于 2026-09-27 核实。作品对应 [Bangumi 9717](https://bgm.tv/subject/9717)。当前数据为快照，票价、营业时间、入场安排以来源最新公告为准。活动海报通过来源地址展示，图像与作品版权归原权利人，不属于本项目代码授权。

会员购的 `GD` 坐标保存为 GCJ-02，展示在 OSM 地图前迭代转换为 WGS84；跳转高德时使用原始坐标。转换存在小量误差，具体入口以场馆说明为准。

## 地图

MapLibre GL JS + OpenStreetMap 标准栅格瓦片，无需 Key。保留可见版权标识，使用正常浏览器缓存，无离线预下载。适用于小规模原型，公共瓦片不保证可用性；用户增长时应改用合适的托管服务。

可在 `.env.local`（不提交）或构建环境设置：

```env
VITE_TILE_URL=https://your-provider.example/{z}/{x}/{y}.png
VITE_TILE_ATTRIBUTION=Your provider attribution
```

注意 `VITE_*` 会进入公开前端产物，只能放公开配置，不能放私密 Token。瓦片遵循 https://operations.osmfoundation.org/policies/tiles/ 。

## 部署

仓库 Settings → Pages → Source 选择 **GitHub Actions**。推送到 `main` 后先测试、构建，通过后部署。Vite 的 `base` 已设置为 `/AniEventMap/`。无需服务端，也不需要把构建产物提交到仓库。

## 后续

网页投稿 → 轻量投稿接口 → GitHub Issue → Agent 核实 → 数据 PR → Pages 发布。当前仅保留 GitHub 反馈入口，不声称已实现投稿审核。
