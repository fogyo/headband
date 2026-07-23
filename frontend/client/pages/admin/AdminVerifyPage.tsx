import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTelegramAuth } from "@/App";
import backIconSrc from "@/assets/back_icon.svg";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// Хеширование пароля через SHA‑256
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function AdminVerifyPage() {
  const navigate = useNavigate();
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId) {
      toast.error("Ошибка: не найден chat_id");
      return;
    }
    if (!password.trim()) {
      toast.error("Введите пароль");
      return;
    }

    setLoading(true);
    try {
      // 1. Хешируем пароль
      const hashed = await hashPassword(password.trim());

      // 2. Отправляем на бэкенд
      const res = await fetch(`${baseUrl}/admins/verify_admin?chat_id=${chatId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: hashed }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Ошибка верификации");
      }
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);

      toast.success("Доступ подтверждён");
      // Перенаправляем на админ‑панель (замените путь при необходимости)
      navigate("/admin", { replace: true });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось проверить пароль");
    } finally {
      setLoading(false);
    }
  };

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
            admin
          </h1>
        </div>

        {/* Форма верификации */}
        <section className="mt-8">
          <h2 className="text-[30px] leading-tight tracking-[-1.5px] text-black font-['Sofia_Sans']">
            Введите пароль
          </h2>
          <div className="h-px bg-black w-48 mb-4" />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div
              className="relative bg-[#FFE9EF] rounded-[10px] h-12 flex items-center px-3 shadow"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative bg-[#FFE9EF] rounded-[10px] h-12 shadow flex items-center justify-center disabled:opacity-50"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                {loading ? "Проверка..." : "Подтвердить"}
              </span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}