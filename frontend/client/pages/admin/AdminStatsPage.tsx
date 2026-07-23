import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTelegramAuth } from "@/App";
import backIconSrc from "@/assets/back_icon.svg";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ---------- Типы ----------
interface UserRecord {
  amount: number;
  date_record: string; // "YYYY-MM-DD"
}

interface SavedPercentage {
  total: number;
  saved: number;
  model: string;
}

interface UsersData {
  masters_dynamic: UserRecord[];
  users_dynamic: UserRecord[];
}

interface FinanceData {
  tokens_spent: number;
  super_tokens_spent: number;
  tokens_purchased: number;
  super_tokens_purchased: number;
  tokens_spent_cost: number;
  super_tokens_spent_cost: number;
  tokens_purchased_cost: number;
  super_tokens_purchased_cost: number;
  base_masters: number;
  partner_masters: number;
}

interface AIData {
  man_sessions: number;
  woman_sessions: number;
  results_base: SavedPercentage;
  results_improve: SavedPercentage;
}

interface AppointmentsData {
  appointments_amount: number;
  appointments_future: number;
  appointments_confirmed: number;
}

interface StatsResponse {
  status: string;
  users: UsersData;
  finance: FinanceData;
  ai: AIData;
  appointments: AppointmentsData;
}

// ---------- Форматирование дат ----------
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
};

export default function AdminStatsPage() {
  const navigate = useNavigate();
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isVerified || !chatId) {
      if (!authLoading) {
        setError(authError || "Авторизация не пройдена");
        setLoading(false);
      }
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch(`${baseUrl}/admins/stats/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: StatsResponse = await res.json();
        if (data.status !== "success") throw new Error(data.status);
        setStats(data);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError("Не удалось загрузить статистику");
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isVerified, chatId, authLoading, authError]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }

  if (authError || !isVerified || error) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500 font-['Sofia_Sans']">{error || authError || "Ошибка авторизации"}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Нет данных</p>
      </div>
    );
  }

  const { users, finance, ai, appointments } = stats;

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка назад */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIconSrc} alt="back" className="w-6 h-6 relative z-10" />
        </button>

        {/* Заголовок */}
        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}
          >
            statistics
          </h1>
          <p
            className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "0.4px #000" }}
          >
            version for admins
          </p>
        </div>

        {/* Графики пользователей */}
        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Пользователи</h2>
          <div className="h-px bg-black w-[210px] mb-4" />

          <div className="mb-6">
            <h3 className="text-[18px] tracking-[-0.9px] font-['Sofia_Sans'] text-black/80 mb-2">Мастера</h3>
            <div className="bg-white rounded-[10px] p-3 shadow" style={{ boxShadow: "inset 4px 4px 4px rgba(0,0,0,0.25)" }}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={users.masters_dynamic}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date_record" tickFormatter={formatDate} />
                  <YAxis />
                  <Tooltip labelFormatter={(label) => `Дата: ${label}`} formatter={(value) => [`${value} чел.`, "Количество"]} />
                  <Line type="monotone" dataKey="amount" stroke="#FA4F96" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-[18px] tracking-[-0.9px] font-['Sofia_Sans'] text-black/80 mb-2">Клиенты</h3>
            <div className="bg-white rounded-[10px] p-3 shadow" style={{ boxShadow: "inset 4px 4px 4px rgba(0,0,0,0.25)" }}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={users.users_dynamic}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date_record" tickFormatter={formatDate} />
                  <YAxis />
                  <Tooltip labelFormatter={(label) => `Дата: ${label}`} formatter={(value) => [`${value} чел.`, "Количество"]} />
                  <Line type="monotone" dataKey="amount" stroke="#6A92FF" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Финансы */}
        <section className="mt-10">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Финансы</h2>
          <div className="h-px bg-black w-[210px] mb-4" />

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">База (мастеров)</p>
              <p className="text-[20px] font-['Sofia_Sans'] text-black">{finance.base_masters}</p>
            </div>
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Партнёров</p>
              <p className="text-[20px] font-['Sofia_Sans'] text-black">{finance.partner_masters}</p>
            </div>
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Потрачено токенов (база)</p>
              <p className="text-[16px] font-['Sofia_Sans'] text-black">{finance.tokens_spent}</p>
            </div>
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Потрачено супер-токенов</p>
              <p className="text-[16px] font-['Sofia_Sans'] text-black">{finance.super_tokens_spent}</p>
            </div>
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Приобретено токенов (база)</p>
              <p className="text-[16px] font-['Sofia_Sans'] text-black">{finance.tokens_purchased}</p>
            </div>
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Приобретено супер-токенов</p>
              <p className="text-[16px] font-['Sofia_Sans'] text-black">{finance.super_tokens_purchased}</p>
            </div>
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Стоимость потраченных (база)</p>
              <p className="text-[16px] font-['Sofia_Sans'] text-black">{finance.tokens_spent_cost} ₽</p>
            </div>
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Стоимость потраченных (супер)</p>
              <p className="text-[16px] font-['Sofia_Sans'] text-black">{finance.super_tokens_spent_cost} ₽</p>
            </div>
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Стоимость приобретенных (база)</p>
              <p className="text-[16px] font-['Sofia_Sans'] text-black">{finance.tokens_purchased_cost} ₽</p>
            </div>
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Стоимость приобретенных (супер)</p>
              <p className="text-[16px] font-['Sofia_Sans'] text-black">{finance.super_tokens_purchased_cost} ₽</p>
            </div>
          </div>
        </section>

        {/* AI */}
        <section className="mt-10">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">AI сессии</h2>
          <div className="h-px bg-black w-[210px] mb-4" />

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Мужские сессии</p>
              <p className="text-[20px] font-['Sofia_Sans'] text-black">{ai.man_sessions}</p>
            </div>
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Женские сессии</p>
              <p className="text-[20px] font-['Sofia_Sans'] text-black">{ai.woman_sessions}</p>
            </div>
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Base модель (сохранено/всего)</p>
              <p className="text-[16px] font-['Sofia_Sans'] text-black">{ai.results_base.saved}/{ai.results_base.total}</p>
            </div>
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Improve модель (сохранено/всего)</p>
              <p className="text-[16px] font-['Sofia_Sans'] text-black">{ai.results_improve.saved}/{ai.results_improve.total}</p>
            </div>
          </div>
        </section>

        {/* Записи */}
        <section className="mt-10">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Записи</h2>
          <div className="h-px bg-black w-[210px] mb-4" />

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Всего</p>
              <p className="text-[20px] font-['Sofia_Sans'] text-black">{appointments.appointments_amount}</p>
            </div>
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Будущие</p>
              <p className="text-[20px] font-['Sofia_Sans'] text-black">{appointments.appointments_future}</p>
            </div>
            <div className="bg-[#FFE9EF] rounded-[10px] p-3 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)" }}>
              <p className="text-[12px] font-['Sofia_Sans'] text-black/50">Подтверждённые</p>
              <p className="text-[20px] font-['Sofia_Sans'] text-black">{appointments.appointments_confirmed}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}