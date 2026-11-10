import { demoDemandInput } from "./demo-demand";
import { reviewDemand } from "./review-demand";

export function buildDemoReview(scenario?: string) {
  return reviewDemand(demoDemandInput(scenario));
}

export function demoHref(path: string, scenario?: string): string {
  return scenario ? `${path}?scenario=${encodeURIComponent(scenario)}` : path;
}

export function formatReportMonth(month: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    calendar: "gregory", timeZone: "UTC", month: "short", year: "numeric",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

export function formatBusinessDate(value: string | null): string {
  return value === null ? "ไม่ระบุ" : new Intl.DateTimeFormat("th-TH", {
    calendar: "gregory", timeZone: "UTC", day: "numeric", month: "short", year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatSnapshotTime(asOf: string): string {
  const date = new Date(asOf);
  const day = new Intl.DateTimeFormat("th-TH", {
    calendar: "gregory", timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(date);
  return `ข้อมูล ณ ${day} เวลา ${time} น.`;
}
