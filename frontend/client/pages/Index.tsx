import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTelegramAuth } from "@/App";
import { toast } from "sonner";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

interface AccountStatus {
  status: string;
  master: boolean;
  user: boolean;
}

export default function Index() {
  const navigate = useNavigate();
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isVerified || !chatId) {
      if (authLoading) {
        setLoading(true);
      } else {
        setLoading(false);
      }
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${baseUrl}/admins/check_account?chat_id=${chatId}`);
        if (!res.ok) throw new Error("Ошибка загрузки статуса");
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);
        setStatus(data);
      } catch (err: any) {
        console.error(err);
        toast.error("Не удалось проверить регистрацию");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [chatId, isVerified, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }

  if (authError || !isVerified) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500 font-['Sofia_Sans']">{authError || "Ошибка авторизации"}</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Нет данных</p>
      </div>
    );
  }

  const hasUser = status.user;
  const hasMaster = status.master;

  // Если обе роли отсутствуют – показываем одно сообщение с ботом
  if (!hasUser && !hasMaster) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center p-4">
        <div
          className="max-w-sm w-full bg-[#FFE9EF] rounded-[30px] p-8 shadow-inner"
          style={{ boxShadow: "inset 8px 8px 16px #d5d6d0, inset -8px -8px 16px #ffffff" }}
        >
          <div className="text-center">
            <h1 className="text-[28px] font-bold tracking-[1px] text-[#4a5951] mb-4 font-['Sofia_Sans']">
              Добро пожаловать!
            </h1>
            <p className="text-[14px] text-[#5f7065] leading-relaxed mb-6">
              Регистрация в приложении происходит через Telegram-бота.
            </p>
            <button
              onClick={() => window.open("https://t.me/headband_assistant_bot", "_blank")}
              className="w-full max-w-[260px] py-4 px-6 bg-[#FFE9EF] rounded-[30px] text-[18px] font-semibold text-[#3a4740] shadow-[6px_6px_12px_#d5d6d0,-6px_-6px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#d5d6d0,inset_-4px_-4px_8px_#ffffff] transition-all mx-auto"
            >
              Перейти в бота
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center p-4">
      <div
        className="max-w-sm w-full bg-[#FFE9EF] rounded-[30px] p-6 shadow-inner"
        style={{ boxShadow: "inset 8px 8px 16px #d5d6d0, inset -8px -8px 16px #ffffff" }}
      >
        {/* Клиентская секция (если есть) */}
        {hasUser && (
          <div className="text-center py-6">
            <h2 className="text-[26px] font-bold tracking-[1px] text-[#4a5951] mb-3 font-['Sofia_Sans']">Клиент</h2>
            <div className="w-20 h-20 rounded-[20px] bg-[#FFE9EF] shadow-[8px_8px_16px_#d5d6d0,-8px_-8px_16px_#ffffff] flex items-center justify-center mx-auto mb-4">
              <svg className="w-11 h-11 stroke-[#4a5951] stroke-[1.5] fill-none" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                <path d="M19 5l1 1-1 1M19 5l-1 1 1 1M4 9l1 1-1 1M4 9l-1 1 1 1" strokeWidth="1.5" />
              </svg>
            </div>
            <p className="text-[14px] text-[#5f7065] leading-relaxed mb-4">
              Ищите услуги, записывайтесь к мастерам и управляйте своими записями.
            </p>
            <button
              onClick={() => navigate("/user")}
              className="w-full max-w-[260px] py-4 px-6 bg-[#FFE9EF] rounded-[30px] text-[18px] font-semibold text-[#3a4740] shadow-[6px_6px_12px_#d5d6d0,-6px_-6px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#d5d6d0,inset_-4px_-4px_8px_#ffffff] transition-all mx-auto flex items-center justify-center gap-2"
            >
              Я клиент
              <svg className="w-5 h-5 stroke-[#3a4740] stroke-2 fill-none" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        )}

        {/* Разделитель, если обе роли есть */}
        {hasUser && hasMaster && (
          <div className="w-[90%] h-[4px] bg-[#FFE9EF] rounded-[2px] mx-auto my-3 shadow-[2px_2px_5px_#d5d6d0,-2px_-2px_5px_#ffffff]" />
        )}

        {/* Блок регистрации мастера (если мастер отсутствует) */}
        {!hasMaster && (
          <div className="text-center py-6">
            <h2 className="text-[26px] font-bold tracking-[1px] text-[#4a5951] mb-3 font-['Sofia_Sans']">Мастер</h2>
            <div className="w-20 h-20 rounded-[20px] bg-[#FFE9EF] shadow-[8px_8px_16px_#d5d6d0,-8px_-8px_16px_#ffffff] flex items-center justify-center mx-auto mb-4">
              <svg className="w-11 h-11 stroke-[#4a5951] stroke-[1.5] fill-none" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="12" rx="2" ry="2" />
                <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <circle cx="12" cy="14" r="2" />
                <path d="M12 16v3" />
              </svg>
            </div>
            <p className="text-[14px] text-[#5f7065] leading-relaxed mb-4">
              Регистрация в качестве мастера происходит через Telegram-бота.
            </p>
            <button
              onClick={() => window.open("https://t.me/headband_assistant_bot", "_blank")}
              className="w-full max-w-[260px] py-4 px-6 bg-[#FFE9EF] rounded-[30px] text-[18px] font-semibold text-[#3a4740] shadow-[6px_6px_12px_#d5d6d0,-6px_-6px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#d5d6d0,inset_-4px_-4px_8px_#ffffff] transition-all mx-auto"
            >
              Перейти в бота
            </button>
          </div>
        )}

        {/* Мастерская секция (если есть) */}
        {hasMaster && (
          <div className="text-center py-6">
            <h2 className="text-[26px] font-bold tracking-[1px] text-[#4a5951] mb-3 font-['Sofia_Sans']">Мастер</h2>
            <div className="w-20 h-20 rounded-[20px] bg-[#FFE9EF] shadow-[8px_8px_16px_#d5d6d0,-8px_-8px_16px_#ffffff] flex items-center justify-center mx-auto mb-4">
              <svg className="w-11 h-11 stroke-[#4a5951] stroke-[1.5] fill-none" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <p className="text-[14px] text-[#5f7065] leading-relaxed mb-4">
              Управляйте своим профилем, услугами, расписанием и записями клиентов.
            </p>
            <button
              onClick={() => navigate("/master")}
              className="w-full max-w-[260px] py-4 px-6 bg-[#FFE9EF] rounded-[30px] text-[18px] font-semibold text-[#3a4740] shadow-[6px_6px_12px_#d5d6d0,-6px_-6px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#d5d6d0,inset_-4px_-4px_8px_#ffffff] transition-all mx-auto flex items-center justify-center gap-2"
            >
              Я мастер
              <svg className="w-5 h-5 stroke-[#3a4740] stroke-2 fill-none" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </button>
          </div>
        )}

        {/* Блок регистрации клиента (если клиент отсутствует) */}
        {!hasUser && (
          <div className="text-center py-6">
            <h2 className="text-[26px] font-bold tracking-[1px] text-[#4a5951] mb-3 font-['Sofia_Sans']">Клиент</h2>
            <div className="w-20 h-20 rounded-[20px] bg-[#FFE9EF] shadow-[8px_8px_16px_#d5d6d0,-8px_-8px_16px_#ffffff] flex items-center justify-center mx-auto mb-4">
              <svg className="w-11 h-11 stroke-[#4a5951] stroke-[1.5] fill-none" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                <path d="M19 5l1 1-1 1M19 5l-1 1 1 1M4 9l1 1-1 1M4 9l-1 1 1 1" strokeWidth="1.5" />
              </svg>
            </div>
            <p className="text-[14px] text-[#5f7065] leading-relaxed mb-4">
              Регистрация в качестве клиента происходит через Telegram-бота.
            </p>
            <button
              onClick={() => window.open("https://t.me/headband_assistant_bot", "_blank")}
              className="w-full max-w-[260px] py-4 px-6 bg-[#FFE9EF] rounded-[30px] text-[18px] font-semibold text-[#3a4740] shadow-[6px_6px_12px_#d5d6d0,-6px_-6px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#d5d6d0,inset_-4px_-4px_8px_#ffffff] transition-all mx-auto"
            >
              Перейти в бота
            </button>
          </div>
        )}
      </div>
    </div>
  );
}