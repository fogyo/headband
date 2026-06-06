import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import backIcon from "@/assets/back_icon.svg";
import cardIcon from "@/assets/bank_card_icon.svg";
import { toast } from "sonner";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ---------- Типы ----------
interface AppointmentToConfirm {
  id: string;
  service: string;
  date: string;
  price: string;
  confirmed: boolean | null;
}

interface PrepayPeriod {
  id: string;
  start: string;   // "DD.MM"
  end: string;
  percent: string; // "30%"
}

interface PendingAppointmentApi {
  appo_id: string;
  name: string;
  day: string;
  start_time: string;
  end_time: string;
  price: number;
}

interface PrepayApi {
  id: string;
  percent: number;
  start_date: string;
  end_date: string;
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

const formatPrepay = (prepay: PrepayApi): PrepayPeriod => ({
  id: prepay.id,
  start: formatDateToDDMM(prepay.start_date),
  end: formatDateToDDMM(prepay.end_date),
  percent: `${prepay.percent}%`,
});

const ddmmToIso = (ddmm: string): string => {
  if (!ddmm) return "";
  const [day, month] = ddmm.split(".");
  const year = new Date().getFullYear();
  return `${year}-${month}-${day}`;
};

const getMonthRange = (year: number, monthIndex: number): { start: string; end: string } => {
  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 0);
  const start = startDate.toISOString().slice(0, 10);
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
};

