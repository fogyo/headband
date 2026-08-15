import { useEffect, useState } from "react";
import AppointmentItem from "@/components/AppointmentItem";
import RestBreak from "@/components/RestBreak";
import HeadbeautyAICard from "@/components/HeadbeautyAICard";
import InfoSection from "@/components/InfoSection";
import { useTelegramAuth } from "@/App";
import { MessageCircle, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import loadingSpinner from "@/assets/loading.svg";

const baseUrl = import.meta.env.VITE_API_BASE_URL || '';

type TimelineItem =
  | {
      type: "appointment";
      startTime: string;
      endTime: string;
      service: string;
      location: string;
      appointmentId: string;
    }
  | {
      type: "break";
      label: string;
    };

interface AppointmentFromBackend {
  id: string;
  start_time: string;
  end_time: string;
  service_name: string;
  address: string | null;
}

interface ApiResponse {
  status: string;
  count: number;
  appointments: AppointmentFromBackend[];
}

// ---------- Вспомогательные функции ----------
const toHHMM = (timeWithSeconds: string) => timeWithSeconds.slice(0, 5);

function formatBreakDuration(minutes: number): string {
  if (minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hourStr = (h: number) => {
    if (h === 0) return "";
    if (h === 1) return "1 час";
    if (h >= 2 && h <= 4) return `${h} часа`;
    return `${h} часов`;
  };
  const minuteStr = (m: number) => {
    if (m === 0) return "";
    if (m === 1) return "1 минуту";
    if (m >= 2 && m <= 4) return `${m} минуты`;
    return `${m} минут`;
  };
  const hPart = hourStr(hours);
  const mPart = minuteStr(mins);
  if (hours > 0 && mins > 0) return `Отдых ${hPart} ${mPart}`;
  if (hours > 0) return `Отдых ${hPart}`;
  return `Отдых ${mPart}`;
}

function buildTimeline(appointments: AppointmentFromBackend[]): TimelineElement[] {
  if (!appointments.length) return [];
  const timeline: TimelineElement[] = [];
  for (let i = 0; i < appointments.length; i++) {
    const curr = appointments[i];
    timeline.push({
      type: "appointment",
      startTime: toHHMM(curr.start_time),
      endTime: toHHMM(curr.end_time),
      service: curr.service_name || "",
      location: curr.address || "",
      appointmentId: curr.id,
    });
    if (i < appointments.length - 1) {
      const next = appointments[i + 1];
      const currEnd = new Date(`1970-01-01T${curr.end_time}`);
      const nextStart = new Date(`1970-01-01T${next.start_time}`);
      const diffMinutes = (nextStart.getTime() - currEnd.getTime()) / 60000;
      if (diffMinutes > 0) {
        timeline.push({
          type: "break",
          label: formatBreakDuration(diffMinutes),
        });
      }
    }
  }
  return timeline;
}

function getGreeting(): string {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  if (totalMinutes >= 361 && totalMinutes <= 720) return "good morning";
  if (totalMinutes >= 721 && totalMinutes <= 1080) return "good day";
  if (totalMinutes >= 1081 && totalMinutes <= 1320) return "good evening";
  return "good night";
}

// ---------- Компонент карточки встречи с чатом ----------
function AppointmentCardWithChat({
  startTime,
  endTime,
  service,
  location,
  appointmentId,
  onChatOpen,
}: {
  startTime: string;
  endTime: string;
  service: string;
  location: string;
  appointmentId: string;
  onChatOpen: (id: string) => void;
}) {
  return (
    <div
      className="relative bg-[#FFE9EF] rounded-[10px] p-4 shadow-md flex items-center gap-3"
      style={{
        boxShadow:
          "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
        border: "0.5px solid rgba(0,0,0,0.00)",
        background: "#FFE9EF",
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-['Sofia_Sans'] text-black leading-tight whitespace-normal break-words">
            {service}
          </span>
        </div>
        <p className="text-[12px] font-['Sofia_Sans'] text-black/50 mt-1">{location}</p>
        <div className="flex items-center gap-4 mt-1 text-[13px] font-['Sofia_Sans'] text-black">
          <span>{startTime}</span>
          <span>—</span>
          <span>{endTime}</span>
        </div>
      </div>
      <button
        onClick={() => onChatOpen(appointmentId)}
        className="flex-shrink-0 w-8 h-8 bg-[#FFE9EF] rounded-full shadow-md flex items-center justify-center"
        style={{
          boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09)",
          border: "0.5px solid rgba(0,0,0,0.00)",
        }}
      >
        <MessageCircle className="w-4 h-4 text-black" />
      </button>
    </div>
  );
}

// ---------- Основной компонент ----------
export default function MasterIndex() {
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  const [timelineItems, setTimelineItems] = useState<TimelineElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Состояния чата
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatAppointmentId, setChatAppointmentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Загрузка записей
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

    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${baseUrl}/master/welcome/?chat_id=${chatId}`);
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        const data: ApiResponse = await res.json();
        if (data.status !== "success") throw new Error("Статус ответа не ok");
        const items = buildTimeline(data.appointments);
        setTimelineItems(items);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить расписание");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [chatId, isVerified, authLoading, authError]);

  // Функции чата
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
      const res = await fetch(
        `${baseUrl}/master/schedule/appointment_chat?chat_id=${chatId}&appointment_id=${appointmentId}`
      );
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
        const res = await fetch(
          `${baseUrl}/master/schedule/edit_message?message_id=${editingMessageId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: newMessage.trim() }),
          }
        );
        if (!res.ok) throw new Error("Ошибка редактирования");
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);
        toast.success("Сообщение изменено");
        setEditingMessageId(null);
        setEditingMessageText("");
      } else {
        // Отправка нового
        const res = await fetch(
          `${baseUrl}/master/schedule/write_message_to_master?chat_id=${chatId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appointment_id: chatAppointmentId, text: newMessage.trim() }),
          }
        );
        if (!res.ok) throw new Error("Ошибка отправки");
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);
        toast.success("Сообщение отправлено");
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

  const greeting = getGreeting();

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

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-[40px] leading-tight tracking-[-2px] text-black" style={{ fontFamily: "'Sofia Sans', sans-serif" }}>Актуальное</h2>
            <div className="h-px bg-black w-[210px]" />
          </div>

          <div className="flex flex-col gap-1">
            {loading && <p className="text-center text-gray-500 py-4">Загрузка...</p>}
            {error && <p className="text-center text-red-500 py-4">{error}</p>}
            {!loading && !error && timelineItems.length === 0 && (
              <p className="text-center text-gray-500 py-4">Нет записей на сегодня</p>
            )}
            {!loading && !error && timelineItems.map((item, idx) => {
              if (item.type === "break") {
                return <RestBreak key={`break-${idx}`} label={item.label} />;
              } else {
                return (
                  <AppointmentItem
                    key={`app-${idx}`}
                    startTime={item.startTime}
                    endTime={item.endTime}
                    service={item.service}
                    location={item.location}
                    appointmentId={item.appointmentId}
                    onChatOpen={openChat}
                  />
                );
              }
            })}
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

        <section className="mt-10">
          <div className="mb-4">
            <h2
              className="text-[40px] leading-tight tracking-[-2px] text-black"
              style={{ fontFamily: "'Sofia Sans', sans-serif" }}
            >
              Информация
            </h2>
            <div className="h-px bg-black w-[210px]" />
          </div>
          <InfoSection />
        </section>
      </div>

      {/* Модалка чата */}
      {isChatModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[24px] font-semibold text-black">Чат с клиентом</h3>
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