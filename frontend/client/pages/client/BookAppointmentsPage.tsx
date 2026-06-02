// client/pages/BookAppointmentPage.tsx
import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, Banknote } from "lucide-react";
import { addDays, format, startOfDay } from "date-fns";
import backIconSrc from "@/assets/back_icon.svg";
import appointmentImage from "@/assets/appointment_card.png";
import loadingSpinner from "@/assets/loading.svg";

// ---------- Генерация дней ----------
const today = startOfDay(new Date());
const days: { date: Date; label: string; key: string }[] = Array.from({ length: 365 }, (_, i) => {
  const date = addDays(today, i);
  return { date, label: format(date, "dd.MM"), key: format(date, "yyyy-MM-dd") };
});
const todayKey = format(today, "yyyy-MM-dd");

// ---------- Мок-данные для разных дней ----------
const mockTimeSlotsByDate: Record<string, { time: string; free: boolean }[]> = {
  [todayKey]: [
    { time: "9:00", free: true },
    { time: "9:10", free: true },
    { time: "9:20", free: true },
    { time: "9:30", free: true },
    { time: "11:00", free: true },
    { time: "11:10", free: false },
    { time: "13:40", free: true },
    { time: "13:50", free: true },
    { time: "16:50", free: true },
    { time: "17:00", free: true },
    { time: "18:20", free: true },
    { time: "18:30", free: true },
  ],
  [format(addDays(today, 1), "yyyy-MM-dd")]: [
    { time: "10:00", free: true },
    { time: "10:30", free: false },
    { time: "11:00", free: true },
    { time: "14:00", free: true },
    { time: "15:30", free: true },
  ],
  [format(addDays(today, 2), "yyyy-MM-dd")]: [], // день полностью занят
};

function getTimeSlotsForDate(dateKey: string) {
  return mockTimeSlotsByDate[dateKey] || [];
}

