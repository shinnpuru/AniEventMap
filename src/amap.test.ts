import { describe, expect, it, vi } from "vitest";
import { amapPositions, type AMapSDK } from "./amap";
import { dataset } from "./data";

describe("高德坐标", () => {
  it("来源 GCJ-02 坐标直接使用，不进行二次偏移", async () => {
    const sdk = { convertFrom: vi.fn() } as unknown as AMapSDK;
    const event = dataset.events[0];
    const positions = await amapPositions(sdk, [event]);
    expect(positions.get(event.id)).toEqual([
      event.coordinates.lng,
      event.coordinates.lat,
    ]);
    expect(sdk.convertFrom).not.toHaveBeenCalled();
  });
  it("混合来源仅将 WGS84 坐标交给高德转换", async () => {
    const sdk = {
      convertFrom: vi.fn((points, type, callback) => {
        expect(points).toEqual([[121.46914, 31.23704]]);
        expect(type).toBe("gps");
        callback("complete", {
          locations: [{ getLng: () => 121.473671, getLat: () => 31.235113 }],
        });
      }),
    } as unknown as AMapSDK;
    const event = {
      ...dataset.events[0],
      id: "gps",
      coordinates: { system: "WGS84" as const, lng: 121.46914, lat: 31.23704 },
    };
    const positions = await amapPositions(sdk, [dataset.events[0], event]);
    expect(positions.get("gps")).toEqual([121.473671, 31.235113]);
    expect(positions.size).toBe(2);
  });
  it("转换失败时不把 WGS84 原坐标错误标记到高德", async () => {
    const sdk = {
      convertFrom: vi.fn((_points, _type, callback) => callback("error", {})),
    } as unknown as AMapSDK;
    await expect(
      amapPositions(sdk, [
        {
          ...dataset.events[0],
          coordinates: { system: "WGS84", lng: 120, lat: 30 },
        },
      ]),
    ).rejects.toThrow("坐标转换失败");
  });
});
