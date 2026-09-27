import { lazy, Suspense, useState, type ReactNode } from "react";
import type { EventInfo } from "./data";
const AMapView = lazy(() => import("./AMapView"));
const OSMMapView = lazy(() => import("./OSMMapView"));
const amapConfigured = !!(
  import.meta.env.VITE_AMAP_KEY && import.meta.env.VITE_AMAP_SECURITY_CODE
);
export type MapViewProps = {
  events: EventInfo[];
  onSelect: (id: string) => void;
  focusToken: number;
  focusId: string | null;
  region: string;
  providerControl?: ReactNode;
};
export default function MapView(props: MapViewProps) {
  const [provider, setProvider] = useState(() => {
    try {
      if (localStorage.getItem("anievent:map-provider") === "osm") return "osm";
    } catch {
      /* Use the configured default. */
    }
    return amapConfigured ? "amap" : "osm";
  });
  const change = (value: string) => {
    setProvider(value);
    try {
      localStorage.setItem("anievent:map-provider", value);
    } catch {
      /* Keep the session selection. */
    }
  };
  const providerControl = (
    <fieldset>
      <legend>地图来源</legend>
      <div className="appearance-options">
        <button
          disabled={!amapConfigured}
          aria-pressed={provider === "amap"}
          onClick={() => change("amap")}
        >
          高德
        </button>
        <button aria-pressed={provider === "osm"} onClick={() => change("osm")}>
          OpenStreetMap
        </button>
      </div>
    </fieldset>
  );
  const View = provider === "amap" ? AMapView : OSMMapView;
  return (
    <Suspense fallback={<div className="map-loading">加载地图…</div>}>
      <View {...props} providerControl={providerControl} />
    </Suspense>
  );
}
