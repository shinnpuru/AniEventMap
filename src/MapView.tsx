import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { mapCoordinates, type EventInfo } from "./data";
export default function MapView({
  events,
  onSelect,
  focusToken,
}: {
  events: EventInfo[];
  onSelect: (id: string) => void;
  focusToken: number;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<maplibregl.Map | null>(null),
    markers = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const select = useRef(onSelect);
  select.current = onSelect;
  useEffect(() => {
    if (!container.current) return;
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        center: [121.478, 31.2365],
        zoom: 13.5,
        minZoom: 9,
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
              tileSize: 256,
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
              paint: { "raster-saturation": -0.65, "raster-contrast": -0.08 },
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
    if (!map.current || !ready) return;
    markers.current.forEach((m) => m.remove());
    markers.current = events.map((e) => {
      const button = document.createElement("button");
      button.className = "event-pin";
      button.setAttribute("aria-label", `查看${e.title}`);
      const picture = document.createElement("img");
      picture.src = e.poster;
      picture.alt = "";
      picture.referrerPolicy = "no-referrer";
      picture.onerror = () => {
        picture.style.display = "none";
      };
      const label = document.createElement("span");
      label.textContent = e.title;
      button.append(picture, label);
      button.onclick = () => select.current(e.id);
      return new maplibregl.Marker({ element: button, anchor: "bottom" })
        .setLngLat(mapCoordinates(e.coordinates))
        .addTo(map.current!);
    });
    return () => {
      markers.current.forEach((m) => m.remove());
    };
  }, [events, ready]);
  useEffect(() => {
    if (focusToken && map.current && events[0])
      map.current.flyTo({
        center: mapCoordinates(events[0].coordinates),
        zoom: 15,
        duration: 700,
      });
  }, [focusToken, events]);
  return (
    <>
      <div ref={container} className="map-canvas" aria-label="上海活动地图" />
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
        <button
          aria-label="回到上海"
          onClick={() =>
            map.current?.flyTo({ center: [121.478, 31.2365], zoom: 13.5 })
          }
        >
          <LocateFixed size={19} />
        </button>
      </div>
    </>
  );
}
