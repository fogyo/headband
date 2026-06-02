import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import backIcon from "@/assets/back_icon.svg";
import cardIcon from "@/assets/bank_card_icon.svg";
import { toast } from "sonner";
import pencilIcon from "@/assets/Pencil.svg"

// ---------- Типы ----------
interface AppointmentToConfirm {
  id: number;
  service: string;
  date: string;
  price: string;
  confirmed: boolean | null;
}

interface PrepayPeriod {
  id: number;
  start: string;
  end: string;
  percent: string;
}

// ---------- Мок-данные ----------
const initialAppointments: AppointmentToConfirm[] = [
  { id: 1, service: "Модельная стрижка", date: "20.01, 16:30-17:30", price: "1300₽", confirmed: null },
  { id: 2, service: "Модельная стрижка", date: "20.01, 16:30-17:30", price: "1300₽", confirmed: null },
  { id: 3, service: "Модельная стрижка", date: "20.01, 16:30-17:30", price: "1300₽", confirmed: null },
];

const initialPrepayPeriods: PrepayPeriod[] = [
  { id: 1, start: "10.03", end: "11.03", percent: "30%" },
];

// ---------- Вспомогательные функции ----------
const monthNames = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

// Мок-доходы по месяцам (для первого круга)
const mockMonthlyIncome: Record<string, { total: string; count: string }> = {
  "Январь": { total: "₽80,000", count: "40 встреч" },
  "Февраль": { total: "₽95,000", count: "45 встреч" },
  "Март": { total: "₽70,000", count: "35 встреч" },
  "Апрель": { total: "₽120,000", count: "55 встреч" },
  "Май": { total: "₽110,000", count: "52 встреч" },
  "Июнь": { total: "₽100,000", count: "50 встреч" },
  "Июль": { total: "₽130,000", count: "60 встреч" },
  "Август": { total: "₽140,000", count: "65 встреч" },
  "Сентябрь": { total: "₽90,000", count: "42 встреч" },
  "Октябрь": { total: "₽105,000", count: "48 встреч" },
  "Ноябрь": { total: "₽115,000", count: "53 встреч" },
  "Декабрь": { total: "₽200,000", count: "80 встреч" },
};

