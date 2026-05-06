import { useState } from "react";
import { Link } from "react-router-dom";
import backIcon from "@/assets/back_icon.svg";

// Тот же Toggle, что на странице расписания
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={`relative w-10 h-5 rounded-[5px] text-[12px] tracking-[-0.6px] font-bold font-['Sofia_Sans'] ${
      checked
        ? "bg-[#7FD1AE]/60 text-black/50 shadow-[inset_4px_4px_4px_0px_rgba(0,0,0,0.25)]"
        : "bg-[#FA4F96]/60 text-white/60 shadow-[2px_2px_7px_0px_rgba(0,0,0,0.10),9px_10px_13px_0px_rgba(0,0,0,0.09),20px_22px_18px_0px_rgba(0,0,0,0.05),36px_38px_21px_0px_rgba(0,0,0,0.01),57px_60px_23px_0px_rgba(0,0,0,0.00)]"
    }`}
  >
    {checked ? "on" : "off"}
  </button>
);

interface NotificationSetting {
  id: number;
  label: string;
  enabled: boolean;
}

const initialSettings: NotificationSetting[] = [
  { id: 1, label: "Присылать уведомление о записи", enabled: false },
  { id: 2, label: "Присылать уведомление о отмене записи", enabled: true },
  { id: 3, label: "Присылать подтверждение записи", enabled: true },
  { id: 4, label: "Присылать уведомление о одобрении гайда", enabled: false },
  { id: 5, label: "Присылать уведомление о заканчивающейся подписке", enabled: false },
];

export default function ProfileNotificationsPage() {
  const [settings, setSettings] = useState(initialSettings);

  const toggleSetting = (id: number) => {
    setSettings(prev =>
      prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
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

        {/* Уведомления */}
        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black"> Уведомления</h2>
          <div className="h-px bg-black w-56 mb-4" />

          <div className="flex flex-col gap-2">
            {settings.map((setting) => (
              <div key={setting.id} className="flex items-center justify-between py-2">
                <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black">{setting.label}</span>
                <Toggle checked={setting.enabled} onChange={() => toggleSetting(setting.id)} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}