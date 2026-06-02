import { Link } from "react-router-dom";
import homeIconUrl from "@/assets/home.svg"; // твоя SVG иконка
import eyeIcon from "@/assets/eye.svg";
import starIcon from "@/assets/star.svg";
import starFilledIcon from "@/assets/filled_star.svg";
import videoTypeIcon from "@/assets/video_icon.svg"; // твоя иконка для видео
import textTypeIcon from "@/assets/text_icon.svg";   // твоя иконка для текста

// Тип данных для карточки гайда
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

// Моковые данные для секции "Могут Вам подойти"
const recommendedGuides: GuideItem[] = [
  {
    id: "1",
    title: "Современная",
    category: "Стрижки",
    views: 567,
    likes: 72,
    isStarred: true, // отмечен
    bgColor: "#FFE9EF",
    type: "text",
  },
  {
    id: "2",
    title: "Фэйд",
    category: "Стрижки",
    views: 567,
    likes: 72,
    isStarred: false,
    bgColor: "#FFD0DC",
    type: "video",
  },
  {
    id: "3",
    title: "Модельная",
    category: "Стрижки",
    views: 567,
    likes: 72,
    isStarred: true,
    bgColor: "#FFD0DC",
    type: "video",
  },
  {
    id: "4",
    title: "Помпадур",
    category: "Стрижки",
    views: 567,
    likes: 72,
    isStarred: false,
    bgColor: "#FFE9EF",
    type: "text",
  },
];

// Моковые данные для секции "Все гайды" (пока пусто, можно добавить позже)
const allGuides: GuideItem[] = [];


function GuideCard({ item }: { item: GuideItem }) {
  const typeIcon = item.type === "video" ? videoTypeIcon : textTypeIcon;

  return (
    <Link
      to={`/guide/${item.id}`}
      className={`relative w-full h-24 rounded-[20px] overflow-hidden shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]`}
      style={{ border: "0.5px solid rgba(0,0,0,0.00)", backgroundColor: item.bgColor, boxShadow: "box-shadow: 57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)" }}
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
              {/* Звезда: заполненная, если isStarred */}
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

        {recommendedGuides.length === 0 ? (
            <p className="text-black/50 text-sm italic font-['Sofia_Sans']">
            Пока здесь пусто
            </p>
        ) : (
            <div className="grid grid-cols-2 gap-3">
            {recommendedGuides.map((guide, idx) => (
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

          {allGuides.length === 0 ? (
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