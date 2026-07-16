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
import { Calendar, Clock, Banknote } from "lucide-react";
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

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

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

// ---------- Типы ----------
interface AppointmentApi {
  appointment_id: string;
  service_name: string;
  address: string;
  day: string;
  start_time: string;
  end_time: string;
  price: number;
  parental_category: string; // добавлено
}
interface Appointment {
  id: string;
  service: string;
  address: string;
  date: string;
  time: string;
  price: string;
  parentalCategory: string; // добавлено
}

// Вспомогательные функции
const formatDateWithWeekday = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const weekday = weekdays[date.getDay()];
  return `${day}.${month.toString().padStart(2, "0")} ${weekday}`;
};

const toHHMM = (timeWithSec: string): string => timeWithSec.slice(0, 5);


// Преобразование ответа API в формат UI
const mapApiToAppointment = (api: AppointmentApi): Appointment => ({
  id: api.appointment_id,
  service: api.service_name,
  address: api.address,
  date: formatDateWithWeekday(api.day),
  time: `${toHHMM(api.start_time)}-${toHHMM(api.end_time)}`,
  price: `${api.price} ₽`,
  parentalCategory: api.parental_category,
});

// ---------- Компонент записей (интегрированный) ----------
function UserAppointments() {
  const STATIC_CHAT_ID = 980609742; // TODO: заменить на window.Telegram.WebApp.initDataUnsafe.user.id
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const defaultImage = appointmentHairdressingImg;

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${baseUrl}/users/welcome/?chat_id=${STATIC_CHAT_ID}`);
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
    try {
      const res = await fetch(`${baseUrl}/users/welcome/appointment?appointment_id=${appointmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Ошибка отмены");
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      // Удаляем запись из локального состояния
      setAppointments(prev => prev.filter(a => a.id !== appointmentId));
      toast.success("Запись отменена");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось отменить запись");
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <img src={loadingSpinner} alt="Загрузка..." className="w-12 h-12" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-8">
        <p className="text-red-500 text-[16px] tracking-[-0.8px] font-['Sofia_Sans']">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {appointments.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-black/50 text-[16px] tracking-[-0.8px] font-['Sofia_Sans']">
            Пока Вы никуда не записаны
          </p>
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
              {/* Левая часть: информация */}
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
                  {/* Дата */}
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                      <Calendar className="w-full h-full text-black/100" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] tracking-[-0.5px] font-['Sofia_Sans'] text-black/50 leading-tight">
                        Дата
                      </span>
                      <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black leading-tight truncate">
                        {app.date}
                      </span>
                    </div>
                  </div>

                  {/* Время */}
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                      <Clock className="w-full h-full text-black/100" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] tracking-[-0.5px] font-['Sofia_Sans'] text-black/50 leading-tight">
                        Время
                      </span>
                      <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black leading-tight truncate">
                        {app.time}
                      </span>
                    </div>
                  </div>

                  {/* Цена */}
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                      <Banknote className="w-full h-full text-black/100" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] tracking-[-0.5px] font-['Sofia_Sans'] text-black/50 leading-tight">
                        Цена
                      </span>
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

              {/* Правая часть: фото (одно для всех) */}
              <div
                className="w-[60%] flex-shrink-0 rounded-[10px] overflow-hidden border border-white"
                style={{
                  backgroundImage: `url(${image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  boxShadow: "4px 4px 4px 0 rgba(0, 0, 0, 0.25) inset",
                  aspectRatio: "205 / 190",
                }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Карточка услуги (без изменений) ----------
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

// ---------- Мок-данные категорий (без изменений) ----------
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

// ---------- Главная страница пользователя ----------
export default function UserIndexPage() {
  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10">
        {/* Header */}
        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{
              fontFamily: "Poppins, sans-serif",
              WebkitTextStroke: "1px #000",
            }}
          >
            good night
          </h1>
        </div>

        {/* Записи */}
        <section className="mt-6">
          <h2
            className="text-[40px] leading-tight tracking-[-2px] text-black"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
            Записи
          </h2>
          <div className="h-px bg-black w-[210px] mb-4" />

          <UserAppointments />
        </section>

        {/* Услуги */}
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

        {/* headbeauty */}
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
      </div>
    </div>
  );
}