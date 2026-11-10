export interface ReportingPeriod {
  asOf: string;
  timeZone: "Asia/Bangkok";
  months: Array<{
    month: string;
    isPartial: boolean;
  }>;
}

// asOf is an ISO timestamp with an explicit UTC offset or Z.
export function buildReportingPeriod(asOf: string): ReportingPeriod {
  const instant = new Date(asOf);
  const timeZone = "Asia/Bangkok";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "numeric",
  }).formatToParts(instant);
  const year = Number(parts.find((part) => part.type === "year")!.value);
  const month = Number(parts.find((part) => part.type === "month")!.value);
  const currentMonthIndex = year * 12 + month - 1;

  const months = Array.from({ length: 12 }, (_, index) => {
    const monthIndex = currentMonthIndex - 11 + index;
    const reportYear = Math.floor(monthIndex / 12);
    const reportMonth = (monthIndex % 12) + 1;

    return {
      month: `${reportYear}-${String(reportMonth).padStart(2, "0")}`,
      isPartial: index === 11,
    };
  });

  return { asOf: instant.toISOString(), timeZone, months };
}
