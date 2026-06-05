import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import backIcon from "@/assets/back_icon.svg";
import telegramIcon from "@/assets/telegram_icon.png";
import phoneIcon from "@/assets/phoneIcon.png";
import { Copy } from "lucide-react";
import InputMask from "react-input-mask";

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

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

interface ProfilePersonalResponse {
  status: string;
  full_name: string;
  tg: string;
  phone: string;
  description: string;
  tg_users: string;
  tg_master: string;
  ref_clients: number;
  ref_masters_active: number;
}

const getMasterBarState = (count: number): number => {
  if (count === 0) return 0;
  if ((count % 3) === 1) return 1;
  if ((count % 3) === 2) return 2;
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
  clientBar0, clientBar1, clientBar2, clientBar3,
  clientBar4, clientBar5, clientBar6, clientBar7, clientBar8,
];

// Форматирование сырых цифр в отображаемый номер (+7 (___) ___-__-__)
const formatPhoneForDisplay = (rawDigits: string): string => {
  const digits = rawDigits.replace(/\D/g, "");
  if (!digits) {
    return "+7 (___) ___-__-__";
  }
  // Форматируем даже неполный номер
  let result = "+7";
  if (digits.length > 1) result += ` (${digits.slice(1, 4)}`;
  if (digits.length >= 4) result += ")";
  if (digits.length > 4) result += ` ${digits.slice(4, 7)}`;
  if (digits.length > 7) result += `-${digits.slice(7, 9)}`;
  if (digits.length > 9) result += `-${digits.slice(9, 11)}`;
  // Если не хватает закрывающей скобки – добавим
  if (digits.length > 1 && digits.length < 4) result += ")";
  return result;
};

// Извлекает только цифры из маскированного значения (для хранения в состоянии)
const extractDigits = (masked: string): string => masked.replace(/\D/g, "");