// ---------- Компонент DatePicker (календарь) ----------
const DatePicker = ({
  value,
  onChange,
}: {
  value: string;    // формат "DD.MM"
  onChange: (v: string) => void;
}) => {
  const toInputValue = (ddmm: string): string => {
    if (!ddmm) return "";
    const parts = ddmm.split(".");
    if (parts.length !== 2) return "";
    const [day, month] = parts;
    if (!day || !month) return "";
    if (isNaN(Number(day)) || isNaN(Number(month))) return "";
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  };

  const fromInputValue = (iso: string): string => {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length !== 3) return "";
    const [, month, day] = parts;
    if (!day || !month) return "";
    return `${day}.${month}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIso = e.target.value;
    if (newIso) onChange(fromInputValue(newIso));
    else onChange("");
  };

  const inputValue = toInputValue(value);

  return (
    <div
      className="bg-[#FFE9EF] rounded-[5px] h-7 flex items-center justify-center w-full"
      style={{
        boxShadow:
          "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
      }}
    >
      <input
        type="date"
        value={inputValue}
        onChange={handleChange}
        className="bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center w-full px-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:p-0"
        style={{ fontFamily: "'Sofia Sans', sans-serif" }}
      />
    </div>
  );
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
  const STATIC_CHAT_ID = 980609742;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentToConfirm[]>([]);

  const today = new Date();
  const [monthIndex, setMonthIndex] = useState(today.getMonth());
  const currentYear = today.getFullYear();
  const [monthAmount, setMonthAmount] = useState(0);
  const [monthNumber, setMonthNumber] = useState(0);

  const [prepayPeriods, setPrepayPeriods] = useState<PrepayPeriod[]>([]);
  const [newPrepay, setNewPrepay] = useState({ start: "", end: "", percent: "" });

  // Карта – заглушка
  const [hasCard, setHasCard] = useState(false);
  const [cardLast4, setCardLast4] = useState("");
  const [cardInput, setCardInput] = useState("");
  const [isEditingCard, setIsEditingCard] = useState(false);

  // ---------- Загрузка доходов по диапазону ----------
  const fetchEarningsForRange = async (startDate: string, endDate: string): Promise<{ amount: number; number: number }> => {
    const url = `${baseUrl}/master/profile/earnings/range?chat_id=${STATIC_CHAT_ID}&start_date=${startDate}&end_date=${endDate}`;
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
    const res = await fetch(`${baseUrl}/master/profile/earnings/confirmation?chat_id=${STATIC_CHAT_ID}`);
    if (!res.ok) throw new Error("Ошибка загрузки подтверждений");
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.status);
    setAppointments(data.pending_appos.map(formatAppointment));
  };

  const loadPrepayments = async () => {
    const res = await fetch(`${baseUrl}/master/profile/earnings/prepayments?chat_id=${STATIC_CHAT_ID}`);
    if (!res.ok) throw new Error("Ошибка загрузки предоплат");
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.status);
    setPrepayPeriods(data.prepayments.map(formatPrepay));
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      await Promise.all([loadMonthData(), loadPendingAppointments(), loadPrepayments()]);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Не удалось загрузить данные");
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const prevMonth = () => setMonthIndex((prev) => (prev === 0 ? 11 : prev - 1));
  const nextMonth = () => setMonthIndex((prev) => (prev === 11 ? 0 : prev + 1));
  useEffect(() => { if (!loading) loadMonthData(); }, [monthIndex]);

  const handleConfirm = async (id: string) => {
    try {
      const res = await fetch(`${baseUrl}/master/profile/earnings/confirm?chat_id=${STATIC_CHAT_ID}&appointment_id=${id}`, { method: "POST" });
      if (!res.ok) throw new Error("Ошибка подтверждения");
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      setAppointments(prev => prev.map(app => app.id === id ? { ...app, confirmed: true } : app));
      await loadMonthData();
      toast.success("Подтверждено");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDecline = async (id: string) => {
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

  const addPrepayPeriod = async () => {
    if (!newPrepay.start || !newPrepay.end || !newPrepay.percent) {
      toast.warning("Заполните все поля");
      return;
    }
    const percentNum = parseInt(newPrepay.percent, 10);
    if (isNaN(percentNum)) {
      toast.warning("Процент должен быть числом");
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/master/profile/earnings/prepayments/create?chat_id=${STATIC_CHAT_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percent: percentNum,
          start_date: ddmmToIso(newPrepay.start),
          end_date: ddmmToIso(newPrepay.end),
        }),
      });
      if (!res.ok) throw new Error("Ошибка создания периода");
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      await loadPrepayments();
      setNewPrepay({ start: "", end: "", percent: "" });
      toast.success("Период установлен");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center"><p>Загрузка...</p></div>;
  if (error) return <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center"><p className="text-red-500">{error}</p></div>;

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

          <section className="mt-10">
            <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Установить период<br /> предоплаты</h2>
            <div className="h-px bg-black w-56 mb-4" />
            <div className="flex items-center gap-2 mb-1 text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/100">
              <div className="flex-1 text-center">начало</div>
              <div className="flex-1 text-center">конец</div>
              <div className="flex-1 text-center">процент*</div>
            </div>
            {prepayPeriods.map((p) => (
              <div key={p.id} className="flex items-center gap-2 mb-2">
                <div className="flex-1 text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">{p.start}</div>
                <div className="flex-1 text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">{p.end}</div>
                <div className="flex-1 text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">{p.percent}</div>
              </div>
            ))}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1"><DatePicker value={newPrepay.start} onChange={(v) => setNewPrepay(p => ({ ...p, start: v }))} /></div>
              <div className="flex-1"><DatePicker value={newPrepay.end} onChange={(v) => setNewPrepay(p => ({ ...p, end: v }))} /></div>
              <div className="flex-1">
                <input type="number" placeholder="%" value={newPrepay.percent} onChange={(e) => setNewPrepay(p => ({ ...p, percent: e.target.value }))} className="w-full bg-[#FFE9EF] rounded-[5px] h-7 text-[12px] font-['Sofia_Sans'] text-black outline-none text-center shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mt-4">
              <p className="text-[8px] font-['Sofia_Sans'] text-black/50 max-w-[200px] flex-shrink-0 leading-tight">*процент от стоимости услуги. headband берет 100руб за каждый день из периода предоплаты.</p>
              <button onClick={addPrepayPeriod} className="bg-[#FFE9EF] rounded-[10px] py-2.5 px-3 shadow-sm text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black flex-shrink-0" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>Установить период</button>
            </div>

            <div className="flex items-center gap-2 mt-10 bg-[#FFE9EF] p-3 rounded-[10px] shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
              <div className="w-6 h-5 flex-shrink-0"><img src={cardIcon} alt="card" className="w-full h-full object-contain" /></div>
              {hasCard && !isEditingCard ? (
                <>
                  <span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black">**** **** **** {cardLast4}</span>
                  <span className="text-[8px] font-['Sofia_Sans'] text-black/50 flex-1">Ваши данные попадают напрямую в защищённое облако платёжной системы (ЮKassa).</span>
                  <button onClick={() => { setIsEditingCard(true); setCardInput(""); }} className="ml-auto w-6 h-6 flex items-center justify-center text-black/50 hover:text-black">
                    <img src={cardIcon} alt="edit" className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <input type="text" inputMode="numeric" placeholder="Введите номер карты" value={cardInput} onChange={(e) => { const raw = e.target.value.replace(/\s/g, ""); const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 "); setCardInput(formatted); }} onKeyDown={(e) => { if (e.key === "Enter" && cardInput.replace(/\s/g, "").length >= 4) { setCardLast4(cardInput.replace(/\s/g, "").slice(-4)); setHasCard(true); setIsEditingCard(false); } }} className="flex-1 bg-transparent text-sm font-['Sofia_Sans'] text-black outline-none placeholder-black/30" maxLength={19} />
                  <button onClick={() => { if (cardInput.replace(/\s/g, "").length >= 4) { setCardLast4(cardInput.replace(/\s/g, "").slice(-4)); setHasCard(true); setIsEditingCard(false); } }} className="w-5 h-5 flex items-center justify-center"><Check className="w-4 h-4 text-black" /></button>
                </>
              )}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}