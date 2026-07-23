import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useTelegramAuth } from "@/App";
import homeIconUrl from "@/assets/home.svg";
import backIconSrc from "@/assets/back_icon.svg";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

interface LogEntry {
  timestamp?: string;
  level?: string;
  message: string;
}

export default function AdminIndex() {
  const navigate = useNavigate();
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Загрузка логов
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`${baseUrl}/admins/logs`);
      if (!res.ok) throw new Error("Ошибка загрузки логов");
      const data = await res.json();
      if (data.status === "success") {
        setLogs(data.logs || []);
      } else {
        throw new Error(data.status);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось загрузить логи");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    // Проверка: если пользователь не админ – редирект (но мы уже прошли верификацию)
    // Для безопасности можно проверить, что chatId есть и isVerified true
    if (!isVerified || !chatId) {
      navigate("/");
      return;
    }
    fetchLogs();
  }, [chatId, isVerified]);

  if (authLoading) {
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

  return (
    <div className="min-h-screen bg-[#FFE9EF] relative">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка Home – как на других страницах */}
        <Link
          to="/"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={homeIconUrl} alt="home" className="w-6 h-6 relative z-10" />
        </Link>

        {/* Заголовок */}
        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}
          >
            managing
          </h1>
          <p
            className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "0.4px #000" }}
          >
            version for admins
          </p>
        </div>

        {/* Панель разработчика */}
        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Панель разработчика</h2>
          <div className="h-px bg-black w-[210px] mb-4" />

          <div className="grid grid-cols-2 gap-3">
            <Link
                to="/admin/stats"
                className="relative bg-[#FFE9EF] rounded-[20px] h-32 flex items-center justify-center shadow cursor-pointer hover:opacity-90 transition"
                style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                    "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)",
                }}
                >
                <span className="text-[20px] tracking-[-1px] font-['Sofia_Sans'] text-black text-center">
                    Статистика<br />приложения
                </span>
                </Link>
            <div
              className="relative bg-[#FFD0DC] rounded-[20px] h-32 flex items-center justify-center shadow cursor-pointer hover:opacity-90 transition"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)",
              }}
              onClick={() => toast.info("Гайды (в разработке)")}
            >
              <span className="text-[20px] tracking-[-1px] font-['Sofia_Sans'] text-black text-center">
                Гайды
              </span>
            </div>
            <div
              className="relative bg-[#FFD0DC] rounded-[20px] h-32 flex items-center justify-center shadow cursor-pointer hover:opacity-90 transition"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)",
              }}
              onClick={() => toast.info("Поддержка (в разработке)")}
            >
              <span className="text-[20px] tracking-[-1px] font-['Sofia_Sans'] text-black text-center">
                Поддержка
              </span>
            </div>
            <div
              className="relative bg-[#FFE9EF] rounded-[20px] h-32 flex items-center justify-center shadow cursor-pointer hover:opacity-90 transition"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)",
              }}
              onClick={() => toast.info("Админская панель (в разработке)")}
            >
              <span className="text-[20px] tracking-[-1px] font-['Sofia_Sans'] text-black text-center">
                Админская<br />панель
              </span>
            </div>
          </div>
        </section>

        {/* Логи сервера */}
        <section className="mt-10">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Логи сервера</h2>
          <div className="h-px bg-black w-[210px] mb-4" />

          <div
            className="relative bg-white rounded-[10px] p-4 shadow-inner"
            style={{
              boxShadow: "inset 4px 4px 4px rgba(0, 0, 0, 0.25)",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {loadingLogs ? (
              <p className="text-black/50 text-center font-['Sofia_Sans']">Загрузка логов...</p>
            ) : logs.length === 0 ? (
              <p className="text-black/50 text-center font-['Sofia_Sans']">Логов пока нет</p>
            ) : (
              <div className="flex flex-col gap-1">
                {logs.map((log, idx) => (
                  <div key={idx} className="text-[12px] font-['Sofia_Sans'] text-black/80 break-words">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}