export default function ProfilePersonalInfoPage() {
  const STATIC_CHAT_ID = 1386270482;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");          // храним только цифры
  const [tgUsername, setTgUsername] = useState("");
  const [bio, setBio] = useState("");
  const [masterReferralLink, setMasterReferralLink] = useState("");
  const [clientReferralLink, setClientReferralLink] = useState("");
  const [mastersCount, setMastersCount] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);
  const [priorityClients, setPriorityClients] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<"name" | "phone" | "bio" | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = `${baseUrl}/master/profile/personal/?chat_id=${STATIC_CHAT_ID}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ProfilePersonalResponse = await res.json();
        if (data.status !== "success") throw new Error(data.status);

        setFullName(data.full_name || "");
        // Очищаем телефон от всех нецифровых символов (бэк может вернуть +7...)
        setPhone(data.phone ? data.phone.replace(/\D/g, "") : "");
        setTgUsername(data.tg || "");
        setBio(data.description || "");
        setMasterReferralLink(data.tg_master);
        setClientReferralLink(data.tg_users);
        setMastersCount(data.ref_masters_active);
        setClientsCount(data.ref_clients);
        setPriorityClients(data.ref_clients); // временно
      } catch (err: any) {
        console.error(err);
        setError("Не удалось загрузить данные");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [STATIC_CHAT_ID]);

  const updateField = async (field: string, value: string) => {
    try {
      const payload: any = { chat_id_tg: STATIC_CHAT_ID };
      if (field === "name") payload.full_name = value;
      if (field === "phone") payload.phone = value;   // отправляем только цифры
      if (field === "bio") payload.description = value;
      if (field === "telegram") return;

      const res = await fetch(`${baseUrl}/master/profile/personal/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (result.status !== "success") throw new Error(result.status);
      toast.success("Изменения сохранены");
    } catch (err) {
      console.error(err);
      toast.error("Не удалось сохранить изменения");
    }
  };

  const handleNameBlur = () => {
    setEditing(null);
    updateField("name", fullName);
  };
  const handlePhoneBlur = () => {
    setEditing(null);
    updateField("phone", phone);
  };
  const handleBioBlur = () => {
    setEditing(null);
    updateField("bio", bio);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Ссылка скопирована!"))
      .catch(() => toast.error("Не удалось скопировать"));
  };

  const masterState = getMasterBarState(mastersCount);
  const clientState = getClientBarState(clientsCount);

  // Компонент для полей с редактированием (name, phone, bio)
 const EditableButton = ({
  field,
  value,
  setValue,
  placeholder = "",
  icon,
}: {
  field: "name" | "phone" | "bio";
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;
  icon?: string;
}) => {
  // Для телефона используем маску
  const displayValue = field === "phone" ? formatPhoneForDisplay(value) : value;

  return (
    <div className="w-full h-full">
      {editing === field ? (
        <div className="relative bg-[#FFE9EF] rounded-[10px] p-2 shadow h-full">
          {field === "phone" ? (
            <div className="flex items-center h-full">
              {icon && <img src={icon} className="w-7 h-7 rounded-full mr-2" alt="" />}
              <InputMask
                mask="+7 (999) 999-99-99"
                value={value}
                onChange={(e) => setValue(extractDigits(e.target.value))}
                onBlur={handlePhoneBlur}
              >
                {(inputProps) => (
                  <input
                    {...inputProps}
                    autoFocus
                    className="w-full bg-transparent text-sm font-['Sofia_Sans'] text-black outline-none text-center"
                    placeholder="+7 (___) ___-__-__"
                  />
                )}
              </InputMask>
            </div>
          ) : (
            <div className="flex items-center h-full">
              {icon && <img src={icon} className="w-7 h-7 rounded-full mr-2" alt="" />}
              <input
                autoFocus
                className="w-full bg-transparent text-sm font-['Sofia_Sans'] text-black outline-none text-left"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={field === "name" ? handleNameBlur : handleBioBlur}
                onKeyDown={(e) => e.key === "Enter" && (field === "name" ? handleNameBlur() : handleBioBlur())}
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
          style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)" }}
        >
          {icon && <img src={icon} className="w-7 h-7 rounded-full absolute left-3 top-1/2 -translate-y-1/2" alt="" />}
          <span className={`text-[14px] tracking-[-0.5px] ${icon ? "ml-10" : ""} text-center w-full`}>
            {displayValue || placeholder}
          </span>
        </button>
      )}
    </div>
  );
};


  // Компонент для статичного поля телеграма (без редактирования)
  const StaticTelegramField = ({ value, icon }: { value: string; icon?: string }) => (
    <div className="w-full h-full">
      <div
        className="w-full h-full relative bg-[#FFE9EF] rounded-[10px] py-3 shadow text-sm font-['Sofia_Sans'] text-black flex items-center"
        style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)" }}
      >
        {icon && <img src={icon} className="w-7 h-7 rounded-full absolute left-3 top-1/2 -translate-y-1/2" alt="" />}
        <span className={`text-[14px] tracking-[-0.5px] ${icon ? "ml-10" : ""} text-center w-full`}>
          {value || "tg: не указан"}
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500 font-['Sofia_Sans']">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        <Link
          to="/profile"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIcon} alt="back" className="w-6 h-6 relative z-10" />
        </Link>

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

        <section className="mt-8">
          <h2 className="text-[30px] leading-tight tracking-[-2px] text-black font-['Sofia_Sans']">О себе</h2>
          <div className="h-px bg-black w-52 mb-4" />

          <div className="flex justify-center mb-4">
            <img src="https://placehold.co/153x153" alt="avatar" className="w-40 h-40 rounded-full object-cover border border-black/10" />
          </div>

          <div className="mb-3">
            <EditableButton field="name" value={fullName} setValue={setFullName} />
          </div>

          <div className="flex gap-3 items-stretch">
            <div className="flex flex-col gap-3 flex-1">
              <div className="flex-1">
                <EditableButton field="phone" value={phone} setValue={setPhone} icon={phoneIcon} />
              </div>
              <div className="flex-1">
                <StaticTelegramField value={tgUsername} icon={telegramIcon} />
              </div>
            </div>
            <div className="flex-1">
              <EditableButton field="bio" value={bio} setValue={setBio} />
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-[30px] leading-tight tracking-[-2px] text-black font-['Sofia_Sans']">Реферальная ссылка</h2>
          <div className="h-px bg-black w-52 mb-4" />

          <h3 className="text-[20px] tracking-[-1px] font-['Sofia_Sans'] text-black mb-2">Для мастеров</h3>
          <div className="mb-4 text-sm font-['Sofia_Sans'] text-black">
            <p className="font-extrabold">Приводите мастеров и получайте бонусы!</p>
            <p>За каждых 3 друзей, оформивших подписку, — месяц использования headband бесплатно</p>
          </div>

          <div className="flex flex-col items-center mb-6">
            <div className="w-60 h-60 relative">
              <img src={masterBarImages[masterState]} alt="master bar" className="w-full h-full object-contain" />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                <span className="text-5xl font-['Sofia_Sans'] text-black leading-none">{mastersCount}</span>
                <span className="text-[10px] font-['Sofia_Sans'] text-black/50 text-center mt-1">мастеров оформили headband pro</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => handleCopy(masterReferralLink)}
            className="relative w-full bg-[#FFE9EF] rounded-[10px] py-3 px-4 flex items-center justify-center gap-2 shadow mb-4"
            style={{ border: "0.5px solid rgba(0,0,0,0.00), ", boxShadow: "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)" }}
          >
            <img src={telegramIcon} className="w-7 h-7 rounded-full flex-shrink-0" alt="" />
            <span className="text-base font-['Sofia_Sans'] text-black italic text-center flex-1">headband masters</span>
            <Copy className="w-4 h-4 text-black/100 flex-shrink-0" />
          </button>

          <h3 className="text-[20px] tracking-[-1px] font-['Sofia_Sans'] text-black mb-2 mt-8">Для клиентов</h3>
          <div className="mb-4 text-sm font-['Sofia_Sans'] text-black">
            <p className="font-extrabold">Используйте свою клиентскую ссылку, чтобы приглашать клиентов в headband.</p>
            <p>За каждым приглашенным клиентом вы закрепляетесь как постоянный мастер.</p>
          </div>

          <div className="flex gap-4 justify-center mb-6">
            <div className="flex flex-col items-center">
              <span className="text-5xl font-['Sofia_Sans'] text-black">{priorityClients}</span>
              <span className="text-[10px] font-['Sofia_Sans'] text-black/50 text-center">клиента при записи видят Вас в первую очередь</span>
            </div>
          </div>
          <button
            onClick={() => handleCopy(clientReferralLink)}
            className="relative w-full bg-[#FFE9EF] rounded-[10px] py-3 px-4 flex items-center justify-center gap-2 shadow mb-4"
            style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)" }}
          >
            <img src={telegramIcon} className="w-7 h-7 rounded-full flex-shrink-0" alt="" />
            <span className="text-base font-['Sofia_Sans'] text-black italic text-center flex-1">headband users</span>
            <Copy className="w-4 h-4 text-black/100 flex-shrink-0" />
          </button>
        </section>
      </div>
    </div>
  );
}