export default function BookAppointmentPage() {
  const { masterId, serviceId } = useParams<{ masterId: string; serviceId: string }>();
  const navigate = useNavigate();

  // ---------- Карусель дней ----------
  const [selectedDayKey, setSelectedDayKey] = useState<string>(todayKey);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const initialScrollDone = useRef(false);

  const scrollToDay = useCallback((key: string, smooth = true) => {
    const button = dayRefs.current.get(key);
    if (button && scrollContainerRef.current) {
      button.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "nearest", inline: "center" });
    }
  }, []);

  useEffect(() => {
    if (!initialScrollDone.current && days.length > 0) {
      const timer = setTimeout(() => { scrollToDay(todayKey, false); initialScrollDone.current = true; }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSelectDay = useCallback((key: string) => {
    setSelectedDayKey(key);
    setSelectedTime(null);   // сброс выбранного времени при смене дня
    scrollToDay(key, true);
    setLoadingTime(true);
    setTimeout(() => setLoadingTime(false), 250);
  }, [scrollToDay]);

  const setDayRef = useCallback((key: string, el: HTMLButtonElement | null) => {
    if (el) dayRefs.current.set(key, el);
    else dayRefs.current.delete(key);
  }, []);

  // ---------- Время ----------
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingTime, setLoadingTime] = useState(false);
  const [timeSlots, setTimeSlots] = useState(getTimeSlotsForDate(todayKey));

  useEffect(() => {
    setTimeSlots(getTimeSlotsForDate(selectedDayKey));
  }, [selectedDayKey]);

  // ---------- Итог ----------
  const serviceInfo = {
    name: "Мужская стрижка",
    address: "Невский пр-кт, 12",
    price: "1300 ₽",
    durationMinutes: 120,
  };

  // Вычисляем время окончания на основе выбранного времени и длительности услуги
  const endTime = selectedTime
    ? (() => {
        const [h, m] = selectedTime.split(":").map(Number);
        const totalMinutes = h * 60 + m + serviceInfo.durationMinutes;
        const endH = Math.floor(totalMinutes / 60) % 24;
        const endM = totalMinutes % 60;
        return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
      })()
    : null;

   const handleBook = () => {
    if (!selectedTime) return;
    // Здесь будет реальный API-запрос
    alert(`Вы записались на ${selectedDayKey} в ${selectedTime}`);
    // После подтверждения переходим на главную страницу пользователя
    navigate("/user");
  };

  const freeSlots = timeSlots.filter(slot => slot.free);

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка Back */}
        <button onClick={() => navigate(-1)} className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]">
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIconSrc} alt="back" className="w-6 h-6 relative z-10" />
        </button>

        {/* Header */}
        <div className="pt-8 pb-2">
          <h1 className="text-[40px] leading-tight tracking-[3.2px] text-transparent" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}>booking</h1>
        </div>

        {/* День (карусель) */}
        <section className="mt-8">
          <h2 className="text-[32px] leading-tight tracking-[-1.6px] text-black font-['Sofia_Sans']">День</h2>
          <div className="h-px bg-black w-[210px] mb-3" />
          <div ref={scrollContainerRef} className="overflow-x-auto w-full py-3 scroll-snap-container no-scrollbar" style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
            <div className="flex gap-1" style={{ paddingLeft: "50%", paddingRight: "50%" }}>
              {days.map((day) => (
                <button key={day.key} ref={(el) => setDayRef(day.key, el)} onClick={() => handleSelectDay(day.key)} className={`flex-shrink-0 px-2.5 py-1.5 rounded-[5px] text-[20px] tracking-[-1px] font-['Sofia_Sans'] transition-all scroll-snap-align-center ${selectedDayKey === day.key ? "border border-black" : "text-black border border-transparent"}`} style={{ scrollSnapAlign: "center" }}>{day.label}</button>
              ))}
            </div>
          </div>
        </section>

        {/* Время */}
        <section className="mt-10">
        <h2 className="text-[32px] leading-tight tracking-[-1.6px] text-black" style={{ fontFamily: "'Sofia Sans', sans-serif" }}>Время</h2>
        <div className="h-px bg-black w-[210px] mb-3" />

        {loadingTime ? (
          <div className="flex justify-center items-center py-8">
            <img src={loadingSpinner} alt="Загрузка..." className="w-12 h-12" />
          </div>
        ) : freeSlots.length === 0 ? (
          <p className="text-black/50 text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] italic py-4">
            На эту дату, к сожалению, записаться не получится
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-x-4 gap-y-3">
            {freeSlots.map((slot) => {
              const isSelected = selectedTime === slot.time;
              return (
                <div key={slot.time} className="flex items-center gap-2">
                  <div
                    className="relative w-[11px] h-[50px] rounded-[20px] overflow-hidden flex-shrink-0"
                    style={{
                      boxShadow:
                        "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)",
                      border: "0.5px solid rgba(0,0,0,0.00)",
                    }}
                  >
                    <div className="absolute inset-0 bg-white rounded-[20px] blur-[20px] opacity-80" />
                    <div className={`w-full h-full rounded-[20px] ${isSelected ? "bg-pink-400" : "bg-[#FFE9EF]"}`} />
                  </div>
                  <button
                    onClick={() => setSelectedTime(slot.time)}
                    className={`text-[20px] tracking-[-1px] font-['Sofia_Sans'] flex-shrink-0 ${
                      isSelected ? "text-pink-600 font-bold" : "text-black"
                    }`}
                  >
                    {slot.time}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
        {/* Итог */}
        <section className="mt-10">
          <h2 className="text-[32px] leading-tight tracking-[-1.6px] text-black" style={{ fontFamily: "'Sofia Sans', sans-serif" }}>Итог</h2>
          <div className="h-px bg-black w-[210px] mb-4" />

          <div
            className="relative bg-[#FFE9EF] rounded-[10px] p-4 shadow-md flex gap-3"
            style={{
              boxShadow:
                "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)",
              border: "0.5px solid rgba(0,0,0,0.00)",
              background: "#FFE9EF",
            }}
          >
            {/* Левая часть: информация */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <p className="text-[15px] tracking-[-0.75px] font-['Sofia_Sans'] text-black leading-tight">
                  {serviceInfo.name}
                </p>
                <p className="text-[10px] tracking-[-0.5px] font-['Sofia_Sans'] text-black/50 mt-1">
                  {serviceInfo.address}
                </p>
                <div className="h-px bg-black w-30 my-2 mx-auto" />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                    <Calendar className="w-full h-full text-black/100" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] tracking-[-0.5px] font-['Sofia_Sans'] text-black/50 leading-tight">Дата</span>
                    <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black leading-tight truncate">
                      {selectedDayKey}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                    <Clock className="w-full h-full text-black/100" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] tracking-[-0.5px] font-['Sofia_Sans'] text-black/50 leading-tight">Время</span>
                    <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black leading-tight truncate">
                      {selectedTime && endTime ? `${selectedTime}–${endTime}` : "—"}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                    <Banknote className="w-full h-full text-black/100" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] tracking-[-0.5px] font-['Sofia_Sans'] text-black/50 leading-tight">Цена</span>
                    <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black leading-tight truncate">
                      {serviceInfo.price}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleBook}
                disabled={!selectedTime}
                className="mt-3 bg-[#7FD1AE]/60 rounded-[5px] h-6 w-28 text-black text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] self-center disabled:opacity-50"
                style={{
                  boxShadow:
                    "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)",
                  border: "0.5px solid rgba(0,0,0,0.00)",
                }}
              >
                Записаться
              </button>
            </div>

            {/* Правая часть: фото */}
            <div
              className="w-[60%] flex-shrink-0 rounded-[10px] overflow-hidden border border-white"
              style={{
                backgroundImage: `url(${appointmentImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                boxShadow: "4px 4px 4px 0 rgba(0, 0, 0, 0.25) inset",
                aspectRatio: "205 / 190",
              }}
            />
          </div>
        </section>
      </div>
      <style>{`
        .scroll-snap-container { scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
        .scroll-snap-align-center { scroll-snap-align: center; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}