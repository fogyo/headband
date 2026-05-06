import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import backIcon from "@/assets/back_icon.svg";
import telegramIcon from "@/assets/telegram_icon.png";
import phoneIcon from "@/assets/phoneIcon.png";
import { Copy } from "lucide-react";

// Мастер-бар
import masterBar0 from "@/assets/master_bar_0.svg";
import masterBar1 from "@/assets/master_bar_1.svg";
import masterBar2 from "@/assets/master_bar_2.svg";
import masterBar3 from "@/assets/master_bar_3.svg";

// Клиент-бар
import clientBar0 from "@/assets/client_bar_0.svg";
import clientBar1 from "@/assets/client_bar_1.svg";
import clientBar2 from "@/assets/client_bar_2.svg";
import clientBar3 from "@/assets/client_bar_3.svg";
import clientBar4 from "@/assets/client_bar_4.svg";
import clientBar5 from "@/assets/client_bar_5.svg";
import clientBar6 from "@/assets/client_bar_6.svg";
import clientBar7 from "@/assets/client_bar_7.svg";
import clientBar8 from "@/assets/client_bar_8.svg";

// Моковые данные пользователя
const userData = {
  fullName: "Ерохин Сергей Вячеславович",
  phone: "+7 (123) 456-78-90",
  tgUsername: "@erokha",
  bio: "Учился в международном институте дизайна и сервиса.\nСтаж 4 года\nРаботал в салонах TopGun, IT Studio",
  avatarUrl: "https://placehold.co/153x153",
  masterReferralLink: "https://headband.app/ref/masters/erokha",
  clientReferralLink: "https://headband.app/ref/users/erokha",
  mastersCount: 20,
  clientsCount: 34,
  priorityClients: 82,
};

const getMasterBarState = (count: number): number => {
  if (count === 0) return 0;
  if (count < 5) return 1;
  if (count < 10) return 2;
  return 3;
};

const getClientBarState = (count: number): number => {
  if (count === 0) return 0;
  if (count < 5) return 1;
  if (count < 10) return 2;
  if (count < 15) return 3;
  if (count < 20) return 4;
  if (count < 30) return 5;
  if (count < 40) return 6;
  if (count < 50) return 7;
  return 8;
};

const masterBarImages = [masterBar0, masterBar1, masterBar2, masterBar3];
const clientBarImages = [
  clientBar0,
  clientBar1,
  clientBar2,
  clientBar3,
  clientBar4,
  clientBar5,
  clientBar6,
  clientBar7,
  clientBar8,
];

