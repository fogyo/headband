import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import homeIconSrc from "@/assets/home.svg";
import { addDays, format, startOfDay, startOfWeek } from "date-fns";
import AppointmentItem from "@/components/AppointmentItem";
import RestBreak from "@/components/RestBreak";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ---------- Типы и утилиты ----------
type AppointmentRaw = {
  id: string;
  master_id: string;
  date: string;
  start_time: string; // "10:00:00"
  end_time: string;
  final_price: number;
  address: string | null;
  service_name: string | null;
};

type TimelineItem =
  | {
      type: "appointment";
      startTime: string;
      endTime: string;
      service: string;
      location: string;
    }
  | {
      type: "break";
      label: string;
    };

// HH:MM:SS → HH:MM
const toHHMM = (timeWithSec: string) => timeWithSec.slice(0, 5);

// Форматирование перерыва (часы, минуты)
function formatBreakDuration(minutes: number): string {
  if (minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hStr =
    hours === 0 ? "" : hours === 1 ? "1 час" : hours <= 4 ? `${hours} часа` : `${hours} часов`;
  const mStr =
    mins === 0 ? "" : mins === 1 ? "1 минуту" : mins <= 4 ? `${mins} минуты` : `${mins} минут`;
  if (hours > 0 && mins > 0) return `Отдых ${hStr} ${mStr}`;
  if (hours > 0) return `Отдых ${hStr}`;
  return `Отдых ${mStr}`;
}

// Преобразование массива записей в плоский список с перерывами
function buildTimelineWithBreaks(appointments: AppointmentRaw[]): TimelineItem[] {
  if (!appointments.length) return [];
  const items: TimelineItem[] = [];
  for (let i = 0; i < appointments.length; i++) {
    const curr = appointments[i];
    items.push({
      type: "appointment",
      startTime: toHHMM(curr.start_time),
      endTime: toHHMM(curr.end_time),
      service: curr.service_name || "",
      location: curr.address || "",
    });
    if (i < appointments.length - 1) {
      const next = appointments[i + 1];
      const currEnd = new Date(`1970-01-01T${curr.end_time}`);
      const nextStart = new Date(`1970-01-01T${next.start_time}`);
      const diffMinutes = (nextStart.getTime() - currEnd.getTime()) / 60000;
      if (diffMinutes > 0) {
        items.push({ type: "break", label: formatBreakDuration(diffMinutes) });
      }
    }
  }
  return items;
}

// ---------- Компонент WeekGrid ----------
function WeekGrid({
  weekDays,
  appointmentsByDay,
}: {
  weekDays: Array<{ label: string; key: string; date: Date }>;
  appointmentsByDay: Record<string, AppointmentRaw[]>;
}) {
  return (
    <div className="flex">
      {weekDays.map((day, dayIdx) => {
        const dayApps = appointmentsByDay[day.key] || [];
        return (
          <div
            key={dayIdx}
            className="w-[44px] flex-shrink-0 relative border-l border-black/20"
          >
            <div className="text-center text-[10px] font-['Poppins'] mb-1">
              {day.label}
            </div>
            <div className="relative w-full" style={{ height: 14 * 60 }}>
              {/* Сетка часов */}
              {Array.from({ length: 14 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-full border-t border-black/20"
                  style={{ top: i * 60 }}
                />
              ))}
              {/* Записи */}
              {dayApps.map((app, idx) => {
                const [startH, startM] = app.start_time.split(":").map(Number);
                const [endH, endM] = app.end_time.split(":").map(Number);
                const startMinutes = (startH - 8) * 60 + startM;
                const endMinutes = (endH - 8) * 60 + endM;
                const duration = endMinutes - startMinutes;
                if (duration <= 0) return null;
                return (
                  <div
                    key={idx}
                    className="absolute left-0 right-0 flex items-stretch"
                    style={{ top: `${startMinutes}px`, height: `${duration}px` }}
                  >
                    <div className="w-[3px] bg-pink-400 rounded-[3px] flex-shrink-0" />
                    <div className="relative flex-1 ml-1">
                      <span className="absolute top-1 left-0 text-[9px] font-['Sofia Sans'] text-black leading-none">
                        {toHHMM(app.start_time)}
                      </span>
                      <span className="absolute bottom-1 left-0 text-[9px] font-['Sofia Sans'] text-black leading-none">
                        {toHHMM(app.end_time)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Основной компонент ----------
export default function SchedulePage() {
  const STATIC_CHAT_ID = 980609742; // TODO: заменить на window.Telegram.WebApp.initDataUnsafe.user.id

  // ---------- Дни ----------
  const [selectedDayKey, setSelectedDayKey] = useState<string>("");
  const [dayTimeline, setDayTimeline] = useState<TimelineItem[]>([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);

  // ---------- Недели ----------
  const [weeksCache, setWeeksCache] = useState<Record<number, Record<string, AppointmentRaw[]>>>({});
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError, setWeekError] = useState<string | null>(null);
  const [visibleWeekIndex, setVisibleWeekIndex] = useState<number | null>(null);

  // ---------- Генерация дней ----------
  const { days, todayKey } = useMemo(() => {
    const today = startOfDay(new Date());
    const range = 365;
    const result: { date: Date; label: string; key: string }[] = [];
    for (let i = -range; i <= range; i++) {
      const date = addDays(today, i);
      result.push({
        date,
        label: format(date, "dd.MM"),
        key: format(date, "yyyy-MM-dd"),
      });
    }
    const currentKey = format(today, "yyyy-MM-dd");
    return { days: result, todayKey: currentKey };
  }, []);

  // Установить сегодня как выбранный день
  useEffect(() => {
    if (todayKey && !selectedDayKey) {
      setSelectedDayKey(todayKey);
    }
  }, [todayKey, selectedDayKey]);

  // Загрузка записей для выбранного дня
  useEffect(() => {
    if (!selectedDayKey) return;
    const fetchDay = async () => {
      setDayLoading(true);
      setDayError(null);
      try {
        const url = `${baseUrl}/master/schedule/date?chat_id=${STATIC_CHAT_ID}&day=${selectedDayKey}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);
        const timeline = buildTimelineWithBreaks(data.appointments);
        setDayTimeline(timeline);
      } catch (err: any) {
        console.error(err);
        setDayError("Не удалось загрузить расписание на этот день");
        setDayTimeline([]);
      } finally {
        setDayLoading(false);
      }
    };
    fetchDay();
  }, [selectedDayKey, STATIC_CHAT_ID]);

  // ---------- Генерация недель ----------
  const weeks = useMemo(() => {
    const today = startOfDay(new Date());
    const totalWeeks = 21;
    const half = Math.floor(totalWeeks / 2);
    const result: Array<Array<{ label: string; key: string; date: Date }>> = [];
    for (let w = -half; w <= half; w++) {
      const weekMonday = startOfWeek(addDays(today, w * 7), { weekStartsOn: 1 });
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekMonday, i);
        return {
          date,
          label: format(date, "dd.MM"),
          key: format(date, "yyyy-MM-dd"),
        };
      });
      result.push(weekDays);
    }
    return result;
  }, []);

  const currentWeekIndex = Math.floor(weeks.length / 2);

  // Функция загрузки данных для недели по индексу (с кэшированием)
  const loadWeek = useCallback(
    async (weekIdx: number) => {
      if (weeksCache[weekIdx] || weekIdx < 0 || weekIdx >= weeks.length) return;
      const weekDays = weeks[weekIdx];
      if (!weekDays) return;

      const monday = weekDays[0].key;
      const url = `${baseUrl}/master/schedule/week?chat_id=${STATIC_CHAT_ID}&day=${monday}`;

      try {
        setWeekLoading(true);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);

        const weekMap: Record<string, AppointmentRaw[]> = {};
        weekDays.forEach((day, idx) => {
          weekMap[day.key] = data.week_appointments[idx] || [];
        });

        setWeeksCache((prev) => ({ ...prev, [weekIdx]: weekMap }));
        setWeekError(null);
      } catch (err: any) {
        console.error(`Ошибка загрузки недели ${weekIdx}:`, err);
        setWeekError(`Не удалось загрузить расписание`);
      } finally {
        setWeekLoading(false);
      }
    },
    [weeks, weeksCache, STATIC_CHAT_ID]
  );

  // IntersectionObserver для определения видимой недели
  const weekScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!weekScrollRef.current || weeks.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          const idx = Array.from(weekScrollRef.current!.children).indexOf(visible.target);
          if (idx !== -1 && idx !== visibleWeekIndex) {
            setVisibleWeekIndex(idx);
          }
        }
      },
      {
        root: weekScrollRef.current,
        threshold: 0.6,
      }
    );

    const weekElements = Array.from(weekScrollRef.current.children);
    weekElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [weeks.length, visibleWeekIndex]);

  // Загружаем видимую неделю и соседние
  useEffect(() => {
    if (visibleWeekIndex !== null) {
      loadWeek(visibleWeekIndex);
      if (visibleWeekIndex > 0) loadWeek(visibleWeekIndex - 1);
      if (visibleWeekIndex < weeks.length - 1) loadWeek(visibleWeekIndex + 1);
    }
  }, [visibleWeekIndex, loadWeek]);

  // При монтировании центрируем текущую неделю и устанавливаем visibleWeekIndex
  useEffect(() => {
    if (weekScrollRef.current && weeks.length > 0) {
      const slides = weekScrollRef.current.children;
      if (slides[currentWeekIndex]) {
        (slides[currentWeekIndex] as HTMLElement).scrollIntoView({
          inline: "center",
          behavior: "auto",
        });
        setVisibleWeekIndex(currentWeekIndex);
      }
    }
  }, [currentWeekIndex, weeks]);

  // ---------- Скролл и выбор дня ----------
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const initialScrollDone = useRef(false);

  const scrollToDay = useCallback((key: string, smooth = true) => {
    const button = dayRefs.current.get(key);
    if (button && scrollContainerRef.current) {
      button.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "nearest",
        inline: "center",
      });
    }
  }, []);

  useEffect(() => {
    if (!initialScrollDone.current && days.length > 0) {
      const timer = setTimeout(() => {
        scrollToDay(todayKey, false);
        initialScrollDone.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [days, todayKey, scrollToDay]);

  const handleSelectDay = useCallback(
    (key: string) => {
      setSelectedDayKey(key);
      scrollToDay(key, true);
    },
    [scrollToDay]
  );

  const setDayRef = useCallback((key: string, el: HTMLButtonElement | null) => {
    if (el) dayRefs.current.set(key, el);
    else dayRefs.current.delete(key);
  }, []);

  // ---------- Рендер ----------
  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        <Link
          to="/"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <img src={homeIconSrc} alt="home" className="w-6 h-6 relative z-10" />
        </Link>

        {/* Header */}
        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}
          >
            schedule
          </h1>
          <p
            className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "0.4px #000" }}
          >
            version for masters
          </p>
        </div>

        {/* Блок "Дни" */}
        <div className="mt-8">
          <h2 className="text-[40px] leading-tight tracking-[-2px] text-black font-['Sofia_Sans']">
            Дни
          </h2>
          <div className="h-px bg-black w-[210px] mb-3" />
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto w-full py-2 scroll-snap-container no-scrollbar"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex gap-1" style={{ paddingLeft: "50%", paddingRight: "50%" }}>
              {days.map((day) => (
                <button
                  key={day.key}
                  ref={(el) => setDayRef(day.key, el)}
                  onClick={() => handleSelectDay(day.key)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-[5px] text-base font-['Sofia_Sans'] transition-all scroll-snap-align-center ${
                    selectedDayKey === day.key
                      ? "border border-black"
                      : "text-black border border-transparent"
                  }`}
                  style={{ scrollSnapAlign: "center" }}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Расписание выбранного дня */}
        <section className="mt-6">
          <div className="flex flex-col gap-1">
            {dayLoading && <p className="text-black/50 italic">Загрузка...</p>}
            {dayError && <p className="text-red-500 text-sm">{dayError}</p>}
            {!dayLoading && !dayError && dayTimeline.length === 0 && (
              <p className="text-black/50 text-sm italic font-['Sofia_Sans']">
                На этот день записей нет
              </p>
            )}
            {!dayLoading &&
              !dayError &&
              dayTimeline.map((item, idx) => {
                if (item.type === "break") {
                  return <RestBreak key={`break-${idx}`} label={item.label} />;
                }
                return (
                  <AppointmentItem
                    key={`app-${idx}`}
                    startTime={item.startTime}
                    endTime={item.endTime}
                    service={item.service}
                    location={item.location}
                  />
                );
              })}
          </div>
        </section>

        {/* Блок "Недели" */}
        <div className="mt-10">
          <h2 className="text-[40px] leading-tight tracking-[-2px] text-black font-['Sofia_Sans']">
            Недели
          </h2>
          <div className="h-px bg-black w-[210px] mb-3" />

          <div className="flex">
            {/* Фиксированный столбец часов */}
            <div className="flex-shrink-0 w-10 mr-1">
              {Array.from({ length: 14 }, (_, i) => i + 8).map((hour) => (
                <div
                  key={hour}
                  className="text-[10px] font-['Sofia Sans'] text-black h-[60px] flex items-center justify-end pr-1"
                >
                  {hour}:00
                </div>
              ))}
            </div>

            {/* Скроллящийся контейнер с неделями */}
            <div
              ref={weekScrollRef}
              className="overflow-x-auto flex-1 flex snap-x snap-mandatory no-scrollbar"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {weekLoading &&
                (visibleWeekIndex === null || !weeksCache[visibleWeekIndex]) && (
                  <p className="text-black/50 italic p-2">Загрузка недели...</p>
                )}
              {weekError && <p className="text-red-500 text-sm p-2">{weekError}</p>}
              {weeks.map((weekDays, idx) => {
                const weekData = weeksCache[idx];
                return (
                  <div key={idx} className="snap-center flex-shrink-0">
                    <WeekGrid weekDays={weekDays} appointmentsByDay={weekData || {}} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .scroll-snap-container { scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
        .scroll-snap-align-center { scroll-snap-align: center; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .snap-x { scroll-snap-type: x mandatory; }
        .snap-mandatory { --tw-scroll-snap-strictness: mandatory; }
        .snap-center { scroll-snap-align: center; }
      `}</style>
    </div>
  );
}