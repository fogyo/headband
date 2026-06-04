import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import homeIconUrl from "@/assets/home.svg";
import eyeIcon from "@/assets/eye.svg";
import starIcon from "@/assets/star.svg";
import starFilledIcon from "@/assets/filled_star.svg";
import videoTypeIcon from "@/assets/video_icon.svg";
import textTypeIcon from "@/assets/text_icon.svg";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// Тип ответа от бэка
interface GuideFromBackend {
  id: string;
  name: string;
  category: string;
  video: boolean;      // true = видео-гайд, false = текстовый
  liked: boolean;
  likes: number;
  views: number;
}

interface GuidesResponse {
  status: string;
  guides_fit: GuideFromBackend[];
  guides_all: GuideFromBackend[];
}

// Тип для карточки (адаптирован под бэк)
interface GuideItem {
  id: string;
  title: string;
  category: string;
  views: number;
  likes: number;
  isStarred: boolean;
  type: "video" | "text";
}

function GuideCard({ item }: { item: GuideItem }) {
  const typeIcon = item.type === "video" ? videoTypeIcon : textTypeIcon;
  // Фон: чередование или статический – пусть будет на основе id
  const bgColor = (parseInt(item.id) % 2 === 0) ? "#FFE9EF" : "#FFD0DC";

  return (
    <Link
      to={`/guide/${item.id}?from=guides`}
      className={`relative w-full h-24 rounded-[20px] overflow-hidden shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]`}
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex h-full">
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <h4 className="text-[12px] font-['Sofia_Sans'] text-black truncate">{item.title}</h4>
            <p className="text-[10px] font-['Sofia_Sans'] text-black/50">{item.category}</p>
          </div>
          <div className="flex flex-col gap-0.5 mt-1">
            <div className="flex items-center gap-1">
              <img src={item.isStarred ? starFilledIcon : starIcon} alt="star" className="w-3 h-3" />
              <span className="text-[10px] font-['Sofia_Sans'] text-black">{item.likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <img src={eyeIcon} alt="eye" className="w-2 h-2" />
              <span className="text-[8px] font-['Sofia_Sans'] text-black/50">{item.views}</span>
            </div>
          </div>
        </div>
        <div className="w-[73px] h-[92px] flex-shrink-0 self-center mr-0.5">
          <img src={typeIcon} alt={item.type} className="w-full h-full object-contain" />
        </div>
      </div>
    </Link>
  );
}

export default function GuidesPage() {
  const STATIC_CHAT_ID = 980609742; // замени на реальный chat_id

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
        const data: GuidesResponse = await res.json();
        if (data.status !== "success") throw new Error(data.status);

        const mapGuide = (g: GuideFromBackend): GuideItem => ({
          id: g.id,
          title: g.name,
          category: g.category,
          views: g.views,
          likes: g.likes,
          isStarred: g.liked,
          type: g.video ? "video" : "text",
        });

        setFitGuides(data.guides_fit.map(mapGuide));
        setAllGuides(data.guides_all.map(mapGuide));
      } catch (err: any) {
        console.error(err);
        setError("Не удалось загрузить гайды");
      } finally {
        setLoading(false);
      }
    };
    fetchGuides();
  }, [STATIC_CHAT_ID]);

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
          to="/"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow"
        >
          <img src={homeIconUrl} alt="home" className="w-6 h-6" />
        </Link>

        <div className="pt-8 pb-2">
          <h1 className="text-[40px] leading-tight tracking-[3.2px] text-transparent" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}>
            guides
          </h1>
          <p className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "0.4px #000" }}>
            version for masters
          </p>
        </div>

        {/* Секция "Могут Вам подойти" */}
        <section className="mt-8">
          <h2 className="text-[30px] leading-tight tracking-[-2px] text-black font-['Sofia_Sans']">Могут Вам подойти</h2>
          <div className="h-px bg-black w-[210px] mb-3" />
          {fitGuides.length === 0 ? (
            <p className="text-black/50 text-sm italic font-['Sofia_Sans']">Пока здесь пусто</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {fitGuides.map((guide) => (
                <GuideCard key={guide.id} item={guide} />
              ))}
            </div>
          )}
        </section>

        {/* Секция "Все гайды" */}
        <section className="mt-10">
          <h2 className="text-[30px] leading-tight tracking-[-2px] text-black font-['Sofia_Sans']">Все гайды</h2>
          <div className="h-px bg-black w-[210px] mb-3" />
          {allGuides.length === 0 ? (
            <p className="text-black/50 text-sm italic font-['Sofia_Sans']">Пока здесь пусто</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {allGuides.map((guide) => (
                <GuideCard key={guide.id} item={guide} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}