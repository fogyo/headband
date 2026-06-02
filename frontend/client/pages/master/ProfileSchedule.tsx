import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus } from "lucide-react";
import trashIcon from "@/assets/Trash.svg";
import backIcon from "@/assets/back_icon.svg";
import pinIcon from "@/assets/pinIcon.png";


// ---------- Мок-данные ----------
const initialAddresses = [
  "Адрес по умолчанию (Напишите свой)"
];


const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

interface DaySchedule {
  dayOff: boolean;          // true = выходной
  startTime: string;
  endTime: string;
  address: string;
}

const initialWeek: DaySchedule[] = [
  { dayOff: false, startTime: "9:00", endTime: "18:00", address: initialAddresses[0] },
  { dayOff: false, startTime: "9:00", endTime: "18:00", address: initialAddresses[0] },
  { dayOff: false, startTime: "9:00", endTime: "18:00", address: initialAddresses[0] },
  { dayOff: false, startTime: "9:00", endTime: "18:00", address: initialAddresses[0] },
  { dayOff: false, startTime: "9:00", endTime: "18:00", address: initialAddresses[0] },
  { dayOff: true, startTime: "9:00", endTime: "18:00", address: initialAddresses[0] },
  { dayOff: true, startTime: "9:00", endTime: "18:00", address: initialAddresses[0] },
];

interface AbsencePeriod {
  id: number;
  startDate: string;   // "10.03"
  endDate: string;     // "11.03"
  reason: string;
}

const initialAbsences: AbsencePeriod[] = [
  { id: 1, startDate: "10.03", endDate: "11.03", reason: "Болезнь" },
];

// ---------- Микро-компоненты ----------
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={`relative w-10 h-5 rounded-[5px] text-[12px] tracking-[-0.6px] font-bold font-['Sofia_Sans'] ${
      checked
        ? "bg-[#7FD1AE]/60 text-black/50 shadow-[inset_4px_4px_4px_0px_rgba(0,0,0,0.25)]" // on – выходной (внутренняя тень)
        : "bg-[#FA4F96]/60 text-white/60 shadow-[2px_2px_7px_0px_rgba(0,0,0,0.10),9px_10px_13px_0px_rgba(0,0,0,0.09),20px_22px_18px_0px_rgba(0,0,0,0.05),36px_38px_21px_0px_rgba(0,0,0,0.01),57px_60px_23px_0px_rgba(0,0,0,0.00)]" // off – рабочий (внешняя тень)
    }`}
  >
    {checked ? "on" : "off"}
  </button>
);

const DateInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleBlur = () => {
    // Проверяем формат DD.MM (день 01-31, месяц 01-12)
    const isValid = /^(0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])$/.test(local);
    if (isValid) {
      onChange(local);
    } else {
      setLocal(value); // возвращаем последнее сохранённое
    }
  };

  return (
    <div
      className="bg-[#FFE9EF] rounded-[5px] h-5 flex items-center justify-center"
      style={{
        width: "100%",
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
        placeholder="ДД.ММ"
        className="bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center w-full"
        maxLength={5}
      />
    </div>
  );
};

const TimeInput = ({
  value,
  onChange,
  className,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
}) => {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleBlur = () => {
    const isValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(local);
    if (isValid) {
      onChange(local);
    } else {
      setLocal(value);
    }
  };

  return (
    <div
      className={`${className} bg-[#FFE9EF] rounded-[5px] h-5 flex items-center justify-center ${
        disabled ? "opacity-50" : ""
      }`}
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
        placeholder={disabled ? "" : "HH:MM"}
        disabled={disabled}
        className="bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center w-full disabled:text-gray-400"
        maxLength={5}
      />
    </div>
  );
};

const AddressSelect = ({
  value,
  addresses,
  onChange,
  className,
  disabled = false,
}: {
  value: string;
  addresses: string[];
  onChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
}) => (
  <div
    className={`${className} bg-[#FFE9EF] rounded-[5px] h-5 flex items-center ${
      disabled ? "opacity-50" : ""
    }`}
    style={{
      boxShadow:
        "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
    }}
  >
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-full bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none truncate px-1 py-0 leading-none text-center appearance-none disabled:text-gray-400"
    >
      {addresses.map((addr) => (
        <option key={addr} value={addr}>
          {addr}
        </option>
      ))}
    </select>
  </div>
);

// ---------- Основной компонент ----------
export default function ProfileSchedulePage() {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [week, setWeek] = useState(initialWeek);
  const [absences, setAbsences] = useState(initialAbsences);
  const [newAbsence, setNewAbsence] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

    const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
    const [addressDraft, setAddressDraft] = useState("");

    const startEditAddress = (idx: number) => {
    setEditingAddressIndex(idx);
    setAddressDraft(addresses[idx]);
    };

    const saveAddressEdit = () => {
    if (editingAddressIndex === null) return;
    const oldAddr = addresses[editingAddressIndex];
    const trimmed = addressDraft.trim();

    if (trimmed && trimmed !== oldAddr) {
        // Обновили адрес – заменяем его везде в шаблоне
        setAddresses((prev) =>
        prev.map((a, i) => (i === editingAddressIndex ? trimmed : a))
        );
        setWeek((prev) =>
        prev.map((day) =>
            day.address === oldAddr ? { ...day, address: trimmed } : day
        )
        );
    } else if (!trimmed) {
        // Адрес стал пустым – удаляем из списка и очищаем в шаблоне
        setAddresses((prev) => prev.filter((_, i) => i !== editingAddressIndex));
        setWeek((prev) =>
        prev.map((day) =>
            day.address === oldAddr ? { ...day, address: "" } : day
        )
        );
    }
    setEditingAddressIndex(null);
    setAddressDraft("");
    };

    const deleteAddress = (idx: number) => {
    const addrToDelete = addresses[idx];
    setAddresses((prev) => prev.filter((_, i) => i !== idx));
    // В шаблоне убираем этот адрес (можно оставить пустым или заменить на первый оставшийся)
    setWeek((prev) =>
        prev.map((day) =>
        day.address === addrToDelete ? { ...day, address: "" } : day
        )
    );
    if (editingAddressIndex === idx) {
        setEditingAddressIndex(null);
        setAddressDraft("");
    }
    };

    const addNewAddress = () => {
    const newIndex = addresses.length;
    setAddresses((prev) => [...prev, ""]);
    setEditingAddressIndex(newIndex);
    setAddressDraft("");
    };

  const updateDay = (idx: number, patch: Partial<DaySchedule>) =>
    setWeek((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));

  const addAbsence = () => {
    if (!newAbsence.startDate || !newAbsence.endDate) return;

    const confirmed = window.confirm(
        "Все существующие записи в этот период будут удалены. Продолжить?"
    );
    if (!confirmed) return;

    const newId = Math.max(0, ...absences.map((a) => a.id)) + 1;
    setAbsences((prev) => [
      ...prev,
      {
        id: newId,
        startDate: newAbsence.startDate,
        endDate: newAbsence.endDate,
        reason: newAbsence.reason || "—",
      },
    ]);
    setNewAbsence({ startDate: "", endDate: "", reason: "" });
  };

  const deleteAbsence = (id: number) =>
    setAbsences((prev) => prev.filter((a) => a.id !== id));

    const [customDay, setCustomDay] = useState({
    date: "",
    startTime: "9:00",
    endTime: "18:00",
    address: addresses[0] ?? "",
    });

    const handleCustomDaySubmit = () => {

    const confirmed = window.confirm(
        "Все записи, которые не попадают в новые временные рамки, будут отменены. Продолжить?"
    );
    if (!confirmed) return;
    
  // Здесь будет запрос к API для изменения конкретного дня
        console.log("Изменения для конкретного дня:", customDay);
        // Сброс полей после принятия изменений
        setCustomDay({
            date: "",
            startTime: "9:00",
            endTime: "18:00",
            address: addresses[0] ?? "",
        });
        };
  return (
    <div className="min-h-screen bg-[#FFE9EF]">
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

        {/* 1. Адреса работы */}
        <section className="mt-8">
        <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Адреса работы</h2>
        <div className="h-px bg-black w-56 mb-4" />

        <div className="grid grid-cols-2 gap-3 mb-4">
        {addresses.map((addr, idx) => (
            <div
            key={idx}
            className="relative bg-[#FFE9EF] rounded-[10px] py-3 px-4 flex items-center gap-2 shadow-sm"
            style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            }}
            >
            {editingAddressIndex === idx ? (
                <input
                autoFocus
                value={addressDraft}
                onChange={(e) => setAddressDraft(e.target.value)}
                onBlur={saveAddressEdit}
                onKeyDown={(e) => e.key === "Enter" && saveAddressEdit()}
                className="bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none border-b border-black/20 flex-1"
                />
            ) : (
                <>
                {/* Иконка пина отображается только в обычном состоянии */}
                <img src={pinIcon} alt="pin" className="w-8 h-8 rounded object-cover" />
                <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black flex-1">
                    {addr}
                </span>
                <button
                    onClick={() => startEditAddress(idx)}
                    className="absolute top-1 right-1 p-0.5"
                >
                    <Pencil className="w-3.5 h-3.5 text-black/100" />
                </button>
                </>
            )}
            </div>
        ))}
        </div>

        <button
            onClick={addNewAddress}
            className="relative mx-auto bg-[#FFE9EF] rounded-[10px] py-2.5 px-6 shadow-sm flex items-center justify-center gap-1"
            style={{
            border: "0.5px solid rgba(0,0,0,0.00)",
            boxShadow:
                "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            }}
        >
            <Plus className="w-4 h-4 text-black" />
            <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black">
            Добавить адрес
            </span>
        </button>
        </section>

        {/* 2. Шаблон рабочей недели */}
        <section className="mt-10">
        <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">
            Шаблон рабочей недели
        </h2>
        <div className="h-px bg-black w-56 mb-4" />

        {/* Заголовки столбцов */}
        <div className="flex items-center gap-2 mb-1 text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/100">
            <div className="w-8 flex-shrink-0" />
            <div className="flex-1 text-center">начало</div>
            <div className="flex-1 text-center">конец</div>
            <div className="flex-1 text-center">адрес</div>
            <div className="w-10 flex-shrink-0 text-center">вых</div>
        </div>

        {/* Строки дней */}
        <div className="flex flex-col gap-3">
            {dayNames.map((day, idx) => {
            const d = week[idx];
            return (
                <div key={day} className="flex items-center gap-5">
                <div className="w-8 flex-shrink-0 text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                    {day}
                </div>
                <TimeInput
                    value={d.startTime}
                    onChange={(v) => updateDay(idx, { startTime: v })}
                    className="flex-1"
                    disabled={d.dayOff}
                />
                <TimeInput
                    value={d.endTime}
                    onChange={(v) => updateDay(idx, { endTime: v })}
                    className="flex-1"
                    disabled={d.dayOff}
                />
                <AddressSelect
                    value={d.address}
                    addresses={addresses}
                    onChange={(v) => updateDay(idx, { address: v })}
                    className="flex-1"
                    disabled={d.dayOff}
                />
                <div className="w-10 flex-shrink-0 flex justify-center">
                    <Toggle
                    checked={d.dayOff}
                    onChange={() => {
                        const willBeOff = !d.dayOff;
                        updateDay(idx, {
                        dayOff: willBeOff,
                        startTime: willBeOff ? "" : "9:00",
                        endTime: willBeOff ? "" : "18:00",
                        address: willBeOff ? "" : addresses[0] ?? "",
                        });
                    }}
                    />
                </div>
                </div>
            );
            })}
        </div>

        <div className="flex justify-end mt-4">
    <button
        className="bg-[#FFE9EF] rounded-[10px] py-2.5 px-3 shadow-sm text-[12px] font-['Sofia_Sans'] text-black"
        style={{
        border: "0.5px solid rgba(0,0,0,0.00)",
        boxShadow:
            "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
        }}
    >
        Сохранить шаблон
    </button>
    </div>
        </section>

       {/* 3. Изменить конкретный день */}
    <section className="mt-10">
    <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">
        Изменить конкретный<br /> день
    </h2>
    <div className="h-px bg-black w-56 mb-4" />

    {/* Подписи над полями */}
    <div className="flex items-end gap-2 mb-1">
        <div className="flex-1 text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/100">
            дата
        </div>
        <div className="flex-1 text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/100">
            начало
        </div>
        <div className="flex-1 text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/100">
            конец
        </div>
        <div className="flex-[2] text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/100">
            адрес
        </div>
    </div>

    {/* Поля ввода */}
    <div className="flex items-center gap-5">
        <div className="flex-1 flex justify-center">
            <DateInput
            value={customDay.date}
            onChange={(v) => setCustomDay((prev) => ({ ...prev, date: v }))}
            />
        </div>
        <div className="flex-1 flex justify-center">
            <TimeInput
            value={customDay.startTime}
            onChange={(v) => setCustomDay((prev) => ({ ...prev, startTime: v }))}
            />
        </div>
        <div className="flex-1 flex justify-center">
            <TimeInput
            value={customDay.endTime}
            onChange={(v) => setCustomDay((prev) => ({ ...prev, endTime: v }))}
            />
        </div>
        <div className="flex-[2] flex justify-center">
            <AddressSelect
            value={customDay.address}
            addresses={addresses}
            onChange={(v) => setCustomDay((prev) => ({ ...prev, address: v }))}
            />
        </div>
    </div>
    <div className="flex justify-end mt-4">
        <button
        onClick={handleCustomDaySubmit}
        className="bg-[#FFE9EF] rounded-[10px] py-2.5 px-3 shadow-sm text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black"
        style={{
            border: "0.5px solid rgba(0,0,0,0.00)",
            boxShadow:
            "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
        }}
        >
        Принять изменения
        </button>
    </div>
</section>

        {/* 4. Установить период отсутствия */}
        <section className="mt-10">
        <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">
            Установить период<br /> отсутствия
        </h2>
        <div className="h-px bg-black w-56 mb-4" />

        {/* Список существующих записей */}
        {absences.length > 0 && (
        <div className="mb-8">
            {absences.map((abs) => (
            <div key={abs.id} className="flex items-center gap-2 mb-3">
                <div className="flex-1 text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                {abs.startDate}
                </div>
                <div className="flex-1 text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                {abs.endDate}
                </div>
                <div className="flex-[2] text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black truncate">
                {abs.reason}
                </div>
                <div className="flex items-center justify-end gap-1" style={{ width: "60px" }}>
                <button
                    onClick={() => deleteAbsence(abs.id)}
                    className="relative w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
                >
                    <div className="absolute w-11 h-11 left-[5px] top-[5px] bg-white rounded-[5px] blur-[20px] opacity-80" />
                    <img src={trashIcon} alt="back" className="w-6 h-6 relative z-10" />
                </button>
                </div>
            </div>
            ))}
        </div>
        )}

        {/* Заголовки столбцов */}
        <div className="flex items-center gap-2 mb-1 text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/100">
        <div className="flex-1 text-center">начало</div>
        <div className="flex-1 text-center">конец</div>
        <div className="flex-[2] text-center">причина</div>
        </div>

        {/* Форма добавления нового периода */}
        <div className="flex items-center gap-5 mb-2 w-full">
        <div className="flex-1 flex justify-center">
            <DateInput
            value={newAbsence.startDate}
            onChange={(v) => setNewAbsence((prev) => ({ ...prev, startDate: v }))}
            />
        </div>
        <div className="flex-1 flex justify-center">
            <DateInput
            value={newAbsence.endDate}
            onChange={(v) => setNewAbsence((prev) => ({ ...prev, endDate: v }))}
            />
        </div>
        <div className="flex-[2] flex justify-center">
            <div
            className="bg-[#FFE9EF] rounded-[5px] h-5 flex items-center justify-center w-full"
            style={{
                boxShadow:
                "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            }}
            >
            <input
                type="text"
                placeholder="необязательно"
                value={newAbsence.reason}
                onChange={(e) =>
                setNewAbsence((prev) => ({ ...prev, reason: e.target.value }))
                }
                className="bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center w-full"
            />
            </div>
        </div>
        </div>

        <div className="flex items-center justify-between mt-4">
        <p className="text-[8px] font-['Sofia_Sans'] text-black/50">
            *если на один день, то указывайте начало и конец одинаковые
        </p>
        <button
            onClick={addAbsence}
            className="bg-[#FFE9EF] rounded-[10px] py-2.5 px-3 shadow-sm text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black"
            style={{
            border: "0.5px solid rgba(0,0,0,0.00)",
            boxShadow:
                "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            }}
        >
            Сохранить период
        </button>
        </div>
        </section>
      </div>
    </div>
  );
}