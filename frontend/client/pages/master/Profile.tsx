import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import homeIconUrl from "@/assets/home.svg";
import arrowForwardIcon from "@/assets/arrow_forward.svg";
import accountCircleIcon from "@/assets/account_circle.svg";
import scheduleIcon from "@/assets/schedule.svg";
import priceListIcon from "@/assets/price_list.svg";
import incomeIcon from "@/assets/income.svg";
import guidesIcon from "@/assets/education.svg";
import notificationsIcon from "@/assets/notifications.svg";
import supportIcon from "@/assets/support.svg";
import feedbackIcon from "@/assets/feedback.svg";
import baseManAvatar from "@/assets/base_man_avatar.png";
import { useTelegramAuth } from "@/App";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

interface ProfileResponse {
  status: string;
  name: string | null;
  tg: string;
  phone: string | null;
  ambassador: boolean;
  avatar: string;
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function MenuRow({
  icon,
  label,
  to = "#",
  onClick,
}: {
  icon: string;
  label: string;
  to?: string;
  onClick?: () => void;
}) {
  const content = (
    <div
      className="relative flex items-center gap-3 px-4 py-3 rounded-[10px] bg-[#FFE9EF] shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)] mx-[-8px]"
      style={{ border: "0.5px solid rgba(0,0,0,0.00)" }}
    >
      <img src={icon} alt="" className="relative z-10 w-6 h-6" />
      <span className="relative z-10 flex-1 text-[20px] tracking-[-1px] font-['Sofia_Sans'] text-black">
        {label}
      </span>
      <img
        src={arrowForwardIcon}
        alt=">"
        className="relative z-10 w-6 h-6"
      />
    </div>
  );

  if (to !== "#") {
    return <Link to={to}>{content}</Link>;
  }
  return (
    <button onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}

export default function ProfilePage() {
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Состояния для модалки поддержки
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportComment, setSupportComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isVerified || !chatId) {
      if (authLoading) {
        setLoading(true);
        setError(null);
      } else if (authError) {
        setError(authError);
        setLoading(false);
      } else {
        setError("Ожидание авторизации...");
        setLoading(false);
      }
      return;
    }

    const fetchProfile = async () => {
      try {
        const url = `${baseUrl}/master/profile/?chat_id=${chatId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ProfileResponse = await res.json();
        if (data.status !== "success") throw new Error(data.status);
        setProfile(data);
      } catch (err: any) {
        console.error(err);
        setError("Не удалось загрузить профиль");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [chatId, isVerified, authLoading, authError]);

  const openSupportModal = () => {
    setSupportComment("");
    setIsSupportModalOpen(true);
  };

  const closeSupportModal = () => {
    setIsSupportModalOpen(false);
    setSupportComment("");
  };

  const handleSupportSubmit = async () => {
    if (!chatId) {
      toast.error("Ошибка: не найден chat_id");
      return;
    }
    if (!supportComment.trim()) {
      toast.error("Введите сообщение");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${baseUrl}/admins/communication?chat_id=${chatId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: supportComment.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        throw new Error(data.status || "Ошибка отправки");
      }
      toast.success("Сообщение отправлено в поддержку");
      closeSupportModal();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось отправить сообщение");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500 font-['Sofia_Sans']">{error || "Ошибка загрузки"}</p>
      </div>
    );
  }

  const fullName = profile.name || "Имя не указано";
  const telegram = profile.tg ? (profile.tg.startsWith("tg:") ? profile.tg : `tg: ${profile.tg}`) : "tg: не указан";
  const phone = profile.phone ? `+${profile.phone}` : "+7 (___) ___-__-__";
  // fallback на base_man_avatar, если avatar пустой или не задан
  const avatarUrl = (profile.avatar && isValidUrl(profile.avatar)) 
    ? profile.avatar 
    : baseManAvatar;

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        <Link
          to="/"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={homeIconUrl} alt="home" className="w-6 h-6 relative z-10" />
        </Link>

        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{
              fontFamily: "Poppins, sans-serif",
              WebkitTextStroke: "1px #000",
            }}
          >
            profile
          </h1>
          <p
            className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]"
            style={{
              fontFamily: "Poppins, sans-serif",
              WebkitTextStroke: "0.4px #000",
            }}
          >
            version for masters
          </p>
        </div>

        <section className="mt-8">
          <h2
            className="text-[30px] leading-tight tracking-[-1.5px] text-black font-['Sofia_Sans']"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
            Аккаунт
          </h2>
          <div className="h-px bg-black w-36 mb-4" />

          <div className="flex items-center gap-4 mb-6">
            <img
              src={avatarUrl}
              alt="avatar"
              className="w-24 h-24 rounded-full object-cover border border-black/10"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                {fullName}
              </span>
              <span className="text-[13px] tracking-[-0.6px] font-['Sofia_Sans'] text-black/50">
                {telegram}
              </span>
              <span className="text-[13px] tracking-[-0.6px] font-['Sofia_Sans'] text-black/50">
                {phone}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <MenuRow
              icon={accountCircleIcon}
              label="Персональная информация"
              to="/profile/personal-info"
            />
            <MenuRow
              icon={scheduleIcon}
              label="График работы"
              to="/profile/schedule"
            />
            <MenuRow
              icon={priceListIcon}
              label="Прайс-лист"
              to="/profile/price-list"
            />
            <MenuRow
              icon={incomeIcon}
              label="Доходы"
              to="/profile/income"
            />
            <MenuRow
              icon={guidesIcon}
              label="Гайды"
              to="/profile/guides"
            />
            {/* Пункт "Мои работы" удалён */}
            <MenuRow
              icon={notificationsIcon}
              label="Уведомления"
              to="/profile/notifications"
            />
          </div>
        </section>

        <section className="mt-10">
          <h2
            className="text-[30px] leading-tight tracking-[-1.5px] text-black font-['Sofia_Sans']"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
            Приложение
          </h2>
          <div className="h-px bg-black w-36 mb-4" />

          <div className="flex flex-col gap-2">
            <MenuRow
              icon={supportIcon}
              label="Написать в поддержку"
              onClick={openSupportModal}
            />
            <MenuRow
              icon={feedbackIcon}
              label="Оставить отзыв о headband"
              to="/feedback"
            />
          </div>
        </section>
      </div>

      {/* Модальное окно поддержки */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-[24px] font-semibold mb-4 text-black">Написать в поддержку</h3>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-[14px] font-['Sofia_Sans'] text-black resize-none focus:outline-none focus:ring-2 focus:ring-pink-300"
              rows={4}
              placeholder="Опишите вашу проблему или вопрос..."
              value={supportComment}
              onChange={(e) => setSupportComment(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeSupportModal}
                className="px-4 py-2 text-[14px] font-medium text-gray-600 hover:text-gray-800"
              >
                Отмена
              </button>
              <button
                onClick={handleSupportSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#FA4F96] text-white rounded-lg text-[14px] font-medium hover:bg-[#e8447e] disabled:opacity-50"
              >
                {isSubmitting ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}