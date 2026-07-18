import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import backIcon from "@/assets/back_icon.svg";
import { toast } from "sonner";
import { useTelegramAuth } from "@/App";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

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
  id: string;
  label: string;
  enabled: boolean;
  field: keyof Omit<MasterNotification, "id" | "master_id">;
}

interface MasterNotification {
  id: string;
  master_id: string;
  appointment_notification: boolean;
  appointment_cancel_notification: boolean;
  appointment_confirm_notification: boolean;
  guide_approved_notification: boolean;
  subscription_ending_notification: boolean;
}

export default function ProfileNotificationsPage() {
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const labelMap: Record<keyof Omit<MasterNotification, "id" | "master_id">, string> = {
    appointment_notification: "Присылать уведомление о записи",
    appointment_cancel_notification: "Присылать уведомление о отмене записи",
    appointment_confirm_notification: "Присылать подтверждение записи",
    guide_approved_notification: "Присылать уведомление о одобрении гайда",
    subscription_ending_notification: "Присылать уведомление о заканчивающейся подписке",
  };

  const fetchNotifications = async () => {
    if (!chatId) return;
    const res = await fetch(`${baseUrl}/master/profile/notifications/?chat_id=${chatId}`);
    if (!res.ok) throw new Error("Ошибка загрузки настроек");
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.status);
    const notif: MasterNotification = data.notification;
    const settingsArray: NotificationSetting[] = (
      Object.keys(labelMap) as Array<keyof typeof labelMap>
    ).map((field) => ({
      id: field,
      label: labelMap[field],
      enabled: notif[field],
      field,
    }));
    setSettings(settingsArray);
  };

  const updateNotification = async (field: keyof MasterNotification, value: boolean) => {
    if (!chatId) return;
    const payload = { [field]: value };
    const res = await fetch(`${baseUrl}/master/profile/notifications/update?chat_id=${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Ошибка обновления");
    }
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.status);
  };

  const toggleSetting = async (id: string) => {
    const setting = settings.find(s => s.id === id);
    if (!setting) return;
    const newValue = !setting.enabled;
    setSettings(prev =>
      prev.map(s => (s.id === id ? { ...s, enabled: newValue } : s))
    );
    try {
      await updateNotification(setting.field, newValue);
      toast.success("Настройка обновлена");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка сохранения");
      setSettings(prev =>
        prev.map(s => (s.id === id ? { ...s, enabled: setting.enabled } : s))
      );
    }
  };

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (authError) {
      setError(authError);
      setLoading(false);
      return;
    }
    if (isVerified && chatId) {
      const load = async () => {
        try {
          setLoading(true);
          await fetchNotifications();
          setError(null);
        } catch (err: any) {
          console.error(err);
          setError("Не удалось загрузить настройки");
          toast.error(err.message);
        } finally {
          setLoading(false);
        }
      };
      load();
    } else {
      setLoading(false);
    }
  }, [isVerified, chatId, authLoading, authError]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }

  if (authError || error) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500 font-['Sofia_Sans']">{authError || error}</p>
      </div>
    );
  }

  if (!isVerified || !chatId) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500 font-['Sofia_Sans']">Ошибка авторизации</p>
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