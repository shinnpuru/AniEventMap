import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Compass,
  ExternalLink,
  Heart,
  MapPin,
  Menu,
  Search,
  Share2,
  Sparkles,
  Ticket,
  X,
} from "lucide-react";
import {
  dataset,
  dateMatches,
  eventStatus,
  shanghaiDate,
  type EventInfo,
} from "./data";
const MapView = lazy(() => import("./MapView"));
const types = ["全部", "展览", "快闪", "演出"];
function hashId() {
  return new URLSearchParams(location.hash.slice(1)).get("event");
}
function initialFavorites(): string[] {
  try {
    const data = JSON.parse(localStorage.getItem("anievent:favorites") || "[]");
    return Array.isArray(data)
      ? data.filter((id: unknown) => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}
function Poster({
  event,
  className = "",
}: {
  event: EventInfo;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={event.poster}
      alt={event.posterAlt || `${event.title}海报`}
      referrerPolicy="no-referrer"
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}
export default function App() {
  const [query, setQuery] = useState(""),
    [type, setType] = useState("全部"),
    [date, setDate] = useState("all"),
    [work, setWork] = useState("all"),
    [city, setCity] = useState("all"),
    [tab, setTab] = useState("discover");
  const [favorites, setFavorites] = useState(initialFavorites),
    [selected, setSelected] = useState<string | null>(hashId),
    [focusToken, setFocusToken] = useState(0),
    [focusId, setFocusId] = useState<string | null>(null),
    [toast, setToast] = useState(""),
    [sidebarOpen, setSidebarOpen] = useState(false),
    [today, setToday] = useState(shanghaiDate);
  const dialog = useRef<HTMLDialogElement>(null),
    previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setToday(shanghaiDate()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const update = () => setSelected(hashId());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const event = dataset.events.find((e) => e.id === selected);
  useEffect(() => {
    if (event) {
      previousFocus.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
    } else if (dialog.current?.open) {
      dialog.current.close();
      previousFocus.current?.focus();
    }
  }, [event]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);
  const show = (id: string) => {
    location.hash = new URLSearchParams({ event: id }).toString();
  };
  const close = () => {
    history.replaceState(null, "", location.pathname + location.search);
    setSelected(null);
  };
  const toggle = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(next);
    try {
      localStorage.setItem("anievent:favorites", JSON.stringify(next));
    } catch {
      setToast("当前浏览器无法保存收藏，离开页面后可能丢失。");
    }
  };
  const filtered = dataset.events
    .filter(
      (e) =>
        (tab !== "saved" || favorites.includes(e.id)) &&
        (type === "全部" || e.type === type) &&
        (work === "all" || e.workIds.includes(work)) &&
        (city === "all" || e.city === city) &&
        dateMatches(e, date, today) &&
        `${e.title} ${e.venue} ${e.address} ${e.workIds.map((id) => dataset.works.find((w) => w.id === id)?.name).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const clear = () => {
    setQuery("");
    setType("全部");
    setDate("all");
    setWork("all");
    setCity("all");
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setToast("活动链接已复制");
    } catch {
      setToast("请复制浏览器地址栏中的活动链接");
    }
  };
  return (
    <div className="app">
      <button
        className="sidebar-toggle"
        aria-label={sidebarOpen ? "收起侧栏" : "展开侧栏"}
        aria-expanded={sidebarOpen}
        aria-controls="activity-sidebar"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu size={21} />
      </button>
      <main
        className={
          sidebarOpen ? "workspace sidebar-open" : "workspace sidebar-closed"
        }
      >
        <aside id="activity-sidebar" className="sidebar" hidden={!sidebarOpen}>
          <div className="sidebar-brand">
            <strong>AniEventMap</strong>
            <button aria-label="收起侧栏" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <nav aria-label="主导航">
            <button
              className={tab === "discover" ? "nav-active" : ""}
              onClick={() => setTab("discover")}
            >
              <Compass size={17} />
              活动
            </button>
            <button
              className={tab === "saved" ? "nav-active" : ""}
              onClick={() => setTab("saved")}
            >
              <Heart size={17} />
              想去{favorites.length > 0 && <b>{favorites.length}</b>}
            </button>
          </nav>
          <label className="region-select">
            <MapPin size={15} />
            <select
              aria-label="地区"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="all">全部地区</option>
              {[...new Set(dataset.events.map((e) => e.city))]
                .sort()
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </label>
          <div className="filters">
            <label className="search">
              <Search size={19} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索作品、活动或地点"
                aria-label="搜索作品、活动或地点"
              />
              {query && (
                <button aria-label="清空搜索" onClick={() => setQuery("")}>
                  <X size={16} />
                </button>
              )}
            </label>
            <div className="type-tabs" aria-label="活动类型">
              {types.map((t) => (
                <button
                  key={t}
                  className={type === t ? "selected" : ""}
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                >
                  {t === "全部" && <Sparkles size={14} />} {t}
                </button>
              ))}
            </div>
            <div className="select-row">
              <label>
                <CalendarDays size={15} />
                <select
                  aria-label="活动时间"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                >
                  <option value="all">全部日期</option>
                  <option value="today">今天可去</option>
                  <option value="weekend">本周末</option>
                  <option value="upcoming">即将开始</option>
                </select>
                <ChevronDown size={13} />
              </label>
              <label>
                <span className="tiny-star">✦</span>
                <select
                  aria-label="关联作品"
                  value={work}
                  onChange={(e) => setWork(e.target.value)}
                >
                  <option value="all">全部作品</option>
                  {dataset.works.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} />
              </label>
            </div>
          </div>
          <div className="results-heading">
            <span>
              {tab === "saved" ? "想去清单" : "发现活动"}{" "}
              <b>{filtered.length.toString().padStart(2, "0")}</b>
            </span>
            <span>
              按开始日期 <ArrowDown size={12} />
            </span>
          </div>
          <div className="event-list">
            {filtered.length === 0 ? (
              <div className="empty">
                <Search size={30} />
                <h3>
                  {tab === "saved" && !favorites.length
                    ? "暂无收藏"
                    : "暂时没有匹配的活动"}
                </h3>
                <p>
                  {tab === "saved" && !favorites.length
                    ? "点击活动上的爱心收藏。"
                    : "试试其他日期、作品或关键词。"}
                </p>
                <button
                  onClick={() => {
                    clear();
                    setTab("discover");
                  }}
                >
                  浏览全部活动 <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              filtered.map((e) => (
                <article className="event-card" key={e.id}>
                  <button className="card-main" onClick={() => show(e.id)}>
                    <div className="poster-wrap">
                      <Poster event={e} />
                      <span className="poster-tag">{e.type}</span>
                    </div>
                    <div className="card-content">
                      <div className="card-kicker">
                        <span className="pink-dot" />
                        {dataset.works.find((w) => w.id === e.workIds[0])?.name}
                      </div>
                      <h2>{e.title}</h2>
                      <p>
                        <CalendarDays size={14} />
                        {e.startDate.replaceAll("-", ".")} —{" "}
                        {(e.startDate.slice(0, 4) === e.endDate.slice(0, 4)
                          ? e.endDate.slice(5)
                          : e.endDate
                        ).replaceAll("-", ".")}
                      </p>
                      <p>
                        <MapPin size={14} />
                        {e.venue} · {e.floor.split(" · ")[0]}
                      </p>
                      <div className="card-bottom">
                        <span className="status">
                          <span />
                          {eventStatus(e, today)}
                        </span>
                        <span className="price">
                          {e.price === 0 ? (
                            "免费"
                          ) : (
                            <>
                              ¥<b>{e.price}</b>
                              <small>{e.priceMax ? " 起" : " / 人"}</small>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                  <button
                    className={`save-button ${favorites.includes(e.id) ? "saved" : ""}`}
                    aria-label={
                      favorites.includes(e.id) ? "取消想去" : "加入想去"
                    }
                    aria-pressed={favorites.includes(e.id)}
                    onClick={() => toggle(e.id)}
                  >
                    <Heart
                      size={17}
                      fill={favorites.includes(e.id) ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    className="card-footer"
                    onClick={() => {
                      setSidebarOpen(false);
                      setFocusId(e.id);
                      setFocusToken((n) => n + 1);
                    }}
                  >
                    <span>
                      <MapPin size={13} />
                      地图定位
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                </article>
              ))
            )}
          </div>
          <footer className="sidebar-footer">
            <span>{dataset.events.length} 场活动</span>
            <a
              href="https://github.com/shinnpuru/AniEventMap/issues"
              target="_blank"
              rel="noreferrer"
            >
              反馈建议 <ArrowUpRight size={12} />
            </a>
          </footer>
        </aside>
        <section className="map-panel" aria-label="地图探索">
          <Suspense fallback={<div className="map-loading">加载地图…</div>}>
            <MapView
              events={filtered}
              onSelect={show}
              focusToken={focusToken}
              focusId={focusId}
              region={city}
            />
          </Suspense>
        </section>
      </main>
      <dialog
        ref={dialog}
        aria-label="活动详情"
        className="detail-dialog"
        onCancel={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {event && (
          <div className="detail-inner">
            <div className="detail-hero">
              <Poster event={event} />
              <button
                className="close-detail"
                aria-label="关闭活动详情"
                onClick={close}
              >
                <X size={20} />
              </button>
            </div>
            <div className="detail-body">
              <div className="detail-topline">
                <span className="status">
                  <span />
                  {eventStatus(event, today)}
                </span>
                <span>
                  {event.type} / {event.city}·{event.district}
                </span>
              </div>
              <h2>{event.title}</h2>
              <div className="work-links">
                {event.workIds.map((id) => {
                  const w = dataset.works.find((w) => w.id === id)!;
                  return (
                    <a
                      key={id}
                      href={`https://bgm.tv/subject/${w.bangumiId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      ✦ {w.name} <span>Bangumi</span>
                      <ArrowUpRight size={13} />
                    </a>
                  );
                })}
              </div>
              <div className="detail-facts">
                <div>
                  <CalendarDays />
                  <p>
                    <strong>
                      {event.startDate.replaceAll("-", ".")} —{" "}
                      {event.endDate.replaceAll("-", ".")}
                    </strong>
                    <span>
                      {event.hours}
                      {event.sessionNote && ` · ${event.sessionNote}`}
                    </span>
                  </p>
                </div>
                <div>
                  <MapPin />
                  <p>
                    <strong>
                      {event.venue} · {event.floor}
                    </strong>
                    <span>{event.address}</span>
                  </p>
                </div>
                <div>
                  <Ticket />
                  <p>
                    <strong>
                      {event.price === 0
                        ? "免费"
                        : `¥${event.price}${event.priceMax ? `–${event.priceMax}` : " / 人"}`}
                    </strong>
                  </p>
                </div>
              </div>
              <div className="source-line">
                信息来源：
                <a href={event.source.url} target="_blank" rel="noreferrer">
                  {event.source.name} <ExternalLink size={11} />
                </a>
                <span>更新于 {event.source.verifiedAt}</span>
              </div>
              <div className="detail-actions">
                <a
                  className="ticket-button"
                  href={event.source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {event.price === 0 ? "查看场次与预约" : "查看场次与购票"}{" "}
                  <ArrowUpRight size={17} />
                </a>
                <button
                  className={favorites.includes(event.id) ? "saved" : ""}
                  onClick={() => toggle(event.id)}
                >
                  <Heart
                    size={17}
                    fill={
                      favorites.includes(event.id) ? "currentColor" : "none"
                    }
                  />
                  {favorites.includes(event.id) ? "已想去" : "想去"}
                </button>
                <button aria-label="分享活动" onClick={share}>
                  {toast === "活动链接已复制" ? (
                    <Check size={17} />
                  ) : (
                    <Share2 size={17} />
                  )}
                </button>
              </div>
              <a
                className="navigation-link"
                href={`https://uri.amap.com/marker?position=${event.coordinates.lng},${event.coordinates.lat}&name=${encodeURIComponent(event.venue)}&coordinate=${event.coordinates.system === "GCJ-02" ? "gaode" : "wgs84"}&callnative=1`}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin size={14} />
                在高德地图中查看地点 <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        )}
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
