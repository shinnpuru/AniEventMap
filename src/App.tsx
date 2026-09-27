import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Library,
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
  Plus,
  Search,
  Share2,
  Sparkles,
  Ticket,
  X,
} from "lucide-react";
import {
  dataset,
  dateMatches,
  validDateRange,
  compareEvents,
  formatPrice,
  type EventSort,
  eventStatus,
  shanghaiDate,
  type EventInfo,
} from "./data";
const MapView = lazy(() => import("./MapView"));
const types = ["全部", "展览", "快闪", "演出", "同人Only"];
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
  const [sort, setSort] = useState<EventSort>("start");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [range, setRange] = useState({ start: "", end: "" });
  const [draftRange, setDraftRange] = useState({ start: "", end: "" });
  const [rangeError, setRangeError] = useState("");
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
  const matchingEvents = dataset.events
    .filter(
      (e) =>
        (tab !== "saved" || favorites.includes(e.id)) &&
        (type === "全部" || e.type === type) &&
        (city === "all" || e.city === city) &&
        dateMatches(e, date, today, range) &&
        `${e.title} ${e.venue} ${e.address} ${e.workIds.map((id) => dataset.works.find((w) => w.id === id)?.name).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
    )
    .sort((a, b) => compareEvents(a, b, sort));
  const filtered = matchingEvents.filter(
    (e) => tab === "works" || work === "all" || e.workIds.includes(work),
  );
  const visibleWorks = dataset.works
    .map((w) => ({
      ...w,
      count: matchingEvents.filter((e) => e.workIds.includes(w.id)).length,
    }))
    .filter((w) => w.count > 0);
  const activeWork = dataset.works.find((w) => w.id === work);
  const clear = () => {
    setQuery("");
    setType("全部");
    setDate("all");
    setRangeOpen(false);
    setRange({ start: "", end: "" });
    setDraftRange({ start: "", end: "" });
    setRangeError("");
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
              className={tab === "works" ? "nav-active" : ""}
              onClick={() => setTab("works")}
            >
              <Library size={17} />
              作品
            </button>
            <button
              className={tab === "saved" ? "nav-active" : ""}
              onClick={() => setTab("saved")}
            >
              <Heart size={17} />
              想去{favorites.length > 0 && <b>{favorites.length}</b>}
            </button>
            <a
              href="https://github.com/shinnpuru/AniEventMap/blob/main/SKILL.md"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="添加活动（新标签页打开投稿指引）"
            >
              <Plus size={17} />
              添加
            </a>
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
                  {date === "custom" && (
                    <option value="custom">自定义日期</option>
                  )}
                </select>
                <ChevronDown size={13} />
              </label>
              <button
                className={
                  date === "custom" ? "range-button active" : "range-button"
                }
                aria-label="自定义日期范围"
                aria-expanded={rangeOpen}
                aria-controls="date-range"
                onClick={() => {
                  setDraftRange(range);
                  setRangeError("");
                  setRangeOpen(!rangeOpen);
                }}
              >
                <CalendarDays size={15} />
                日期范围
              </button>
            </div>
            {rangeOpen && (
              <form
                id="date-range"
                className="date-range"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!validDateRange(draftRange)) {
                    setRangeError("请选择有效日期，结束日期不能早于开始日期");
                    return;
                  }
                  setRange(draftRange);
                  setDate("custom");
                  setRangeOpen(false);
                  setRangeError("");
                }}
              >
                <label>
                  开始日期
                  <input
                    aria-label="开始日期"
                    type="date"
                    required
                    value={draftRange.start}
                    onChange={(e) =>
                      setDraftRange({ ...draftRange, start: e.target.value })
                    }
                  />
                </label>
                <label>
                  结束日期
                  <input
                    aria-label="结束日期"
                    type="date"
                    required
                    min={draftRange.start || undefined}
                    value={draftRange.end}
                    onChange={(e) =>
                      setDraftRange({ ...draftRange, end: e.target.value })
                    }
                  />
                </label>
                {rangeError && <p role="alert">{rangeError}</p>}
                <div>
                  <button type="button" onClick={() => setRangeOpen(false)}>
                    取消
                  </button>
                  <button type="submit">应用</button>
                </div>
              </form>
            )}
            {(date === "custom" || (activeWork && tab !== "works")) && (
              <div className="filter-chips">
                {activeWork && tab !== "works" && (
                  <button
                    onClick={() => setWork("all")}
                    aria-label="清除作品筛选"
                  >
                    {activeWork.name}
                    <X size={12} />
                  </button>
                )}
                {date === "custom" && (
                  <button
                    onClick={() => setDate("all")}
                    aria-label="清除日期范围"
                  >
                    {range.start} — {range.end}
                    <X size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="results-heading">
            <span>
              {tab === "works"
                ? "作品列表"
                : tab === "saved"
                  ? "想去清单"
                  : "发现活动"}{" "}
              <b>
                {(tab === "works" ? visibleWorks.length : filtered.length)
                  .toString()
                  .padStart(2, "0")}
              </b>
            </span>
            {tab !== "works" && (
              <select
                className="sort-select"
                aria-label="活动排序"
                value={sort}
                onChange={(e) => setSort(e.target.value as EventSort)}
              >
                <option value="start">开始日期</option>
                <option value="end">结束日期</option>
                <option value="price-asc">价格从低到高</option>
                <option value="price-desc">价格从高到低</option>
              </select>
            )}
          </div>
          <div className="event-list">
            {tab === "works" ? (
              <div className="work-list">
                <button
                  className="all-works"
                  onClick={() => {
                    setWork("all");
                    setTab("discover");
                  }}
                >
                  全部作品 <span>{matchingEvents.length} 场活动</span>
                </button>
                {visibleWorks.map((w) => (
                  <button
                    key={w.id}
                    className="work-card"
                    onClick={() => {
                      setWork(w.id);
                      setTab("discover");
                    }}
                  >
                    <span
                      className="work-cover"
                      style={{ backgroundColor: w.color + "22" }}
                    >
                      <Library size={22} />
                      {w.cover && (
                        <img
                          src={w.cover}
                          alt={w.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </span>
                    <span className="work-info">
                      <strong>{w.name}</strong>
                      <small>{w.count} 场活动</small>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                ))}
                {visibleWorks.length === 0 && (
                  <div className="empty">
                    <p>暂无匹配的作品</p>
                    <button onClick={clear}>清除筛选</button>
                  </div>
                )}
              </div>
            ) : filtered.length === 0 ? (
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
                        <span className="price">{formatPrice(e.price)}</span>
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
                    <strong>{formatPrice(event.price)}</strong>
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
                  {event.price === 0 || event.reservation
                    ? "查看场次与预约"
                    : "查看场次与购票"}{" "}
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
