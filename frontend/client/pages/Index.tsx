import { useEffect, useState } from "react";
import AppointmentItem from "@/components/AppointmentItem";
import RestBreak from "@/components/RestBreak";
import HeadbeautyAICard from "@/components/HeadbeautyAICard";
import InfoSection from "@/components/InfoSection";
import { useTelegramAuth } from "@/App";

const baseUrl = import.meta.env.VITE_API_BASE_URL || '';

type TimelineItem =
  | {
      type: "appointment";
      startTime: string;
      endTime: string;
      service: string;
      location: string;
    }
  | {
      type: "break";
      label: string;
    };

interface AppointmentFromBackend {
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

function buildTimeline(appointments: AppointmentFromBackend[]): TimelineItem[] {
  if (!appointments.length) return [];
  const timeline: TimelineItem[] = [];
  for (let i = 0; i < appointments.length; i++) {
    const curr = appointments[i];
    timeline.push({
      type: "appointment",
      startTime: toHHMM(curr.start_time),
      endTime: toHHMM(curr.end_time),
      service: curr.service_name || "",
      location: curr.address || "",
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

/**
 * Возвращает приветствие в зависимости от текущего времени.
 * morning:  06:01 – 12:00
 * afternoon: 12:01 – 19:00
 * evening:  19:01 – 22:00
 * night:    22:01 – 06:00
 */
function getGreeting(): string {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();

  if (totalMinutes >= 361 && totalMinutes <= 720) return "good morning";
  if (totalMinutes >= 721 && totalMinutes <= 1080) return "good afternoon";
  if (totalMinutes >= 1081 && totalMinutes <= 1320) return "good evening";
  return "good night";
}

export default function Index() {
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <h2
              className="text-[40px] leading-tight tracking-[-2px] text-black"
              style={{ fontFamily: "'Sofia Sans', sans-serif" }}
            >
              Актуальное
            </h2>
            <div className="h-px bg-black w-[210px]" />
          </div>

          <div className="flex flex-col gap-1">
            {loading && (
              <p className="text-center text-gray-500 py-4">Загрузка...</p>
            )}
            {error && (
              <p className="text-center text-red-500 py-4">{error}</p>
            )}
            {!loading && !error && timelineItems.length === 0 && (
              <p className="text-center text-gray-500 py-4">Нет записей на сегодня</p>
            )}
            {!loading &&
              !error &&
              timelineItems.map((item, idx) => {
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
    </div>
  );
}