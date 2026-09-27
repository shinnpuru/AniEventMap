import { describe, it, expect } from "vitest";
import {
  dataset,
  eventStatus,
  dateMatches,
  mapCoordinates,
  shanghaiDate,
} from "./data";
const e = dataset.events[0];
describe("活动数据与日期", () => {
  it("核验样例与作品关联", () => {
    expect(e.id).toBe("bilibili-1005507");
    expect(dataset.works[0].bangumiId).toBe(9717);
  });
  it("按上海日期计算展期，包含首尾日", () => {
    expect(shanghaiDate(new Date("2026-09-22T16:00:00Z"))).toBe("2026-09-23");
    expect(eventStatus(e, "2026-09-22")).toBe("即将开始");
    expect(eventStatus(e, "2026-11-01")).toBe("展期中");
    expect(eventStatus(e, "2026-11-02")).toBe("已结束");
  });
  it("取消与延期优先于日期", () => {
    expect(eventStatus({ ...e, status: "cancelled" }, "2026-09-27")).toBe(
      "已取消",
    );
    expect(
      dateMatches({ ...e, status: "postponed" }, "today", "2026-09-27"),
    ).toBe(false);
  });
  it("周末筛选使用区间交集，包括周日", () => {
    expect(dateMatches(e, "weekend", "2026-09-21")).toBe(true);
    expect(dateMatches(e, "weekend", "2026-11-01")).toBe(true);
    expect(dateMatches(e, "weekend", "2026-11-02")).toBe(false);
  });
  it("将来源高德坐标转换到上海新世界城附近", () => {
    const [lng, lat] = mapCoordinates(e.coordinates);
    expect(lng).toBeCloseTo(121.46914, 3);
    expect(lat).toBeCloseTo(31.23704, 3);
    expect(mapCoordinates({ system: "WGS84", lng: 120, lat: 30 })).toEqual([
      120, 30,
    ]);
  });
});
