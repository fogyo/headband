import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Calendar, Clock, Banknote } from "lucide-react";
import { addDays, format, startOfDay } from "date-fns";
import backIconSrc from "@/assets/back_icon.svg";
import loadingSpinner from "@/assets/loading.svg";
import { toast } from "sonner";

import appointmentHairdressingImg from "@/assets/appointment_card_hairdressing.png";
import appointmentCosmetologyImg from "@/assets/appointment_card_cosmetology.png";
import appointmentNailsImg from "@/assets/appointment_card_nails.png";
import appointmentBrowsLashesImg from "@/assets/appointment_card_lashes.png";
import appointmentEpilationImg from "@/assets/appointment_card_epilation.png";
import appointmentMakeupImg from "@/assets/appointment_card_makeup.png";
import appointmentSolariumImg from "@/assets/appointment_card_solarium.png";
import appointmentMassageSpaImg from "@/assets/appointment_card_massage.png";
import appointmentConsultationsImg from "@/assets/appointment_card_consultation.png";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
const STATIC_CHAT_ID = 980609742;

const categoryImages: Record<string, string> = {
  "hairdressing": appointmentHairdressingImg,
  "cosmetology": appointmentCosmetologyImg,
  "nails": appointmentNailsImg,
  "brows-lashes": appointmentBrowsLashesImg,
  "epilation": appointmentEpilationImg,
  "makeup": appointmentMakeupImg,
  "solarium": appointmentSolariumImg,
  "massage-spa": appointmentMassageSpaImg,
  "consultations": appointmentConsultationsImg,
  "other": appointmentHairdressingImg,
};

// ---------- Генерация дней ----------
const today = startOfDay(new Date());
const startDate = addDays(today, 1);
const days: { date: Date; label: string; key: string }[] = Array.from({ length: 365 }, (_, i) => {
  const date = addDays(startDate, i);
  return { date, label: format(date, "dd.MM"), key: format(date, "yyyy-MM-dd") };
});
const todayKey = format(startDate, "yyyy-MM-dd");

export default function BookAppointmentPage() {
  const { masterId, serviceId } = useParams<{ masterId: string; serviceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { serviceName, servicePrice, serviceDuration } = (location.state as {
    serviceName?: string;
    servicePrice?: number;
    serviceDuration?: number;
  }) || {};

  const [selectedDayKey, setSelectedDayKey] = useState<string>(todayKey);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingTime, setLoadingTime] = useState(false);
  const [loadingBook, setLoadingBook] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [address, setAddress] = useState<string>("");
  const [parentalCategory, setParentalCategory] = useState<string>("");

  const fetchTimeSlots = async (dayKey: string) => {
    if (!serviceId) return;
    setLoadingTime(true);
    setError(null);
    setSelectedTime(null);
    try {
      const url = `${baseUrl}/users/booking/?price_id=${serviceId}&day=${dayKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      const times = data.possible_time.map((t: string) => t.slice(0, 5));
      setAvailableTimes(times);
      setAddress(data.address || "Адрес не указан");
      setParentalCategory(data.parental_category || "");
    } catch (err: any) {
      console.error(err);
      setError("Не удалось загрузить доступное время");
      toast.error(err.message || "Ошибка загрузки");
    } finally {
      setLoadingTime(false);
    }
  };

  useEffect(() => {
    fetchTimeSlots(selectedDayKey);
  }, [selectedDayKey, serviceId]);

  // ---------- Карусель дней ----------
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
    setSelectedTime(null);
    scrollToDay(key, true);
  }, [scrollToDay]);

  const setDayRef = useCallback((key: string, el: HTMLButtonElement | null) => {
    if (el) dayRefs.current.set(key, el);
    else dayRefs.current.delete(key);
  }, []);

  // ---------- Запись ----------
  const handleBook = async () => {
    if (!selectedTime || !serviceId) return;
    setLoadingBook(true);
    try {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const startTime = new Date();
      startTime.setHours(hours, minutes, 0, 0);
      const isoTime = startTime.toTimeString().slice(0, 8);

      const res = await fetch(`${baseUrl}/users/booking/create_appointment?chat_id=${STATIC_CHAT_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_id: serviceId,
          day: selectedDayKey,
          start_time: isoTime,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Ошибка записи");
      }
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      toast.success("Вы успешно записаны!");
      navigate("/user");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось записаться");
    } finally {
      setLoadingBook(false);
    }
  };

  // ---------- Данные для итога ----------
  const serviceInfo = {
    name: serviceName || "Услуга",
    address: address,
    price: servicePrice ? `${servicePrice} ₽` : "—",
    durationMinutes: serviceDuration || 60,
  };

  const endTime = selectedTime
    ? (() => {
        const [h, m] = selectedTime.split(":").map(Number);
        const totalMinutes = h * 60 + m + serviceInfo.durationMinutes;
        const endH = Math.floor(totalMinutes / 60) % 24;
        const endM = totalMinutes % 60;
        return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
      })()
    : null;

  // Выбор картинки по категории
  const image = categoryImages[parentalCategory] || appointmentHairdressingImg;

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        <button onClick={() => navigate(-1)} className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]">
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIconSrc} alt="back" className="w-6 h-6 relative z-10" />
        </button>

        <div className="pt-8 pb-2">
          <h1 className="text-[40px] leading-tight tracking-[3.2px] text-transparent" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}>booking</h1>
        </div>

        {/* День */}
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
          ) : error ? (
            <p className="text-red-500 text-[16px] tracking-[-0.8px] font-['Sofia_Sans']">{error}</p>
          ) : availableTimes.length === 0 ? (
            <p className="text-black/50 text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] italic py-4">
              На эту дату свободных окон нет.
            </p>
          ) : (
            <div className="max-h-[220px] overflow-y-auto pr-2 custom-scrollbar rounded-[20px]">
              <div className="grid grid-cols-4 gap-x-4 gap-y-3">
                {availableTimes.map((time) => {
                  const isSelected = selectedTime === time;
                  return (
                    <div key={time} className="flex items-center gap-2">
                      <div
                        className="relative w-[11px] h-[50px] rounded-[20px] overflow-hidden flex-shrink-0"
                        style={{
                          boxShadow:
                            "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)",
                          border: "0.5px solid rgba(0,0,0,0.00)",
                        }}
                      >
                        <div className="absolute inset-0 bg-white rounded-[20px] blur-[20px] opacity-80" />
                        <div className={`w-full h-full rounded-[20px] ${isSelected ? "bg-black" : "bg-[#FFE9EF]"}`} />
                      </div>
                      <button
                        onClick={() => setSelectedTime(time)}
                        className={`text-[20px] tracking-[-1px] font-['Sofia_Sans'] flex-shrink-0 ${
                          isSelected ? "text-black font-bold" : "text-black"
                        }`}
                      >
                        {time}
                      </button>
                    </div>
                  );
                })}
              </div>
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
                disabled={!selectedTime || loadingBook}
                className="mt-3 bg-[#7FD1AE]/60 rounded-[5px] h-6 w-28 text-black text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] self-center disabled:opacity-50"
                style={{
                  boxShadow:
                    "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)",
                  border: "0.5px solid rgba(0,0,0,0.00)",
                }}
              >
                {loadingBook ? "Запись..." : "Записаться"}
              </button>
            </div>

            <div
              className="w-[60%] flex-shrink-0 rounded-[10px] overflow-hidden border border-white"
              style={{
                backgroundImage: `url(${image})`,
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.25);
        }
      `}</style>
    </div>
  );
}