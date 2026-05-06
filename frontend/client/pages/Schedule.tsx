import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import homeIconSrc from "@/assets/home.svg";
import { addDays, format, startOfDay, startOfWeek } from "date-fns";
import AppointmentItem from "@/components/AppointmentItem";
import RestBreak from "@/components/RestBreak";

// Моковые данные (ключи в формате YYYY-MM-DD)
const scheduleData: Record<string, Array<any>> = {
  "2026-05-03": [
    { startTime: "10:00", endTime: "10:40", service: "Стрижка", location: "Невский пр-кт 12" },
    { type: "break", label: "Отдых 2 часа 20 минут" },
    { startTime: "11:00", endTime: "14:30", service: "Покраска", location: "Мелирование" },
  ],
  "2026-05-04": [
    { startTime: "11:00", endTime: "12:00", service: "Укладка", location: "Невский пр-кт 12" },
    { type: "break", label: "Отдых 30 минут" },
    { startTime: "12:30", endTime: "13:30", service: "Стрижка", location: "Британка" },
  ],
  "2026-05-10": [
    { startTime: "09:00", endTime: "10:00", service: "Маникюр", location: "Центральный салон" },
  ],
};

// Компонент сетки дней (без столбца часов)
function WeekGrid({ days }: { days: Array<{ label: string; key: string }> }) {
  return (
    <div className="flex">
      {days.map((day, dayIdx) => {
        const dayAppointments = scheduleData[day.key] || [];
        return (
          <div
            key={dayIdx}
            className="w-[44px] flex-shrink-0 relative border-l border-black/20"
          >
            <div className="text-center text-[10px] font-['Poppins'] mb-1">
              {day.label}
            </div>

            <div className="relative w-full" style={{ height: 14 * 60 }}>
              {Array.from({ length: 14 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-full border-t border-black/20"
                  style={{ top: i * 60 }}
                />
              ))}

              {dayAppointments
                .filter((app) => app.type !== "break")
                .map((app, idx) => {
                  const [startH, startM] = app.startTime.split(":").map(Number);
                  const [endH, endM] = app.endTime.split(":").map(Number);
                  const startMinutes = (startH - 8) * 60 + startM;
                  const endMinutes = (endH - 8) * 60 + endM;
                  const duration = endMinutes - startMinutes;
                  if (duration <= 0) return null;

                  const top = startMinutes;
                  const height = duration;

                  return (
                    <div
                      key={idx}
                      className="absolute left-0 right-0 flex items-stretch"
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <div className="w-[3px] bg-pink-400 rounded-[3px] flex-shrink-0" />
                      <div className="relative flex-1 ml-1">
                        <span className="absolute top-1 left-0 text-[9px] font-['Sofia Sans'] text-black leading-none">
                          {app.startTime}
                        </span>
                        <span className="absolute bottom-1 left-0 text-[9px] font-['Sofia Sans'] text-black leading-none">
                          {app.endTime}
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

export default function SchedulePage() {
  // Генерация дней
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

  // Генерация недель
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

  const weekScrollRef = useRef<HTMLDivElement>(null);
  const currentWeekIndex = Math.floor(weeks.length / 2);

  // Центрируем текущую неделю при монтировании
  useEffect(() => {
    if (weekScrollRef.current && weeks.length > 0) {
      const slides = weekScrollRef.current.children;
      if (slides[currentWeekIndex]) {
        (slides[currentWeekIndex] as HTMLElement).scrollIntoView({
          inline: "center",
          behavior: "auto",
        });
      }
    }
  }, [currentWeekIndex, weeks]);

  const [selectedDayKey, setSelectedDayKey] = useState<string>(todayKey);
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

  const handleSelectDay = useCallback((key: string) => {
    setSelectedDayKey(key);
    scrollToDay(key, true);
  }, [scrollToDay]);

  const appointments = scheduleData[selectedDayKey] || [];

  const setDayRef = useCallback((key: string, el: HTMLButtonElement | null) => {
    if (el) {
      dayRefs.current.set(key, el);
    } else {
      dayRefs.current.delete(key);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка Home */}
        <Link
          to="/"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
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

        {/* Дни */}
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
            {appointments.length === 0 && (
              <p className="text-black/50 text-sm italic font-['Sofia_Sans']">
                На этот день записей нет
              </p>
            )}
            {appointments.map((item, idx) => {
              if (item.type === "break") {
                return <RestBreak key={idx} label={item.label} />;
              }
              return (
                <AppointmentItem
                  key={idx}
                  startTime={item.startTime}
                  endTime={item.endTime}
                  service={item.service}
                  location={item.location}
                />
              );
            })}
          </div>
        </section>

        {/* Недели (с фиксированным столбцом часов) */}
        <div className="mt-10">
          <h2
            className="text-[40px] leading-tight tracking-[-2px] text-black"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
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
              {weeks.map((weekDays, idx) => (
                <div key={idx} className="snap-center flex-shrink-0">
                  <WeekGrid days={weekDays} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Дополнительные стили */}
      <style>{`
        .scroll-snap-container {
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .scroll-snap-align-center {
          scroll-snap-align: center;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .snap-x {
          scroll-snap-type: x mandatory;
        }
        .snap-mandatory {
          --tw-scroll-snap-strictness: mandatory;
        }
        .snap-center {
          scroll-snap-align: center;
        }
      `}</style>
    </div>
  );
}