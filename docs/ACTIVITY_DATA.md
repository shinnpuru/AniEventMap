# 活动数据维护

编辑 `src/data/events.json`，实际字段约束以 [src/data.ts](../src/data.ts) 为准。顶层包含 works、events 和 updatedAt。

## 作品

每条作品包含 id、name、originalName、bangumiId、color。复用已有条目；新增时核对 Bangumi 的名称、条目类型和 ID。游戏活动关联游戏本体，不误用动画或原声。id 使用稳定英文标识。

联动可关联多个已核实作品。没有 Bangumi 条目的联动 IP 可以保留在标题，不伪造 ID；完全没有可确认作品关联时，先作为待核实线索提交。

## 活动字段

| 字段                                      | 约定                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| id                                        | 稳定唯一，通常 bilibili-项目ID、damai-商品ID、maoyan-项目ID；更新不改 ID        |
| title, workIds                            | 活动名称及已有作品 ID 数组，至少关联一项                                        |
| type                                      | 展览、快闪、演出、同人Only                                                      |
| city, district                            | 城市和区，如上海、黄浦区；城市名称保持一致                                      |
| startDate, endDate                        | YYYY-MM-DD，含首尾日；采用活动期，不是售票期                                    |
| hours, sessionNote                        | 每日营业时间或场次，sessionNote 可选；未知时间可将 hours 留空                   |
| timezone                                  | 当前只支持 Asia/Shanghai                                                        |
| status                                    | scheduled、cancelled、postponed；结束状态由日期判断                             |
| venue, floor, address                     | 场馆、楼层或展厅、完整地址；未知楼层可留空                                      |
| coordinates                               | system 为 GCJ-02 或 WGS84，lng 经度、lat 纬度                                   |
| price, priceMax                           | 人民币元，最低价及可选最高价；最高价不低于最低价，免费才填 0                    |
| priceUnit, reservation                    | 可选；按桌预约使用 priceUnit 为桌预约、reservation 为 true                      |
| poster, banner, posterAlt                 | 官方或票务图片 HTTPS 地址；banner 可复用 poster；posterAlt 可选                 |
| source                                    | name、url、verifiedAt 必填，api 和 evidence 可选，记录来源及核验依据            |
| priceNote, description, highlights, notes | 当前结构要求保留；未使用时填空字符串或空数组，事实差异可存 notes，不新增冗余 UI |

anniversary、heroLabel 为兼容旧数据的可选字段，新活动无需填写。更新数据集 updatedAt 和本次核实条目的 source.verifiedAt，不修改未核实条目的日期。

## 核实

- 优先活动官网、主办方公告及票务详情，保留具体来源链接，去掉跟踪参数及误带的标点。
- 会员购公开接口：`https://show.bilibili.com/api/ticket/project/getV2?id=<项目ID>`。检查返回成功；接口可能变化，不假定长期可用。
- 会员购 price_low、price_high 和票种价格以分计，入库除以 100。start_time、end_time 为秒级时间戳，按上海时区解释。
- cover 以 // 开头时补 https:。采用活动主图，不用场馆底图替代海报。
- screen_list 可能只返回单日或可售场次，不能据此缩短活动期。区分点餐时间和用餐时长、免费券和未知价格、按桌预约和单人门票。
- 会员购坐标类型 GD 对应 GCJ-02，保存原坐标；前端转换为 WGS84，不重复转换。
- 同场馆沿用已核实的相同坐标以便分组，不把相似名称或同一城市视为同址。
- 来源有冲突时寻找更明确、更新的活动说明，并记录证据及取舍。关键冲突无法确认时留待用户或维护者核实，不猜测。截图来源标注为截图核验。
- 必填事实无法确认时，不向生产数据填占位值。草稿 PR 仅提交已核实的数据变更，待补项放 PR 正文，不创建核验文档，不填占位活动。

## 验证

投稿者只需检查 JSON 字段、重复活动、作品关联、坐标、海报、分类、时间及价格单位，无需安装环境或执行命令。PR 的 GitHub Actions 自动运行测试和构建；检查失败时只修正数据，不更改校验规则。

维护者进行本地开发时，可按 DEVELOPMENT.md 运行检查；这不是活动投稿的前提。