export default function ProfilePersonalInfoPage() {
  const [fullName, setFullName] = useState(userData.fullName);
  const [phone, setPhone] = useState(userData.phone);
  const [tgUsername, setTgUsername] = useState(userData.tgUsername);
  const [bio, setBio] = useState(userData.bio);
  const [editing, setEditing] = useState<
    "name" | "phone" | "telegram" | "bio" | null
  >(null);

  const handleCopy = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Ссылка скопирована!"))
      .catch(() => toast.error("Не удалось скопировать"));
  };

  const masterState = getMasterBarState(userData.mastersCount);
  const clientState = getClientBarState(userData.clientsCount);

  // Локальный компонент для кнопки-поля
  const EditableButton = ({
    field,
    value,
    setValue,
    placeholder = "",
    icon,
  }: {
    field: "name" | "phone" | "telegram" | "bio";
    value: string;
    setValue: (v: string) => void;
    placeholder?: string;
    icon?: string;
  }) => (
    <div className="w-full h-full">
      {editing === field ? (
        <div className="relative bg-[#FFE9EF] rounded-[10px] p-2 shadow h-full">
          {field === "bio" ? (
            <textarea
              autoFocus
              className="w-full h-full bg-transparent text-xs font-['Sofia_Sans'] text-black outline-none resize-none text-left"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => setEditing(null)}
            />
          ) : (
            <div className="flex items-center h-full">
              {icon && (
                <img src={icon} className="w-7 h-7 rounded-full mr-2" alt="" />
              )}
              <input
                autoFocus
                className="w-full bg-transparent text-sm font-['Sofia_Sans'] text-black outline-none text-center"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => setEditing(null)}
                onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                placeholder={placeholder}
              />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="w-full h-full relative bg-[#FFE9EF] rounded-[10px] py-3 shadow text-sm font-['Sofia_Sans'] text-black flex items-center"
          onClick={() => setEditing(field)}
          style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)"}}
        >
          {icon && (
            <img
              src={icon}
              className="w-7 h-7 rounded-full absolute left-3 top-1/2 -translate-y-1/2"
              alt=""
            />
          )}
          {field === "bio" ? (
            <span className="text-[12px] tracking-[-0.5px] whitespace-pre-line text-left w-full px-4">
              {value || placeholder}
            </span>
          ) : (
            <span className={`text-[14px] tracking-[-0.5px] ${icon ? "ml-10" : ""} text-center w-full`}>
              {value || placeholder}
            </span>
          )}
        </button>
      )}
    </div>
  );

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

        {/* О себе */}
        <section className="mt-8">
          <h2 className="text-[30px] leading-tight tracking-[-2px] text-black font-['Sofia_Sans']">
            О себе
          </h2>
          <div className="h-px bg-black w-52 mb-4" />

          {/* Аватар */}
          <div className="flex justify-center mb-4">
            <img
              src={userData.avatarUrl}
              alt="avatar"
              className="w-40 h-40 rounded-full object-cover border border-black/10"
            />
          </div>

          {/* Имя — центрировано */}
          <div className="mb-3">
            <EditableButton field="name" value={fullName} setValue={setFullName} />
          </div>

          {/* Телефон и телеграм + описание */}
          <div className="flex gap-3 items-stretch">
            <div className="flex flex-col gap-3 flex-1">
              {/* Телефон — центрировано */}
              <div className="flex-1">
                <EditableButton
                  field="phone"
                  value={phone}
                  setValue={setPhone}
                  icon={phoneIcon}
                />
              </div>
              {/* Телеграм — центрировано */}
              <div className="flex-1">
                <EditableButton
                  field="telegram"
                  value={tgUsername}
                  setValue={setTgUsername}
                  icon={telegramIcon}
                />
              </div>
            </div>
            {/* Описание — выровнено влево */}
            <div className="flex-1">
              <EditableButton field="bio" value={bio} setValue={setBio} />
            </div>
          </div>
        </section>

        {/* Реферальная ссылка */}
        <section className="mt-10">
          <h2 className="text-[30px] leading-tight tracking-[-2px] text-black font-['Sofia_Sans']"> Реферальная ссылка</h2>
          <div className="h-px bg-black w-52 mb-4" />

          {/* Для мастеров */}
          <h3 className="text-[20px] tracking-[-1px] font-['Sofia_Sans'] text-black mb-2">Для мастеров</h3>
          <div className="mb-4 text-sm font-['Sofia_Sans'] text-black">
            <p className="font-extrabold">Приводите мастеров и получайте бонусы!</p>
            <p>За каждых 3 друзей, оформивших подписку, — месяц использования headband бесплатно</p>
          </div>

          {/* Статистика мастеров */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-60 h-60 relative">
                <img
                src={masterBarImages[masterState]}
                alt="master bar"
                className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                <span className="text-5xl font-['Sofia_Sans'] text-black leading-none">
                    {userData.mastersCount}
                </span>
                <span className="text-[10px] font-['Sofia_Sans'] text-black/50 text-center mt-1">
                    мастеров оформили headband pro
                </span>
                </div>
            </div>
            </div>
            <button
            onClick={() => handleCopy(userData.masterReferralLink)}
            className="relative w-full bg-[#FFE9EF] rounded-[10px] py-3 px-4 flex items-center justify-center gap-2 shadow mb-4"
            style={{ border: "0.5px solid rgba(0,0,0,0.00), ", boxShadow: "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)" }}
            >
            {/* Левая иконка телеграма */}
            <img
                src={telegramIcon}
                className="w-7 h-7 rounded-full flex-shrink-0"
                alt=""
            />
            {/* Текст по центру */}
            <span className="text-base font-['Sofia_Sans'] text-black italic text-center flex-1">
                headband masters
            </span>
            {/* Иконка копирования справа */}
            <Copy className="w-4 h-4 text-black/100 flex-shrink-0" />
            </button>
          {/* Для клиентов */}
          <h3 className="text-[20px] tracking-[-1px] font-['Sofia_Sans'] text-black mb-2 mt-8">Для клиентов</h3>
            
          <div className="mb-4 text-sm font-['Sofia_Sans'] text-black">
            <p className="font-extrabold">Используйте свою клиентскую ссылку, чтобы приглашать клиентов в headband.</p>
            <p>За каждым приглашенным клиентом вы закрепляетесь как постоянный мастер.</p>
          </div>
            
          {/* Статистика клиентов */}
          <div className="flex gap-4 justify-center mb-6">
            <div className="flex flex-col items-center">
              <span className="text-5xl font-['Sofia_Sans'] text-black">{userData.priorityClients}</span>
              <span className="text-[10px] font-['Sofia_Sans'] text-black/50 text-center">
                клиента при записи видят Вас в первую очередь
              </span>
            </div>
          </div>
          <button
            onClick={() => handleCopy(userData.clientReferralLink)}
            className="relative w-full bg-[#FFE9EF] rounded-[10px] py-3 px-4 flex items-center justify-center gap-2 shadow mb-4"
            style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)" }}
            >
            <img
                src={telegramIcon}
                className="w-7 h-7 rounded-full flex-shrink-0"
                alt=""
            />
            <span className="text-base font-['Sofia_Sans'] text-black italic text-center flex-1">
                headband users
            </span>
            <Copy className="w-4 h-4 text-black/100 flex-shrink-0" />
            </button>
        </section>
      </div>
    </div>
  );
}