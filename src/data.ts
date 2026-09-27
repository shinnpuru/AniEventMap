import { z } from "zod";
import raw from "./data/events.json";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().startsWith(v),
  );
const eventSchema = z
  .object({
    id: z.string(),
    title: z.string().min(1),
    workIds: z.array(z.string()).min(1),
    type: z.enum(["展览", "快闪", "演出"]),
    city: z.string(),
    district: z.string(),
    startDate: date,
    endDate: date,
    hours: z.string(),
    timezone: z.literal("Asia/Shanghai"),
    status: z.enum(["scheduled", "cancelled", "postponed"]),
    venue: z.string(),
    floor: z.string(),
    address: z.string(),
    coordinates: z.object({
      system: z.enum(["GCJ-02", "WGS84"]),
      lng: z.number().min(-180).max(180),
      lat: z.number().min(-90).max(90),
    }),
    price: z.number().nonnegative(),
    priceNote: z.string(),
    poster: z.url(),
    banner: z.url(),
    description: z.string(),
    highlights: z.array(z.string()),
    notes: z.array(z.string()),
    source: z.object({
      name: z.string(),
      url: z.url(),
      verifiedAt: date,
      api: z.url(),
    }),
  })
  .refine((e) => e.startDate <= e.endDate, "活动结束日期不能早于开始日期");
export const dataset = z
  .object({
    updatedAt: date,
    works: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        originalName: z.string(),
        bangumiId: z.number().int().positive(),
        color: z.string(),
      }),
    ),
    events: z.array(eventSchema),
  })
  .parse(raw);
const ids = new Set<string>();
for (const event of dataset.events) {
  if (ids.has(event.id)) throw new Error("重复活动 ID");
  ids.add(event.id);
  if (event.workIds.some((id) => !dataset.works.some((w) => w.id === id)))
    throw new Error("作品关联不存在");
}
export type EventInfo = z.infer<typeof eventSchema>;
export function shanghaiDate(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function eventStatus(e: EventInfo, today = shanghaiDate()) {
  if (e.status === "cancelled") return "已取消";
  if (e.status === "postponed") return "已延期";
  return today < e.startDate
    ? "即将开始"
    : today > e.endDate
      ? "已结束"
      : "展期中";
}
export function dateMatches(
  e: EventInfo,
  filter: string,
  today = shanghaiDate(),
) {
  if (filter === "all") return true;
  if (e.status !== "scheduled") return false;
  if (filter === "today") return e.startDate <= today && e.endDate >= today;
  if (filter === "upcoming") return e.startDate > today;
  const d = new Date(today + "T12:00:00+08:00");
  const weekday = (d.getUTCDay() + 6) % 7;
  const start = new Date(d);
  start.setUTCDate(start.getUTCDate() + (weekday === 6 ? 0 : 5 - weekday));
  const end = new Date(start);
  if (weekday !== 6) end.setUTCDate(end.getUTCDate() + 1);
  return e.startDate <= shanghaiDate(end) && e.endDate >= shanghaiDate(start);
}
// Invert the GCJ-02 transform iteratively; retain original coordinates for AMap navigation.
export function mapCoordinates(c: EventInfo["coordinates"]): [number, number] {
  if (c.system === "WGS84") return [c.lng, c.lat];
  const pi = Math.PI,
    a = 6378245,
    ee = 0.006693421622965943;
  const offset = (lng: number, lat: number) => {
    const x = lng - 105,
      y = lat - 35;
    let dy =
      -100 +
      2 * x +
      3 * y +
      0.2 * y * y +
      0.1 * x * y +
      0.2 * Math.sqrt(Math.abs(x));
    dy +=
      ((20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2) / 3 +
      ((20 * Math.sin(y * pi) + 40 * Math.sin((y / 3) * pi)) * 2) / 3 +
      ((160 * Math.sin((y / 12) * pi) + 320 * Math.sin((y * pi) / 30)) * 2) / 3;
    let dx =
      300 +
      x +
      2 * y +
      0.1 * x * x +
      0.1 * x * y +
      0.1 * Math.sqrt(Math.abs(x));
    dx +=
      ((20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2) / 3 +
      ((20 * Math.sin(x * pi) + 40 * Math.sin((x / 3) * pi)) * 2) / 3 +
      ((150 * Math.sin((x / 12) * pi) + 300 * Math.sin((x / 30) * pi)) * 2) / 3;
    const rad = (lat / 180) * pi,
      magic = 1 - ee * Math.sin(rad) ** 2,
      root = Math.sqrt(magic);
    return [
      (dx * 180) / ((a / root) * Math.cos(rad) * pi),
      (dy * 180) / (((a * (1 - ee)) / (magic * root)) * pi),
    ];
  };
  let lng = c.lng,
    lat = c.lat;
  for (let i = 0; i < 5; i++) {
    const [dx, dy] = offset(lng, lat);
    lng = c.lng - dx;
    lat = c.lat - dy;
  }
  return [lng, lat];
}
