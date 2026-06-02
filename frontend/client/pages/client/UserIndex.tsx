import { useEffect, useState } from "react";
import appointmentImg from "@/assets/appointment_card.png";
import loadingSpinner from "@/assets/loading.svg";
import { Calendar, Clock, Banknote } from "lucide-react";
import HeadbeautyAICard from "@/components/HeadbeautyAICard";
import { toast } from "sonner";
import otherImg from "@/assets/other_cat.png"
import consultationImg from "@/assets/consultation_cat.png"
import spaImg from "@/assets/massage_cat.png"
import tanImg from "@/assets/tan_cat.png"
import makeupImg from "@/assets/makeup_cat.png"
import epilationImg from "@/assets/epilation_cat.png"
import lashesImg from "@/assets/lashes_cat.png"
import nailsImg from "@/assets/nails_cat.png"
import creamImg from "@/assets/cream_cat.png"
import barberImg from "@/assets/scissors_cat.png"
import { Link } from "react-router-dom";

// ---------- Типы ----------
interface Appointment {
  id: string;
  service: string;
  address: string;
  date: string;
  time: string;
  price: string;
}

// ---------- Компонент записей ----------
function UserAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Картинка одна для всех записей
  const defaultImage = appointmentImg;

  useEffect(() => {
    // Моковые данные (позже заменим на API)
    const mockAppointments: Appointment[] = [
      {
        id: "1",
        service: "Мужская стрижка",
        address: "Невский пр-кт, 12",
        date: "12 января, Пн",
        time: "16:30-17:10",
        price: "1300 ₽",
      },
      {
        id: "2",
        service: "Окрашивание",
        address: "Невский пр-кт, 12",
        date: "13 января, Вт",
        time: "10:00-11:30",
        price: "2500 ₽",
      },
    ];

    setTimeout(() => {
      setAppointments(mockAppointments);
      setLoading(false);
    }, 250);
  }, []);

    if (loading) {
    return (
        <div className="flex justify-center items-center py-8">
        <img src={loadingSpinner} alt="Загрузка..." className="w-12 h-12" />
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
        {appointments.map((app) => (
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
              onClick={() => {
              if (window.confirm("Вы уверены, что хотите отменить запись?")) {
                setAppointments(prev => prev.filter(a => a.id !== app.id));
                toast.success("Запись отменена");
              }
            }}
              className="mt-3 bg-[#FA4F96] rounded-[5px] h-6 w-28 text-white text-xs font-['Sofia_Sans'] self-center"
              style={{
              boxShadow:
                "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)",
              border: "0.5px solid rgba(0,0,0,0.00)",
            }}>
                Отменить
              </button>
            </div>

            {/* Правая часть: фото */}
            <div
            className="w-[60%] flex-shrink-0 rounded-[10px] overflow-hidden border border-white"
            style={{
              backgroundImage: `url(${defaultImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: "4px 4px 4px 0 rgba(0, 0, 0, 0.25) inset",
              aspectRatio: "205 / 190", 
            }}
          />
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

// ---------- Карточка услуги ----------
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

// ---------- Мок-данные категорий ----------
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