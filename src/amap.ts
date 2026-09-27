import type { EventInfo } from "./data";

export type Position = [number, number];
export interface AMapMarker {
  setMap(map: AMapInstance | null): void;
}
export interface AMapInstance {
  destroy(): void;
  on(event: string, callback: () => void): void;
  setMapStyle(style: string): void;
  setFeatures(features: string[]): void;
  setFitView(
    markers: AMapMarker[],
    immediately: boolean,
    padding: number[],
    maxZoom: number,
  ): void;
  setZoomAndCenter(zoom: number, center: Position): void;
  zoomIn(): void;
  zoomOut(): void;
}
export interface AMapSDK {
  Map: new (
    container: HTMLElement,
    options: Record<string, unknown>,
  ) => AMapInstance;
  Marker: new (options: Record<string, unknown>) => AMapMarker;
  convertFrom(
    positions: Position[],
    source: string,
    callback: (
      status: string,
      result: { locations?: { getLng(): number; getLat(): number }[] },
    ) => void,
  ): void;
}
declare global {
  interface Window {
    AMap?: AMapSDK;
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}
let loading: Promise<AMapSDK> | undefined;
export function loadAMap(): Promise<AMapSDK> {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (loading) return loading;
  const key = import.meta.env.VITE_AMAP_KEY;
  const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_CODE;
  if (!key || !securityJsCode)
    return Promise.reject(new Error("高德地图尚未配置"));
  window._AMapSecurityConfig = { securityJsCode };
  loading = new Promise<AMapSDK>((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(() => fail(), 30000);
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      reject(new Error("高德地图加载失败"));
    };
    script.async = true;
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}`;
    script.onerror = fail;
    script.onload = () => {
      if (!window.AMap) {
        fail();
        return;
      }
      clearTimeout(timer);
      resolve(window.AMap);
    };
    document.head.append(script);
  }).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

export async function amapPositions(sdk: AMapSDK, events: EventInfo[]) {
  const positions = new Map<string, Position>();
  const gps = events.filter((e) => e.coordinates.system === "WGS84");
  for (const event of events) {
    if (event.coordinates.system === "GCJ-02")
      positions.set(event.id, [event.coordinates.lng, event.coordinates.lat]);
  }
  if (gps.length) {
    const converted = await new Promise<Position[]>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("坐标转换超时")), 15000);
      sdk.convertFrom(
        gps.map((e) => [e.coordinates.lng, e.coordinates.lat]),
        "gps",
        (status, result) => {
          clearTimeout(timer);
          if (
            status !== "complete" ||
            result.locations?.length !== gps.length
          ) {
            reject(new Error("坐标转换失败"));
            return;
          }
          resolve(result.locations.map((p) => [p.getLng(), p.getLat()]));
        },
      );
    });
    gps.forEach((event, index) => positions.set(event.id, converted[index]));
  }
  return positions;
}
