import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import homeIconUrl from "@/assets/home.svg";
import eyeIcon from "@/assets/eye.svg";
import starIcon from "@/assets/star.svg";
import starFilledIcon from "@/assets/filled_star.svg";
import videoTypeIcon from "@/assets/video_icon.svg";
import textTypeIcon from "@/assets/text_icon.svg";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// Тип данных для карточки гайда (полностью совпадает с исходным)
interface GuideItem {
  id: string;
  title: string;
  category: string;
  views: number;
  likes: number;
  isStarred: boolean;
  bgColor: string;
  type: "video" | "text";
}

function GuideCard({ item }: { item: GuideItem }) {
  const typeIcon = item.type === "video" ? videoTypeIcon : textTypeIcon;

  return (
    <Link
      to={`/guide/${item.id}`}
      className={`relative w-full h-24 rounded-[20px] overflow-hidden shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]`}
      style={{ border: "0.5px solid rgba(0,0,0,0.00)", backgroundColor: item.bgColor, boxShadow: "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)" }}
    >
      <div className="flex h-full">
        {/* Левая часть: текст + вертикальная статистика */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <h4
              className="text-[12px] font-['Sofia_Sans'] text-black leading-tight truncate"
              style={{ overflowWrap: "normal", wordBreak: "normal" }}
            >
              {item.title}
            </h4>
            <p
              className="text-[10px] font-['Sofia_Sans'] text-black/50 leading-tight break-normal"
              style={{ overflowWrap: "normal", wordBreak: "normal" }}
            >
              {item.category}
            </p>
          </div>

          <div className="flex flex-col gap-0.5 mt-1">
            <div className="flex items-center gap-1">
              <img
                src={item.isStarred ? starFilledIcon : starIcon}
                alt="star"
                className="w-3 h-3 relative z-10"
              />
              <span className="text-[10px] font-['Sofia_Sans'] text-black leading-none">
                {item.likes}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <img src={eyeIcon} alt="eye" className="w-2 h-2 relative z-10" />
              <span className="text-[8px] font-['Sofia_Sans'] text-black/50 leading-none">
                {item.views}
              </span>
            </div>
          </div>
        </div>

        {/* Правая часть: иконка типа (строго 73×92) */}
        <div className="w-[73px] h-[92px] flex-shrink-0 self-center mr-0.5">
          <img
            src={typeIcon}
            alt={item.type}
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </Link>
  );
}

export default function GuidesPage() {
  const STATIC_CHAT_ID = 980609742; // заменить на реальный chat_id

  const [fitGuides, setFitGuides] = useState<GuideItem[]>([]);
  const [allGuides, setAllGuides] = useState<GuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGuides = async () => {
      try {
        const url = `${baseUrl}/master/guides/?chat_id=${STATIC_CHAT_ID}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);

        // Преобразуем данные бэка в формат GuideItem
        const mapGuide = (g: any, index: number): GuideItem => ({
          id: g.id,
          title: g.name,
          category: g.category,
          views: g.views,
          likes: g.likes,
          isStarred: g.liked,
          type: g.video ? "video" : "text",
          // Цвет фона: чередование, как в моках (не меняем стиль карточки)
          bgColor: index % 2 === 0 ? "#FFE9EF" : "#FFD0DC",
        });

        setFitGuides(data.guides_fit.map((g: any, idx: number) => mapGuide(g, idx)));
        setAllGuides(data.guides_all.map((g: any, idx: number) => mapGuide(g, idx)));
      } catch (err: any) {
        console.error(err);
        setError("Не удалось загрузить гайды");
      } finally {
        setLoading(false);
      }
    };
    fetchGuides();
  }, [STATIC_CHAT_ID]);

  // Оригинальная вёрстка, только данные динамические
  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка Home с локальной SVG иконкой */}
        <Link
          to="/"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={homeIconUrl} alt="home" className="w-6 h-6 relative z-10" />
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
            guides
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

        {/* Секция "Могут Вам подойти" */}
        <section className="mt-8">
          <h2
            className="text-[30px] leading-tight tracking-[-2px] text-black"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
            Могут Вам подойти
          </h2>
          <div className="h-px bg-black w-[210px] mb-3" />

          {loading ? (
            <p className="text-black/50 text-sm italic font-['Sofia_Sans']">Загрузка...</p>
          ) : error ? (
            <p className="text-red-500 text-sm italic font-['Sofia_Sans']">{error}</p>
          ) : fitGuides.length === 0 ? (
            <p className="text-black/50 text-sm italic font-['Sofia_Sans']">
              Пока здесь пусто
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {fitGuides.map((guide, idx) => (
                <GuideCard key={idx} item={guide} />
              ))}
            </div>
          )}
        </section>

        {/* Секция "Все гайды" */}
        <section className="mt-10">
          <h2
            className="text-[30px] leading-tight tracking-[-2px] text-black"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
            Все гайды
          </h2>
          <div className="h-px bg-black w-[210px] mb-3" />

          {loading ? (
            <p className="text-black/50 text-sm italic font-['Sofia_Sans']">Загрузка...</p>
          ) : error ? (
            <p className="text-red-500 text-sm italic font-['Sofia_Sans']">{error}</p>
          ) : allGuides.length === 0 ? (
            <p className="text-black/50 text-sm italic font-['Sofia_Sans']">
              Пока здесь пусто
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {allGuides.map((guide, idx) => (
                <GuideCard key={idx} item={guide} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}