// client/api/schedule.ts
const API_BASE = import.meta.env.VITE_API_URL || "";

export async function fetchAppointmentsByDate(masterId: string, day: string) {
  const url = new URL("/master/schedule/date", API_BASE);
  url.searchParams.set("master_id", masterId);
  url.searchParams.set("day", day);

  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error(`Ошибка загрузки записей на день: ${res.status}`);
  return res.json();
}

export async function fetchWeekTimetable(masterId: string, startDate: string) {
  const url = new URL("/master/schedule/week", API_BASE);
  url.searchParams.set("master_id", masterId);
  url.searchParams.set("day", startDate);   // бэк принимает день недели (понедельник)

  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error(`Ошибка загрузки недельной сетки: ${res.status}`);
  return res.json();
}