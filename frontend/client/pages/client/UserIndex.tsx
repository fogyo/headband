import { useEffect, useState } from "react";
import appointmentHairdressingImg from "@/assets/appointment_card_hairdressing.png";
import appointmentCosmetologyImg from "@/assets/appointment_card_cosmetology.png";
import appointmentNailsImg from "@/assets/appointment_card_nails.png";
import appointmentBrowsLashesImg from "@/assets/appointment_card_lashes.png";
import appointmentEpilationImg from "@/assets/appointment_card_epilation.png";
import appointmentMakeupImg from "@/assets/appointment_card_makeup.png";
import appointmentSolariumImg from "@/assets/appointment_card_solarium.png";
import appointmentMassageSpaImg from "@/assets/appointment_card_massage.png";
import appointmentConsultationsImg from "@/assets/appointment_card_consultation.png";
import loadingSpinner from "@/assets/loading.svg";
import { Calendar, Clock, Banknote, MessageCircle, Pencil, X, Flag } from "lucide-react";
import HeadbeautyAICard from "@/components/HeadbeautyAICard";
import { toast } from "sonner";
import otherImg from "@/assets/other_cat.png";
import consultationImg from "@/assets/consultation_cat.png";
import spaImg from "@/assets/massage_cat.png";
import tanImg from "@/assets/tan_cat.png";
import makeupImg from "@/assets/makeup_cat.png";
import epilationImg from "@/assets/epilation_cat.png";
import lashesImg from "@/assets/lashes_cat.png";
import nailsImg from "@/assets/nails_cat.png";
import creamImg from "@/assets/cream_cat.png";
import barberImg from "@/assets/scissors_cat.png";
import { Link } from "react-router-dom";
import { useTelegramAuth } from "@/App";
import arrowForwardIcon from "@/assets/arrow_forward.svg";
import supportIcon from "@/assets/support.svg";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

interface MessageInChat {
  message_id: string;
  text: string;
  my: boolean;
  created_at: string;
}

const categoryImages: Record<string, string> = {
  "hairdressing": appointmentHairdressingImg,
  "cosmetology": appointmentCosmetologyImg,
  "nails": appointmentNailsImg,
  "brows-lashes": appointmentBrowsLashesImg,
  "epilation": appointmentEpilationImg,
  "makeup": appointmentMakeupImg,
  "solarium": appointmentSolariumImg,
  "massage-spa": appointmentMassageSpaImg,
  "consultations": appointmentConsultationsImg,
  "other": appointmentHairdressingImg,
};

interface AppointmentApi {
  appointment_id: string;
  service_name: string;
  address: string;
  day: string;
  start_time: string;
  end_time: string;
  price: number;
  parental_category: string;
}
interface Appointment {
  id: string;
  service: string;
  address: string;
  date: string;
  time: string;
  price: string;
  parentalCategory: string;
}

const formatDateWithWeekday = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const weekday = weekdays[date.getDay()];
  return `${day}.${month.toString().padStart(2, "0")} ${weekday}`;
};

const toHHMM = (timeWithSec: string): string => timeWithSec.slice(0, 5);

const mapApiToAppointment = (api: AppointmentApi): Appointment => ({
  id: api.appointment_id,
  service: api.service_name,
  address: api.address,
  date: formatDateWithWeekday(api.day),
  time: `${toHHMM(api.start_time)}-${toHHMM(api.end_time)}`,
  price: `${api.price} ₽`,
  parentalCategory: api.parental_category,
});

function getGreeting(): string {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  if (totalMinutes >= 361 && totalMinutes <= 720) return "good morning";
  if (totalMinutes >= 721 && totalMinutes <= 1140) return "good day";
  if (totalMinutes >= 1141 && totalMinutes <= 1320) return "good evening";
  return "good night";
}

