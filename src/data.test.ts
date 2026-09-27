import { describe, it, expect } from "vitest";
import {
  dataset,
  eventStatus,
  dateMatches,
  mapCoordinates,
  shanghaiDate,
  groupByVenue,
  compareEvents,
  formatPrice,
  validDateRange,
} from "./data";
const e = dataset.events[0];
describe("活动数据与日期", () => {
  it("最近七天包含今天及后六天的在展活动，支持跨年", () => {
    const today = "2026-12-29";
    const matches = (startDate: string, endDate: string) =>
      dateMatches({ ...e, startDate, endDate }, "next7", today);
    expect(matches("2026-12-01", "2026-12-29")).toBe(true);
    expect(matches("2027-01-04", "2027-01-04")).toBe(true);
    expect(matches("2026-12-01", "2027-02-01")).toBe(true);
    expect(matches("2026-12-01", "2026-12-28")).toBe(false);
    expect(matches("2027-01-05", "2027-01-06")).toBe(false);
    expect(
      dateMatches({ ...e, status: "cancelled" }, "next7", e.startDate),
    ).toBe(false);
    expect(
      dateMatches({ ...e, status: "postponed" }, "next7", e.startDate),
    ).toBe(false);
  });
  it("自定义范围包含交集及首尾日，排除无效范围和取消活动", () => {
    const event = { ...e, startDate: "2026-12-30", endDate: "2027-01-03" };
    for (const range of [
      { start: "2027-01-03", end: "2027-01-03" },
      { start: "2026-12-01", end: "2026-12-30" },
      { start: "2026-01-01", end: "2027-12-31" },
    ]) {
      expect(dateMatches(event, "custom", "2026-09-27", range)).toBe(true);
    }
    expect(
      dateMatches(event, "custom", "2026-09-27", {
        start: "2027-01-04",
        end: "2027-01-05",
      }),
    ).toBe(false);
    for (const range of [
      { start: "", end: "" },
      { start: "2026-02-30", end: "2026-03-01" },
      { start: "2027-01-03", end: "2026-12-30" },
    ])
      expect(validDateRange(range)).toBe(false);
    expect(
      dateMatches({ ...event, status: "cancelled" }, "custom", "2026-09-27", {
        start: "2026-12-30",
        end: "2027-01-03",
      }),
    ).toBe(false);
  });
  it("按起售价和结束日期排序，统一价格显示", () => {
    const events = [
      {
        ...e,
        id: "a",
        price: 80,
        startDate: "2026-09-01",
        endDate: "2026-12-01",
      },
      {
        ...e,
        id: "b",
        price: 0,
        startDate: "2026-10-01",
        endDate: "2026-10-02",
      },
      {
        ...e,
        id: "c",
        price: 30,
        startDate: "2026-11-01",
        endDate: "2026-11-02",
      },
    ];
    expect(
      [...events]
        .sort((a, b) => compareEvents(a, b, "price-asc"))
        .map((e) => e.id),
    ).toEqual(["b", "c", "a"]);
    expect(
      [...events]
        .sort((a, b) => compareEvents(a, b, "price-desc"))
        .map((e) => e.id),
    ).toEqual(["a", "c", "b"]);
    expect(
      [...events].sort((a, b) => compareEvents(a, b, "end")).map((e) => e.id),
    ).toEqual(["b", "c", "a"]);
    expect(
      [...events].sort((a, b) => compareEvents(a, b, "start")).map((e) => e.id),
    ).toEqual(["a", "b", "c"]);
    expect(formatPrice(0)).toBe("免费");
    expect(formatPrice(30)).toBe("30元起");
    expect(formatPrice(69.9)).toBe("69.9元起");
  });
  it("同址活动合并为场馆组，筛选后可恢复单活动标记", () => {
    const pair = [e, { ...e, id: "same-venue" }];
    expect(groupByVenue(pair)).toHaveLength(1);
    expect(groupByVenue(pair)[0]).toHaveLength(2);
    expect(
      groupByVenue([
        ...pair,
        { ...e, coordinates: { system: "WGS84", lng: 116.4, lat: 39.9 } },
      ]),
    ).toHaveLength(2);
    const eva = dataset.events.find((e) => e.id === "maoyan-497705")!;
    expect(groupByVenue([eva])[0]).toEqual([eva]);
    expect(dateMatches(eva, "today", "2027-01-03")).toBe(true);
    expect(dateMatches(eva, "today", "2027-01-04")).toBe(false);
    expect(eva.sessionNote).toBeUndefined();
  });
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
