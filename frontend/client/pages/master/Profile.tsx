import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import homeIconUrl from "@/assets/home.svg";
import arrowForwardIcon from "@/assets/arrow_forward.svg";
import accountCircleIcon from "@/assets/account_circle.svg";
import scheduleIcon from "@/assets/schedule.svg";
import priceListIcon from "@/assets/price_list.svg";
import incomeIcon from "@/assets/income.svg";
import guidesIcon from "@/assets/education.svg";
import portfolioIcon from "@/assets/portfolio.svg";
import notificationsIcon from "@/assets/notifications.svg";
import supportIcon from "@/assets/support.svg";
import feedbackIcon from "@/assets/feedback.svg";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

interface ProfileResponse {
  status: string;
  name: string | null;
  tg: string;
  phone: string | null;
  ambassador: boolean;
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
  const STATIC_CHAT_ID = 980609742; // TODO: заменить на window.Telegram.WebApp.initDataUnsafe.user.id

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const url = `${baseUrl}/master/profile/?chat_id=${STATIC_CHAT_ID}`;
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
  }, [STATIC_CHAT_ID]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
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

  // Подготовка данных с учётом null
  const fullName = profile.name || "Имя не указано";
  const telegram = profile.tg ? (profile.tg.startsWith("tg:") ? profile.tg : `tg: ${profile.tg}`) : "tg: не указан";
  const phone = profile.phone ? `+${profile.phone}` : "+7 (___) ___-__-__";
  const avatarUrl = "https://placehold.co/100x100"; // бэк не отдаёт аватар, оставляем заглушку

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка Home – оригинальные стили */}
        <Link
          to="/"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={homeIconUrl} alt="home" className="w-6 h-6 relative z-10" />
        </Link>

        {/* Header – без изменений */}
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

        {/* Секция "Аккаунт" – стили нетронуты */}
        <section className="mt-8">
          <h2
            className="text-[30px] leading-tight tracking-[-1.5px] text-black font-['Sofia_Sans']"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
            Аккаунт
          </h2>
          <div className="h-px bg-black w-36 mb-4" />

          {/* Аватар и данные – динамические значения */}
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

          {/* Меню "Аккаунт" – без изменений */}
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
            <MenuRow
              icon={portfolioIcon}
              label="Мои работы"
              to="/profile/portfolio"
            />
            <MenuRow
              icon={notificationsIcon}
              label="Уведомления"
              to="/profile/notifications"
            />
          </div>
        </section>

        {/* Секция "Приложение" – без изменений */}
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
              to="/support"
            />
            <MenuRow
              icon={feedbackIcon}
              label="Оставить отзыв о headband"
              to="/feedback"
            />
          </div>
        </section>
      </div>
    </div>
  );
}