// Компоненты меню (без изменений)
function IconMenuRow({
  icon: Icon,
  label,
  to = "#",
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  to?: string;
  onClick?: () => void;
}) {
  const content = (
    <div
      className="relative flex items-center gap-3 px-4 py-3 rounded-[10px] bg-[#FFE9EF] shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)] mx-[-8px]"
      style={{ border: "0.5px solid rgba(0,0,0,0.00)" }}
    >
      <Icon className="relative z-10 w-6 h-6 text-black" />
      <span className="relative z-10 flex-1 text-[20px] tracking-[-1px] font-['Sofia_Sans'] text-black">{label}</span>
      <img src={arrowForwardIcon} alt=">" className="relative z-10 w-6 h-6" />
    </div>
  );
  if (to !== "#") return <Link to={to}>{content}</Link>;
  return <button onClick={onClick} className="w-full text-left">{content}</button>;
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
      <span className="relative z-10 flex-1 text-[20px] tracking-[-1px] font-['Sofia_Sans'] text-black">{label}</span>
      <img src={arrowForwardIcon} alt=">" className="relative z-10 w-6 h-6" />
    </div>
  );
  if (to !== "#") return <Link to={to}>{content}</Link>;
  return <button onClick={onClick} className="w-full text-left">{content}</button>;
}

