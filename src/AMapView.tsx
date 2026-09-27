import { useEffect, useRef, useState } from "react";
import {
  loadAMap,
  amapPositions,
  type AMapInstance,
  type AMapMarker,
  type AMapSDK,
  type Position,
} from "./amap";
import { LocateFixed, Minus, Plus, SlidersHorizontal, X } from "lucide-react";
import type { MapViewProps } from "./MapView";
import { dataset, groupByVenue } from "./data";
const themes = {
  original: { name: "原色", style: "normal" },
  soft: { name: "柔和", style: "whitesmoke" },
  vivid: { name: "鲜明", style: "fresh" },
};
const densities = {
  compact: { name: "简洁", features: ["bg", "road"] },
  standard: { name: "标准", features: ["bg", "road", "point"] },
  detailed: { name: "丰富", features: ["bg", "road", "point", "building"] },
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
    map = useRef<AMapInstance | null>(null),
    markers = useRef<AMapMarker[]>([]);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const sdk = useRef<AMapSDK | null>(null);
  const positions = useRef(new Map<string, Position>());
  const fittedRegion = useRef<string | null>(null);
  const [retry, setRetry] = useState(0);
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
    if (!ready || !map.current) return;
    map.current.setMapStyle("amap://styles/" + themes[appearance.theme].style);
    map.current.setFeatures(densities[appearance.density].features);
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
    if (map.current && markers.current.length)
      map.current.setFitView(markers.current, false, [90, 90, 90, 90], 13.5);
  };
  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    let instance: AMapInstance | undefined;
    setReady(false);
    setFailed(false);
    fittedRegion.current = null;
    const timer = setTimeout(() => {
      if (!cancelled) setFailed(true);
    }, 35000);
    loadAMap()
      .then(async (loaded) => {
        const resolved = await amapPositions(loaded, dataset.events);
        if (cancelled || !container.current) return;
        sdk.current = loaded;
        positions.current = resolved;
        instance = new loaded.Map(container.current, {
          center: resolved.get(currentEvents.current[0]?.id) || [104, 35],
          zoom: 13.5,
          zooms: [3, 20],
          viewMode: "2D",
          resizeEnable: true,
          mapStyle: "amap://styles/" + themes[appearance.theme].style,
          features: densities[appearance.density].features,
          showIndoorMap: false,
        });
        map.current = instance;
        instance.on("complete", () => {
          if (!cancelled) {
            clearTimeout(timer);
            setFailed(false);
          }
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(timer);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      instance?.destroy();
      map.current = null;
    };
  }, [retry]);
  useEffect(() => {
    if (!map.current || !ready) return;
    markers.current.forEach((m) => m.setMap(null));
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
      return new sdk.current!.Marker({
        content: container,
        anchor: "bottom-center",
        position: positions.current.get(group[0].id),
        map: map.current,
      });
    });
    if (fittedRegion.current !== region) {
      fitEvents();
      fittedRegion.current = region;
    }
    const created = markers.current;
    return () => {
      created.forEach((m) => m.setMap(null));
    };
  }, [events, ready, region]);
  useEffect(() => {
    if (focusToken && ready && focusId) {
      const position = positions.current.get(focusId);
      if (position) map.current?.setZoomAndCenter(15, position);
    }
  }, [focusToken, focusId, ready]);
  return (
    <>
      <div ref={container} className="map-canvas" aria-label="活动地图" />
      {failed && (
        <div className="map-error" role="status">
          底图暂时无法加载，活动列表仍可浏览。
          <button
            onClick={() => {
              setRetry((n) => n + 1);
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
