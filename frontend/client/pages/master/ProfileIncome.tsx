import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import backIcon from "@/assets/back_icon.svg";
import { toast } from "sonner";
import { useTelegramAuth } from "@/App";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ---------- Типы ----------
interface AppointmentToConfirm {
  id: string;
  service: string;
  date: string;
  price: string;
  confirmed: boolean | null;
}

interface PendingAppointmentApi {
  appo_id: string;
  name: string;
  day: string;
  start_time: string;
  end_time: string;
  price: number;
}

// ---------- Вспомогательные функции ----------
const monthNames = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const formatDateToDDMM = (iso: string): string => {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}`;
};

const toHHMM = (timeWithSec: string): string => timeWithSec.slice(0, 5);

const formatAppointment = (app: PendingAppointmentApi): AppointmentToConfirm => ({
  id: app.appo_id,
  service: app.name,
  date: `${formatDateToDDMM(app.day)}, ${toHHMM(app.start_time)}-${toHHMM(app.end_time)}`,
  price: `${app.price} ₽`,
  confirmed: null,
});

const getMonthRange = (year: number, monthIndex: number): { start: string; end: string } => {
  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 0);
  const start = startDate.toISOString().slice(0, 10);
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
};

// ---------- Компонент строки подтверждения ----------
const ConfirmationRow = ({ appointment, onConfirm, onDecline }: { appointment: AppointmentToConfirm; onConfirm: () => void; onDecline: () => void }) => (
  <div className="flex items-stretch gap-3 pl-4">
    <div className="relative w-[10px] flex-shrink-0">
      <div className="absolute inset-0 bg-white rounded-[20px] blur-[20px] opacity-80" />
      <div className="w-[10px] h-full bg-[#FFD0DC] rounded-[20px] shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]" style={{ border: "0.5px solid rgba(0,0,0,0.00)" }} />
    </div>
    <div className="flex-1 flex flex-col justify-center">
      <p className="text-base font-['Sofia_Sans'] text-black">{appointment.service}</p>
      <p className="text-sm font-['Sofia_Sans'] text-black/50">{appointment.date}</p>
      <p className="text-sm font-['Sofia_Sans'] text-black/50">{appointment.price}</p>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      {appointment.confirmed === null ? (
        <>
          <button onClick={onConfirm} className="relative bg-[#FFE9EF] rounded-[10px] h-10 w-28 flex items-center justify-center shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
            <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">Подтвердить</span>
          </button>
          <button onClick={onDecline} className="relative w-10 h-10 bg-[#FFE9EF] rounded-[10px] flex items-center justify-center shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
            <X className="w-5 h-5 text-black/50" />
          </button>
        </>
      ) : appointment.confirmed ? (
        <div className="relative bg-[#7FD1AE]/60 rounded-[10px] h-10 w-28 flex items-center justify-center shadow">
          <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/50">Добавлено</span>
        </div>
      ) : (
        <div className="relative bg-[#FA4F96] rounded-[10px] h-10 w-28 flex items-center justify-center shadow">
          <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-white/50">Удалено</span>
        </div>
      )}
    </div>
  </div>
);

export default function ProfileIncomePage() {
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentToConfirm[]>([]);

  const today = new Date();
  const [monthIndex, setMonthIndex] = useState(today.getMonth());
  const currentYear = today.getFullYear();
  const [monthAmount, setMonthAmount] = useState(0);
  const [monthNumber, setMonthNumber] = useState(0);

  const fetchEarningsForRange = async (startDate: string, endDate: string): Promise<{ amount: number; number: number }> => {
    if (!chatId) throw new Error("Нет chat_id");
    const url = `${baseUrl}/master/profile/earnings/range?chat_id=${chatId}&start_date=${startDate}&end_date=${endDate}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Ошибка загрузки доходов за период");
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.status);
    return { amount: data.amount, number: data.number };
  };

  const loadMonthData = async () => {
    const { start, end } = getMonthRange(currentYear, monthIndex);
    try {
      const { amount, number } = await fetchEarningsForRange(start, end);
      setMonthAmount(amount);
      setMonthNumber(number);
    } catch (err: any) {
      console.error(err);
      toast.error("Не удалось загрузить доходы за месяц");
    }
  };

  const loadPendingAppointments = async () => {
    if (!chatId) return;
    const res = await fetch(`${baseUrl}/master/profile/earnings/confirmation?chat_id=${chatId}`);
    if (!res.ok) throw new Error("Ошибка загрузки подтверждений");
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.status);
    setAppointments(data.pending_appos.map(formatAppointment));
  };

  const loadAll = async () => {
    if (!isVerified || !chatId) return;
    try {
      setLoading(true);
      await Promise.all([loadMonthData(), loadPendingAppointments()]);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Не удалось загрузить данные");
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (authError) {
      setError(authError);
      setLoading(false);
      return;
    }
    if (isVerified && chatId) {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [isVerified, chatId, authLoading, authError]);

  useEffect(() => {
    if (!loading && isVerified && chatId) {
      loadMonthData();
    }
  }, [monthIndex]);

  const prevMonth = () => setMonthIndex((prev) => (prev === 0 ? 11 : prev - 1));
  const nextMonth = () => setMonthIndex((prev) => (prev === 11 ? 0 : prev + 1));

  const handleConfirm = async (id: string) => {
    if (!chatId) return;
    try {
      const res = await fetch(`${baseUrl}/master/profile/earnings/confirm?chat_id=${chatId}&appointment_id=${id}`, { method: "POST" });
      if (!res.ok) throw new Error("Ошибка подтверждения");
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      setAppointments(prev => prev.map(app => app.id === id ? { ...app, confirmed: true } : app));
      await loadMonthData();
      ///toast.success("Подтверждено");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDecline = async (id: string) => {
    if (!chatId) return;
    try {
      const res = await fetch(`${baseUrl}/master/profile/earnings/cancel?appo_id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка отклонения");
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      setAppointments(prev => prev.map(app => app.id === id ? { ...app, confirmed: false } : app));
      await loadMonthData();
      toast("Отклонено");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }

  if (authError || error) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500 font-['Sofia_Sans']">{authError || error}</p>
      </div>
    );
  }

  if (!isVerified || !chatId) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500 font-['Sofia_Sans']">Ошибка авторизации</p>
      </div>
    );
  }

  const formattedMonthAmount = `${monthAmount} ₽`;
  const formattedMonthCount = `${monthNumber} встреч`;

  return (
    <div className="min-h-screen bg-[#FFE9EF] overflow-hidden">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        <Link to="/profile" className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]">
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIcon} alt="back" className="w-6 h-6 relative z-10" />
        </Link>

        <div className="pt-8 pb-2">
          <h1 className="text-[40px] leading-tight tracking-[3.2px] text-transparent" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}>profile</h1>
          <p className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "0.4px #000" }}>version for masters</p>
        </div>

        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Доходы</h2>
          <div className="h-px bg-black w-56 mb-4" />

          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={prevMonth} className="w-6 h-6 flex items-center justify-center"><ChevronLeft className="w-4 h-4 text-black" /></button>
              <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">{monthNames[monthIndex]}</span>
              <button onClick={nextMonth} className="w-6 h-6 flex items-center justify-center"><ChevronRight className="w-4 h-4 text-black" /></button>
            </div>
            <div className="w-40 h-40 rounded-full border-[5px] border-black flex flex-col items-center justify-center">
              <span className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">{formattedMonthAmount}</span>
              <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/50">{formattedMonthCount}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 mb-6">
            {appointments.map((app) => (
              <ConfirmationRow key={app.id} appointment={app} onConfirm={() => handleConfirm(app.id)} onDecline={() => handleDecline(app.id)} />
            ))}
            {appointments.length === 0 && <p className="text-center text-black/50">Нет записей, ожидающих подтверждения</p>}
          </div>
        </section>
      </div>
    </div>
  );
}