// ---------- Компонент DateInput (как в ProfileSchedule) ----------
const DateInput = ({
  value,
  onChange,
  placeholder = "ДД.ММ",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => {
  const [local, setLocal] = useState(value);

  // Синхронизация локального состояния с пропсом value
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleBlur = () => {
    const isValid = /^(0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])$/.test(local);
    if (isValid) {
      onChange(local);
    } else {
      setLocal(value); // возвращаем последнее сохранённое
    }
  };

  return (
    <div
      className="bg-[#FFE9EF] rounded-[5px] h-7 flex items-center justify-center"
      style={{
        boxShadow:
          "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
      }}
    >
      <input
        type="text"
        inputMode="numeric"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center w-full"
        maxLength={5}
      />
    </div>
  );
};

// ---------- Компонент строки подтверждения ----------
const ConfirmationRow = ({
  appointment,
  onConfirm,
  onDecline,
}: {
  appointment: AppointmentToConfirm;
  onConfirm: () => void;
  onDecline: () => void;
}) => (
  <div className="flex items-stretch gap-3 pl-4">
    {/* Розовая полоска – теперь тянется на всю высоту */}
    <div className="relative w-[10px] flex-shrink-0">
      <div className="absolute inset-0 bg-white rounded-[20px] blur-[20px] opacity-80" />
      <div
        className="w-[10px] h-full bg-[#FFD0DC] rounded-[20px] shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        style={{ border: "0.5px solid rgba(0,0,0,0.00)" }}
      />
    </div>

    {/* Информация */}
    <div className="flex-1 flex flex-col justify-center">
      <p className="text-base font-['Sofia_Sans'] text-black">{appointment.service}</p>
      <p className="text-sm font-['Sofia_Sans'] text-black/50">{appointment.date}</p>
      <p className="text-sm font-['Sofia_Sans'] text-black/50">{appointment.price}</p>
    </div>

    {/* Кнопки действий */}
    <div className="flex items-center gap-2 flex-shrink-0">
      {appointment.confirmed === null ? (
        <>
          <button
            onClick={onConfirm}
            className="relative bg-[#FFE9EF] rounded-[10px] h-10 w-28 flex items-center justify-center shadow"
            style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                      "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  }}
          >
            <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">Подтвердить</span>
          </button>
          <button
            onClick={onDecline}
            className="relative w-10 h-10 bg-[#FFE9EF] rounded-[10px] flex items-center justify-center shadoe"
            style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                      "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  }}
          >
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
  // ---------- Состояния ----------
    const [hasCard, setHasCard] = useState(false); // true, если данные карты уже пришли с бэка
    const [cardLast4, setCardLast4] = useState(""); // последние 4 цифры (придут с бэка)
    const [cardInput, setCardInput] = useState("");
    const [isEditingCard, setIsEditingCard] = useState(false);

  const [appointments, setAppointments] = useState(initialAppointments);
  const [prepayPeriods, setPrepayPeriods] = useState(initialPrepayPeriods);
  const [newPrepay, setNewPrepay] = useState({ start: "", end: "", percent: "" });

  // Месяц для первого круга
  const today = new Date();
  const [monthIndex, setMonthIndex] = useState(today.getMonth()); // 0-11
  const currentMonth = monthNames[monthIndex];

  // Период для второго круга
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [periodData, setPeriodData] = useState<{ total: string; count: string }>({
    total: "₽0",
    count: "0 встреч",
  });

  // Данные для месяца (из моков)
  const monthData = useMemo(() => {
    return mockMonthlyIncome[currentMonth] || { total: "₽0", count: "0 встреч" };
  }, [currentMonth]);

  // Переключение месяца
  const prevMonth = () => setMonthIndex((prev) => (prev === 0 ? 11 : prev - 1));
  const nextMonth = () => setMonthIndex((prev) => (prev === 11 ? 0 : prev + 1));

  // Применение периода
  const applyPeriod = () => {
    if (!periodStart || !periodEnd) {
      toast.warning("Введите начало и конец периода");
      return;
    }
    // Заглушка – можно будет заменить на запрос к бэку
    setPeriodData({ total: "₽15,000", count: "8 встреч" });
    toast.success("Период применён");
  };

  // Подтверждение / отклонение записей
  const handleConfirm = (id: number) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, confirmed: true } : a)));
    toast.success("Подтверждено");
  };

  const handleDecline = (id: number) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, confirmed: false } : a)));
    toast("Отклонено");
  };

  // Добавление периода предоплаты
    const addPrepayPeriod = () => {
    if (!newPrepay.start || !newPrepay.end || !newPrepay.percent) {
        toast.warning("Заполните все поля");
        return;
    }
    const newId = Math.max(0, ...prepayPeriods.map((p) => p.id)) + 1;
    setPrepayPeriods((prev) => [
        ...prev,
        {
        id: newId,
        start: newPrepay.start,
        end: newPrepay.end,
        percent: newPrepay.percent + "%",
        },
    ]);
    setNewPrepay({ start: "", end: "", percent: "" }); // очистка
    toast.success("Период установлен");
    };

  // ---------- JSX ----------
  return (
    <div className="min-h-screen bg-[#FFE9EF] overflow-hidden">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка назад */}
        <Link
          to="/profile"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIcon} alt="back" className="w-6 h-6 relative z-10" />
        </Link>

        {/* Header */}
        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}
          >
            profile
          </h1>
          <p
            className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "0.4px #000" }}
          >
            version for masters
          </p>
        </div>

        {/* Доходы */}
        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black"> Доходы</h2>
          <div className="h-px bg-black w-56 mb-4" />

            {/* Центрированный круг с переключателем месяца */}
            <div className="flex flex-col items-center mb-6">
            {/* Переключатель месяца */}
            <div className="flex items-center gap-2 mb-2">
                <button onClick={prevMonth} className="w-6 h-6 flex items-center justify-center">
                <ChevronLeft className="w-4 h-4 text-black" />
                </button>
                <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">{currentMonth}</span>
                <button onClick={nextMonth} className="w-6 h-6 flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-black" />
                </button>
            </div>

            {/* Круг с доходом */}
            <div className="w-40 h-40 rounded-full border-[5px] border-black flex flex-col items-center justify-center">
                <span className="text-2xl font-['Sofia_Sans'] text-black">{monthData.total}</span>
                <span className="text-base font-['Sofia_Sans'] text-black/50">{monthData.count}</span>
            </div>
            </div>

          {/* Список записей для подтверждения */}
          <div className="flex flex-col gap-4 mb-6">
            {appointments.map((app) => (
              <ConfirmationRow
                key={app.id}
                appointment={app}
                onConfirm={() => handleConfirm(app.id)}
                onDecline={() => handleDecline(app.id)}
              />
            ))}
          </div>

          {/* Установить период предоплаты */}
            <section className="mt-10">
            <h2 className="text-[20px] tracking-[-1px] font-['Sofia_Sans'] text-black">
                Установить период<br /> предоплаты
            </h2>
            <div className="h-px bg-black w-56 mb-4" />
            
            {/* Заголовки столбцов */}
            <div className="flex items-center gap-2 mb-1 text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/100">
                <div className="flex-1 text-center">начало</div>
                <div className="flex-1 text-center">конец</div>
                <div className="flex-1 text-center">процент*</div>
            </div>

            {/* Список существующих периодов */}
            {prepayPeriods.map((p) => (
                <div key={p.id} className="flex items-center gap-2 mb-2">
                <div className="flex-1 text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                    {p.start}
                </div>
                <div className="flex-1 text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                    {p.end}
                </div>
                <div className="flex-1 text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                    {p.percent}
                </div>
                </div>
            ))}

            {/* Форма добавления нового периода */}
            <div className="flex items-center gap-2 mb-2">
                <div className="flex-1">
                <DateInput
                    value={newPrepay.start}
                    onChange={(v) => setNewPrepay((p) => ({ ...p, start: v }))}
                />
                </div>
                <div className="flex-1">
                <DateInput
                    value={newPrepay.end}
                    onChange={(v) => setNewPrepay((p) => ({ ...p, end: v }))}
                />
                </div>
                <div className="flex-1">
                <input
                    type="number"
                    placeholder="%"
                    value={newPrepay.percent}
                    onChange={(e) => setNewPrepay((p) => ({ ...p, percent: e.target.value }))}
                    className="w-full bg-[#FFE9EF] rounded-[5px] h-7 text-[12px] font-['Sofia_Sans'] text-black outline-none text-center shadow"
                    style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                      "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  }}
                />
                </div>
            </div>

            {/* Кнопка и примечание на одной строке */}
            <div className="flex items-center justify-between gap-2 mt-4">
                <p className="text-[8px] font-['Sofia_Sans'] text-black/50 max-w-[200px] flex-shrink-0 leading-tight">
                    *процент от стоимости услуги. headband берет 100руб за каждый день из периода предоплаты.
                </p>
                <button
                    onClick={addPrepayPeriod}
                    className="bg-[#FFE9EF] rounded-[10px] py-2.5 px-3 shadow-sm text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black flex-shrink-0"
                    style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                        "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                    }}
                >
                    Установить период
                </button>
                </div>

            {/* Платёжная карта */}
            <div className="flex items-center gap-2 mt-10 bg-[#FFE9EF] p-3 rounded-[10px] shadow"
            style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                      "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  }}>
            {/* Иконка карты (замени src на свой файл) */}
            <div className="w-6 h-5 flex-shrink-0">
                <img src={cardIcon} alt="card" className="w-full h-full object-contain" />
            </div>

            {hasCard && !isEditingCard ? (
                <>
                <span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black">**** **** **** {cardLast4}</span>
                <span className="text-[8px] font-['Sofia_Sans'] text-black/50 flex-1">
                    Ваши данные попадают напрямую в защищённое облако платёжной системы (ЮKassa).
                </span>
                <button
                onClick={() => {
                setIsEditingCard(true);
                setCardInput("");
                }}
                className="ml-auto w-6 h-6 flex items-center justify-center text-black/50 hover:text-black"
            >
                <img src={pencilIcon} alt="edit" className="w-4 h-4" />
            </button>
                </>
            ) : (
                <>
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Введите номер карты"
                    value={cardInput}
                    onChange={(e) => {
                    // Оставляем только цифры и каждые 4 разделяем пробелом
                    const raw = e.target.value.replace(/\s/g, "");
                    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                    setCardInput(formatted);
                    }}
                    onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        if (cardInput.replace(/\s/g, "").length >= 4) {
                        setCardLast4(cardInput.replace(/\s/g, "").slice(-4));
                        setHasCard(true);
                        setIsEditingCard(false);
                        }
                    }
                    }}
                    className="flex-1 bg-transparent text-sm font-['Sofia_Sans'] text-black outline-none placeholder-black/30"
                    maxLength={19} // 16 цифр + 3 пробела
                />
                <button
                onClick={() => {
                if (cardInput.replace(/\s/g, "").length >= 4) {
                    setCardLast4(cardInput.replace(/\s/g, "").slice(-4));
                    setHasCard(true);
                    setIsEditingCard(false);
                }
                }}
                className="w-5 h-5 flex items-center justify-center"
            >
                <Check className="w-4 h-4 text-black" />
            </button>
            {hasCard && (
                <button
                onClick={() => {
                    setIsEditingCard(false);
                    setCardInput("");
                }}
                className="w-5 h-5 flex items-center justify-center"
                >
                <X className="w-4 h-4 text-black/50" />
                </button>
                )}
                </>
            )}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}