// Компонент записей с чатом
function UserAppointments({ onOpenChat }: { onOpenChat: (appointmentId: string) => void }) {
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    if (!chatId) return;
    try {
      const res = await fetch(`${baseUrl}/users/welcome/?chat_id=${chatId}`);
      if (!res.ok) throw new Error("Ошибка загрузки записей");
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      const mapped = data.appointments.map(mapApiToAppointment);
      setAppointments(mapped);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Не удалось загрузить записи");
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    if (!chatId) return;
    try {
      const res = await fetch(`${baseUrl}/users/welcome/appointment?appointment_id=${appointmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Ошибка отмены");
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      setAppointments(prev => prev.filter(a => a.id !== appointmentId));
      toast.success("Запись отменена");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось отменить запись");
    }
  };

  useEffect(() => {
    if (isVerified && chatId) {
      fetchAppointments();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isVerified, chatId, authLoading]);

  useEffect(() => {
    if (authError) {
      setError(authError);
      setLoading(false);
    }
  }, [authError]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <img src={loadingSpinner} alt="Загрузка..." className="w-12 h-12" />
      </div>
    );
  }

  if (error || authError) {
    return (
      <div className="flex justify-center items-center py-8">
        <p className="text-red-500 text-[16px] tracking-[-0.8px] font-['Sofia_Sans']">{error || authError}</p>
      </div>
    );
  }

  return (
    <div>
      {appointments.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-black/50 text-[16px] tracking-[-0.8px] font-['Sofia_Sans']">Пока Вы никуда не записаны</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {appointments.map((app) => {
            const image = categoryImages[app.parentalCategory] || appointmentHairdressingImg;
            return (
              <div
                key={app.id}
                className="relative bg-[#FFE9EF] rounded-[10px] p-4 shadow-md flex gap-3"
                style={{
                  boxShadow:
                    "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)",
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  background: "#FFE9EF",
                }}
              >
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <p className="text-[15px] tracking-[-0.75px] font-['Sofia_Sans'] text-black leading-tight">
                      {app.service}
                    </p>
                    <p className="text-[10px] tracking-[-0.5px] font-['Sofia_Sans'] text-black/50 mt-1">
                      {app.address}
                    </p>
                    <div className="h-px bg-black w-30 my-2 mx-auto" />
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                        <Calendar className="w-full h-full text-black/100" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] tracking-[-0.5px] font-['Sofia_Sans'] text-black/50 leading-tight">Дата</span>
                        <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black leading-tight truncate">
                          {app.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                        <Clock className="w-full h-full text-black/100" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] tracking-[-0.5px] font-['Sofia_Sans'] text-black/50 leading-tight">Время</span>
                        <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black leading-tight truncate">
                          {app.time}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                        <Banknote className="w-full h-full text-black/100" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] tracking-[-0.5px] font-['Sofia_Sans'] text-black/50 leading-tight">Цена</span>
                        <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black leading-tight truncate">
                          {app.price}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (window.confirm("Вы уверены, что хотите отменить запись?")) {
                        await cancelAppointment(app.id);
                      }
                    }}
                    className="mt-3 bg-[#FA4F96] rounded-[5px] h-6 w-28 text-white text-xs font-['Sofia_Sans'] self-center"
                    style={{
                      boxShadow:
                        "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)",
                      border: "0.5px solid rgba(0,0,0,0.00)",
                    }}
                  >
                    Отменить
                  </button>
                </div>

                {/* Правая часть с картинкой и кнопкой чата */}
                <div
                  className="w-[60%] flex-shrink-0 relative rounded-[10px] overflow-hidden border border-white"
                  style={{
                    boxShadow: "4px 4px 4px 0 rgba(0, 0, 0, 0.25) inset",
                    aspectRatio: "205 / 190",
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenChat(app.id);
                    }}
                    className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center z-10"
                    style={{
                      boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09)",
                    }}
                  >
                    <MessageCircle className="w-4 h-4 text-black" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  title,
  image,
  bgColor,
  to,
}: {
  title: string;
  image: string;
  bgColor: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className={`relative ${bgColor} rounded-[20px] p-4 shadow-md overflow-hidden h-28 block`}
      style={{
        border: "0.5px solid rgba(0,0,0,0.00)",
        boxShadow:
          "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
      }}
    >
      <span className="relative z-10 text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black leading-tight whitespace-pre-line">
        {title}
      </span>
      <img
        src={image}
        alt={title}
        className="absolute top-0 right-0 h-full w-auto object-cover max-w-none"
      />
    </Link>
  );
}

const categories = [
  { title: "Парикмахерские\nуслуги", image: barberImg, bgColor: "bg-[#FFE9EF]", slug: "hairdressing" },
  { title: "Косметология,\nSkincare", image: creamImg, bgColor: "bg-[#FFD0DC]", slug: "cosmetology" },
  { title: "Маникюр,\nпедикюр", image: nailsImg, bgColor: "bg-[#FFD0DC]", slug: "nails" },
  { title: "Брови,\nресницы", image: lashesImg, bgColor: "bg-[#FFE9EF]", slug: "brows-lashes" },
  { title: "Депиляция,\nэпиляция", image: epilationImg, bgColor: "bg-[#FFE9EF]", slug: "epilation" },
  { title: "Makeup", image: makeupImg, bgColor: "bg-[#FFD0DC]", slug: "makeup" },
  { title: "Солярий", image: tanImg, bgColor: "bg-[#FFD0DC]", slug: "solarium" },
  { title: "Массажи,\nSPA", image: spaImg, bgColor: "bg-[#FFE9EF]", slug: "massage-spa" },
  { title: "Консультации", image: consultationImg, bgColor: "bg-[#FFE9EF]", slug: "consultations" },
  { title: "Другое", image: otherImg, bgColor: "bg-[#FFD0DC]", slug: "other" },
];

export default function UserIndexPage() {
  const greeting = getGreeting();
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  // Состояния для поддержки
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportComment, setSupportComment] = useState("");
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  // Состояния для жалобы
  const [isComplainModalOpen, setIsComplainModalOpen] = useState(false);
  const [complaintStep, setComplaintStep] = useState<"select" | "text">("select");
  const [masters, setMasters] = useState<{ id: string; name: string; avatar: string }[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState<string | null>(null);
  const [complaintText, setComplaintText] = useState("");
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(false);

  // Состояния для чата
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatAppointmentId, setChatAppointmentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageInChat[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // --- Функции поддержки ---
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
    setIsSubmittingSupport(true);
    try {
      const response = await fetch(`${baseUrl}/admins/communication?chat_id=${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setIsSubmittingSupport(false);
    }
  };

  // --- Функции жалобы ---
  const openComplainModal = async () => {
    setIsComplainModalOpen(true);
    setComplaintStep("select");
    setSelectedMasterId(null);
    setComplaintText("");
    setLoadingMasters(true);
    try {
      const res = await fetch(`${baseUrl}/users/welcome/previous_masters?chat_id=${chatId}`);
      if (!res.ok) throw new Error("Ошибка загрузки мастеров");
      const data = await res.json();
      if (data.status === "success") {
        setMasters(data.masters || []);
      } else {
        throw new Error(data.status);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Не удалось загрузить список мастеров");
    } finally {
      setLoadingMasters(false);
    }
  };
  const closeComplainModal = () => {
    setIsComplainModalOpen(false);
    setComplaintStep("select");
    setSelectedMasterId(null);
    setComplaintText("");
  };
  const selectMaster = (masterId: string) => {
    setSelectedMasterId(masterId);
    setComplaintStep("text");
  };
  const handleComplaintSubmit = async () => {
    if (!chatId || !selectedMasterId) {
      toast.error("Ошибка: данные не полные");
      return;
    }
    if (!complaintText.trim()) {
      toast.error("Опишите причину жалобы");
      return;
    }
    setIsSubmittingComplaint(true);
    try {
      const res = await fetch(`${baseUrl}/users/welcome/master_complaint?chat_id=${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ master_id: selectedMasterId, text: complaintText.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.status || "Ошибка отправки");
      }
      toast.success("Жалоба отправлена");
      closeComplainModal();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось отправить жалобу");
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  // --- Функции чата ---
  const openChat = (appointmentId: string) => {
    setChatAppointmentId(appointmentId);
    setIsChatModalOpen(true);
    fetchMessages(appointmentId);
  };

  const closeChat = () => {
    setIsChatModalOpen(false);
    setChatAppointmentId(null);
    setMessages([]);
    setNewMessage("");
    setEditingMessageId(null);
    setEditingMessageText("");
  };

  const fetchMessages = async (appointmentId: string) => {
    if (!chatId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`${baseUrl}/users/welcome/appointment_chat?chat_id=${chatId}&appointment_id=${appointmentId}`);
      if (!res.ok) throw new Error("Ошибка загрузки сообщений");
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Не удалось загрузить историю чата");
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!chatId || !chatAppointmentId) return;
    if (!newMessage.trim()) {
      toast.warning("Введите сообщение");
      return;
    }
    setIsSending(true);
    try {
      if (editingMessageId) {
        // Редактирование
        const res = await fetch(`${baseUrl}/users/welcome/edit_message?message_id=${editingMessageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: newMessage.trim() }),
        });
        if (!res.ok) throw new Error("Ошибка редактирования");
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);
        ///toast.success("Сообщение изменено");
        setEditingMessageId(null);
        setEditingMessageText("");
      } else {
        // Отправка нового
        const res = await fetch(`${baseUrl}/users/welcome/write_message_to_master?chat_id=${chatId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointment_id: chatAppointmentId, text: newMessage.trim() }),
        });
        if (!res.ok) throw new Error("Ошибка отправки");
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);
        ///toast.success("Сообщение отправлено");
      }
      setNewMessage("");
      await fetchMessages(chatAppointmentId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка отправки");
    } finally {
      setIsSending(false);
    }
  };

  const startEdit = (messageId: string, text: string) => {
    setEditingMessageId(messageId);
    setEditingMessageText(text);
    setNewMessage(text);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingMessageText("");
    setNewMessage("");
  };

  // --- Рендер ---
  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10">
        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{
              fontFamily: "Poppins, sans-serif",
              WebkitTextStroke: "1px #000",
            }}
          >
            {greeting}
          </h1>
        </div>

        <section className="mt-6">
          <h2
            className="text-[40px] leading-tight tracking-[-2px] text-black"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
            Записи
          </h2>
          <div className="h-px bg-black w-[210px] mb-4" />
          <UserAppointments onOpenChat={openChat} />
        </section>

        <section className="mt-10">
          <h2
            className="text-[40px] leading-tight tracking-[-2px] text-black"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
            Услуги
          </h2>
          <div className="h-px bg-black w-[210px] mb-4" />
          <div className="grid grid-cols-2 gap-4">
            {categories.map((cat, idx) => (
              <ServiceCard
                key={idx}
                title={cat.title}
                image={cat.image}
                bgColor={cat.bgColor}
                to={`/category/${cat.slug}`}
              />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-3">
            <h2
              className="text-[40px] leading-tight tracking-[-2px] text-black"
              style={{ fontFamily: "'Sofia Sans', sans-serif" }}
            >
              headbeauty
            </h2>
            <div className="h-px bg-black w-[210px]" />
          </div>
          <HeadbeautyAICard />
        </section>

        {/* Секция "Коммуникация" */}
        <section className="mt-10">
          <h2
            className="text-[30px] leading-tight tracking-[-1.5px] text-black font-['Sofia_Sans']"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
            Коммуникация
          </h2>
          <div className="h-px bg-black w-36 mb-4" />

          <div className="flex flex-col gap-2">
            <MenuRow
              icon={supportIcon}
              label="Написать в поддержку"
              onClick={openSupportModal}
            />
            <IconMenuRow
              icon={Flag}
              label="Сообщить о мастере"
              onClick={openComplainModal}
            />
          </div>
        </section>
      </div>

      {/* Модалка поддержки */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[24px] font-semibold text-black">Написать в поддержку</h3>
              <button onClick={closeSupportModal} className="text-black/50 hover:text-black">
                <X className="w-6 h-6" />
              </button>
            </div>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-[14px] font-['Sofia_Sans'] text-black resize-none focus:outline-none focus:ring-2 focus:ring-pink-300"
              rows={4}
              placeholder="Опишите вашу проблему или вопрос..."
              value={supportComment}
              onChange={(e) => setSupportComment(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeSupportModal} className="px-4 py-2 text-[14px] font-medium text-gray-600 hover:text-gray-800">
                Отмена
              </button>
              <button
                onClick={handleSupportSubmit}
                disabled={isSubmittingSupport}
                className="px-4 py-2 bg-[#FA4F96] text-white rounded-lg text-[14px] font-medium hover:bg-[#e8447e] disabled:opacity-50"
              >
                {isSubmittingSupport ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка жалобы */}
      {isComplainModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[24px] font-semibold text-black">
                {complaintStep === "select" ? "Выберите мастера" : "Опишите жалобу"}
              </h3>
              <button onClick={closeComplainModal} className="text-black/50 hover:text-black">
                <X className="w-6 h-6" />
              </button>
            </div>

            {complaintStep === "select" && (
              <>
                {loadingMasters ? (
                  <div className="flex justify-center py-4">
                    <img src={loadingSpinner} alt="Загрузка..." className="w-8 h-8" />
                  </div>
                ) : masters.length === 0 ? (
                  <p className="text-center text-black/50 py-4">У вас пока нет предыдущих мастеров</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {masters.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => selectMaster(m.id)}
                        className="flex items-center gap-3 px-4 py-3 bg-[#FFE9EF] rounded-[10px] shadow-sm hover:shadow-md transition-shadow w-full text-left"
                        style={{
                          border: "0.5px solid rgba(0,0,0,0.00)",
                          boxShadow:
                            "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05)",
                        }}
                      >
                        <img
                          src={m.avatar || "https://placehold.co/40x40"}
                          alt={m.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">{m.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {complaintStep === "text" && (
              <>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-3 text-[14px] font-['Sofia_Sans'] text-black resize-none focus:outline-none focus:ring-2 focus:ring-pink-300"
                  rows={4}
                  placeholder="Опишите причину жалобы на мастера..."
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                />
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setComplaintStep("select")}
                    className="px-4 py-2 text-[14px] font-medium text-gray-600 hover:text-gray-800"
                  >
                    Назад
                  </button>
                  <button
                    onClick={handleComplaintSubmit}
                    disabled={isSubmittingComplaint}
                    className="px-4 py-2 bg-[#FA4F96] text-white rounded-lg text-[14px] font-medium hover:bg-[#e8447e] disabled:opacity-50"
                  >
                    {isSubmittingComplaint ? "Отправка..." : "Отправить"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Модалка чата */}
      {isChatModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[24px] font-semibold text-black">Чат с мастером</h3>
              <button onClick={closeChat} className="text-black/50 hover:text-black">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto mb-4">
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <img src={loadingSpinner} alt="Загрузка..." className="w-8 h-8" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-black/50 py-8">Нет сообщений</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.message_id}
                      className={`flex flex-col ${msg.my ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`rounded-[10px] px-3 py-2 max-w-[80%] ${
                          msg.my ? "bg-[#FA4F96] text-white" : "bg-[#FFE9EF] text-black"
                        }`}
                        style={{
                          boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09)",
                        }}
                      >
                        <p className="text-[14px] font-['Sofia_Sans'] break-words">{msg.text}</p>
                        <p className="text-[10px] font-['Sofia_Sans'] opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {msg.my && (
                        <button
                          onClick={() => startEdit(msg.message_id, msg.text)}
                          className="mt-1 text-black/50 hover:text-black"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={editingMessageId ? "Редактировать сообщение..." : "Написать сообщение..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-[14px] font-['Sofia_Sans'] text-black outline-none focus:ring-2 focus:ring-pink-300"
              />
              {editingMessageId && (
                <button
                  onClick={cancelEdit}
                  className="px-2 py-2 text-black/50 hover:text-black"
                  title="Отменить редактирование"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={sendMessage}
                disabled={isSending || !newMessage.trim()}
                className="px-4 py-2 bg-[#FA4F96] text-white rounded-lg text-[14px] font-medium hover:bg-[#e8447e] disabled:opacity-50"
              >
                {isSending ? "..." : "→"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}