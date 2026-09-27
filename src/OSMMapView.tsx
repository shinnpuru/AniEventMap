import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LocateFixed, Minus, Plus, SlidersHorizontal, X } from "lucide-react";
import type { MapViewProps } from "./MapView";
import { mapCoordinates, groupByVenue, type EventInfo } from "./data";
const themes = {
  original: { name: "原色", saturation: 0, contrast: 0 },
  soft: { name: "柔和", saturation: -0.45, contrast: -0.08 },
  vivid: { name: "鲜明", saturation: 0.25, contrast: 0.08 },
};
const densities = {
  compact: { name: "简洁", tileSize: 512 },
  standard: { name: "标准", tileSize: 256 },
  detailed: { name: "丰富", tileSize: 128 },
};
type Appearance = {
  theme: keyof typeof themes;
  density: keyof typeof densities;
};
function readAppearance(): Appearance {
  try {
    const value = JSON.parse(
      localStorage.getItem("anievent:map-appearance") || "null",
    );
    return {
      theme:
        value && Object.hasOwn(themes, value.theme) ? value.theme : "original",
      density:
        value && Object.hasOwn(densities, value.density)
          ? value.density
          : "standard",
    };
  } catch {
    return { theme: "original", density: "standard" };
  }
}
export default function MapView({
  events,
  onSelect,
  focusToken,
  focusId,
  region,
  providerControl,
}: MapViewProps) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<maplibregl.Map | null>(null),
    markers = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const [appearance, setAppearance] = useState(readAppearance);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settings = useRef<HTMLDivElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    try {
      localStorage.setItem(
        "anievent:map-appearance",
        JSON.stringify(appearance),
      );
    } catch {
      /* Session settings still work when storage is unavailable. */
    }
    if (!ready || !map.current?.getLayer("base")) return;
    const instance = map.current;
    const source = instance.getStyle().sources.osm;
    const tileSize = densities[appearance.density].tileSize;
    if (source.type === "raster" && source.tileSize !== tileSize) {
      const base = instance
        .getStyle()
        .layers.find((layer) => layer.id === "base")!;
      instance.removeLayer("base");
      instance.removeSource("osm");
      instance.addSource("osm", { ...source, tileSize });
      instance.addLayer(base);
    }
    const theme = themes[appearance.theme];
    map.current.setPaintProperty("base", "raster-saturation", theme.saturation);
    map.current.setPaintProperty("base", "raster-contrast", theme.contrast);
  }, [appearance, ready]);
  useEffect(() => {
    if (!settingsOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (
        !settings.current?.contains(event.target as Node) &&
        !settingsButton.current?.contains(event.target as Node)
      )
        setSettingsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        settingsButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [settingsOpen]);
  const select = useRef(onSelect);
  select.current = onSelect;
  const currentEvents = useRef(events);
  currentEvents.current = events;
  const fitEvents = () => {
    const instance = map.current;
    const items = currentEvents.current;
    if (!instance || !items.length) return;
    const bounds = new maplibregl.LngLatBounds();
    items.forEach((e) => bounds.extend(mapCoordinates(e.coordinates)));
    instance.fitBounds(bounds, { padding: 90, maxZoom: 13.5, duration: 500 });
  };
  useEffect(() => {
    if (!container.current) return;
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        center: events.length
          ? mapCoordinates(events[0].coordinates)
          : [104, 35],
        zoom: 13.5,
        minZoom: 2,
        maxZoom: 18,
        attributionControl: false,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: [
                import.meta.env.VITE_TILE_URL ||
                  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              ],
              tileSize: densities[appearance.density].tileSize,
              maxzoom: 19,
              attribution:
                import.meta.env.VITE_TILE_ATTRIBUTION ||
                '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            {
              id: "base",
              type: "raster",
              source: "osm",
              paint: {
                "raster-saturation": themes[appearance.theme].saturation,
                "raster-contrast": themes[appearance.theme].contrast,
              },
            },
          ],
        },
      });
    } catch {
      setFailed(true);
      return;
    }
    map.current = instance;
    instance.addControl(
      new maplibregl.AttributionControl({ compact: false }),
      "bottom-left",
    );
    instance.on("load", () => setReady(true));
    instance.on("error", () => setFailed(true));
    instance.on("idle", () => {
      if (instance.areTilesLoaded()) setFailed(false);
    });
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (ready) fitEvents();
  }, [region, ready]);
  useEffect(() => {
    if (!map.current || !ready) return;
    markers.current.forEach((m) => m.remove());
    markers.current = groupByVenue(events).map((group) => {
      const container = document.createElement("div");
      container.className = "event-marker-group";
      container.setAttribute("role", "group");
      container.setAttribute("aria-label", group[0].venue);
      group.forEach((event) => {
        const button = document.createElement("button");
        button.className = "event-pin";
        button.setAttribute("aria-label", "查看" + event.title);
        const picture = document.createElement("img");
        picture.src = event.poster;
        picture.alt = "";
        picture.referrerPolicy = "no-referrer";
        picture.onerror = () => {
          picture.style.display = "none";
        };
        const label = document.createElement("span");
        label.textContent = event.title;
        button.append(picture, label);
        button.onclick = (click) => {
          click.stopPropagation();
          select.current(event.id);
        };
        container.append(button);
      });
      return new maplibregl.Marker({ element: container, anchor: "bottom" })
        .setLngLat(mapCoordinates(group[0].coordinates))
        .addTo(map.current!);
    });
    return () => {
      markers.current.forEach((m) => m.remove());
    };
  }, [events, ready]);
  useEffect(() => {
    const target = events.find((e) => e.id === focusId);
    if (focusToken && map.current && target)
      map.current.flyTo({
        center: mapCoordinates(target.coordinates),
        zoom: 15,
        duration: 700,
      });
  }, [focusToken, focusId, events]);
  return (
    <>
      <div ref={container} className="map-canvas" aria-label="活动地图" />
      {failed && (
        <div className="map-error" role="status">
          底图暂时无法加载，活动列表仍可浏览。
          <button
            onClick={() => {
              setFailed(false);
              const current = map.current;
              if (current) {
                const style = current.getStyle();
                current.setStyle(style, { diff: false });
              }
            }}
          >
            重试
          </button>
        </div>
      )}
      <div className="map-controls">
        <button aria-label="放大地图" onClick={() => map.current?.zoomIn()}>
          <Plus size={19} />
        </button>
        <button aria-label="缩小地图" onClick={() => map.current?.zoomOut()}>
          <Minus size={19} />
        </button>
        <button aria-label="显示全部活动" onClick={fitEvents}>
          <LocateFixed size={19} />
        </button>
        <button
          ref={settingsButton}
          aria-label="地图外观"
          aria-expanded={settingsOpen}
          aria-controls="map-appearance"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <SlidersHorizontal size={19} />
        </button>
      </div>
      {settingsOpen && (
        <div
          ref={settings}
          id="map-appearance"
          className="map-appearance"
          role="region"
          aria-label="地图外观设置"
        >
          <div className="appearance-heading">
            <strong>地图外观</strong>
            <button
              aria-label="关闭地图外观"
              onClick={() => {
                setSettingsOpen(false);
                settingsButton.current?.focus();
              }}
            >
              <X size={16} />
            </button>
          </div>
          {providerControl}
          <fieldset>
            <legend>底图主题</legend>
            <div className="appearance-options">
              {(Object.keys(themes) as Appearance["theme"][]).map((theme) => (
                <button
                  key={theme}
                  aria-pressed={appearance.theme === theme}
                  onClick={() => setAppearance({ ...appearance, theme })}
                >
                  {themes[theme].name}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>底图密度</legend>
            <div className="appearance-options">
              {(Object.keys(densities) as Appearance["density"][]).map(
                (density) => (
                  <button
                    key={density}
                    aria-pressed={appearance.density === density}
                    onClick={() => setAppearance({ ...appearance, density })}
                  >
                    {densities[density].name}
                  </button>
                ),
              )}
            </div>
          </fieldset>
        </div>
      )}
    </>
  );
}
