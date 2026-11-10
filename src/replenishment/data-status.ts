export interface MetricSource {
  value: number | null;
  asOf: string | null;
  verifiedWithExpress: boolean;
  unavailableReason?: string;
}

export interface MetricDisplay {
  value: number | null;
  status: "unavailable" | "unverified" | "verified";
  label: string;
  reason: string | null;
  asOf: string | null;
}

export function presentMetric(source: MetricSource): MetricDisplay {
  if (source.value === null) {
    return { value: null, status: "unavailable", label: "ข้อมูลไม่พร้อม",
      reason: source.unavailableReason ?? "ยังไม่ได้รับข้อมูลส่วนนี้", asOf: source.asOf };
  }
  return { value: source.value, asOf: source.asOf, reason: null,
    status: source.verifiedWithExpress ? "verified" : "unverified",
    label: source.verifiedWithExpress ? "ยืนยันกับ Express แล้ว" : "ยังไม่ยืนยันกับ Express" };
}
