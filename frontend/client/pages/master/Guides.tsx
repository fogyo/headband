import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import homeIconUrl from "@/assets/home.svg";
import eyeIcon from "@/assets/eye.svg";
import starIcon from "@/assets/star.svg";
import starFilledIcon from "@/assets/filled_star.svg";
import videoTypeIcon from "@/assets/video_icon.svg";
import textTypeIcon from "@/assets/text_icon.svg";
import { useTelegramAuth } from "@/App";
import { X, Filter, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

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

function GuideCard({ item }: { item: GuideItem }) {
  const typeIcon = item.type === "video" ? videoTypeIcon : textTypeIcon;

  return (
    <Link
      to={`/guide/${item.id}`}
      state={{ categoryName: item.category }}
      className={`relative w-full h-24 rounded-[20px] overflow-hidden shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]`}
      style={{ border: "0.5px solid rgba(0,0,0,0.00)", backgroundColor: item.bgColor, boxShadow: "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)" }}
    >
      <div className="flex h-full">
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <h4
              className="text-[12px] font-['Sofia_Sans'] text-black leading-tight break-words"
              style={{ overflowWrap: "normal", wordBreak: "normal" }}
            >
              {item.title}
            </h4>
            <p
              className="text-[10px] font-['Sofia_Sans'] text-black/50 leading-tight break-words"
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
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  const [allGuides, setAllGuides] = useState<GuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Фильтры и сортировка
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<"all" | "video" | "text">("all");
  const [sortBy, setSortBy] = useState<"default" | "views" | "likes">("default");

  // Уникальные категории
  const [categories, setCategories] = useState<string[]>([]);

  // Загрузка данных
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

    const fetchGuides = async () => {
      try {
        setLoading(true);
        const url = `${baseUrl}/master/guides/?chat_id=${chatId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);

        // Все гайды (без разделения на fit и all)
        const all = data.guides_all.map((g: any, idx: number) => ({
          id: g.id,
          title: g.name,
          category: g.category,
          views: g.views,
          likes: g.likes,
          isStarred: g.liked,
          type: g.video ? "video" : "text",
          bgColor: (idx + 1) % 4 <= 1 ? "#FFE9EF" : "#FFD0DC",
        }));
        setAllGuides(all);

        // Извлекаем уникальные категории
        const uniqueCategories = Array.from(new Set(all.map(g => g.category)));
        setCategories(uniqueCategories);
        // По умолчанию выбраны все категории
        setSelectedCategories(uniqueCategories);
      } catch (err: any) {
        console.error(err);
        setError("Не удалось загрузить гайды");
      } finally {
        setLoading(false);
      }
    };
    fetchGuides();
  }, [chatId, isVerified, authLoading, authError]);

  // Фильтрация и сортировка
  const filteredGuides = allGuides
    .filter(guide => {
      const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(guide.category);
      const typeMatch = selectedType === "all" || guide.type === selectedType;
      return categoryMatch && typeMatch;
    })
    .sort((a, b) => {
      if (sortBy === "views") return b.views - a.views;
      if (sortBy === "likes") return b.likes - a.likes;
      return 0; // default – порядок как пришёл с бэка
    });

  // Обработчики фильтров
  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const selectAllCategories = () => {
    setSelectedCategories(categories);
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  const toggleType = (type: "all" | "video" | "text") => {
    setSelectedType(type);
  };

  const toggleSort = (sort: "default" | "views" | "likes") => {
    setSortBy(sort);
  };

  if (authLoading || loading) {
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
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={homeIconUrl} alt="home" className="w-6 h-6 relative z-10" />
        </Link>

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

        {/* Панель фильтров и сортировки */}
        <div className="mt-8 flex items-center justify-between gap-2">
          <button
            onClick={() => setFilterModalOpen(true)}
            className="relative bg-[#FFE9EF] rounded-[10px] py-2 px-4 shadow-sm text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black flex items-center gap-1"
            style={{
              border: "0.5px solid rgba(0,0,0,0.00)",
              boxShadow:
                "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            }}
          >
            <Filter className="w-4 h-4" />
            <span>Фильтр</span>
            {(selectedCategories.length !== categories.length || selectedType !== "all") && (
              <span className="w-2 h-2 bg-pink-500 rounded-full" />
            )}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => toggleSort("default")}
              className={`relative bg-[#FFE9EF] rounded-[10px] py-2 px-3 shadow-sm text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black ${sortBy === "default" ? "bg-[#FFD0DC]" : ""}`}
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              По умолч.
            </button>
            <button
              onClick={() => toggleSort("views")}
              className={`relative bg-[#FFE9EF] rounded-[10px] py-2 px-3 shadow-sm text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black flex items-center gap-1 ${sortBy === "views" ? "bg-[#FFD0DC]" : ""}`}
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              <img src={eyeIcon} alt="" className="w-3 h-3" />
              <span>Просмотры</span>
            </button>
            <button
              onClick={() => toggleSort("likes")}
              className={`relative bg-[#FFE9EF] rounded-[10px] py-2 px-3 shadow-sm text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black flex items-center gap-1 ${sortBy === "likes" ? "bg-[#FFD0DC]" : ""}`}
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              <img src={starIcon} alt="" className="w-3 h-3" />
              <span>Лайки</span>
            </button>
          </div>
        <section className="mt-6">
          <h2
            className="text-[30px] leading-tight tracking-[-2px] text-black"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
            Все гайды
          </h2>
          <div className="h-px bg-black w-[210px] mb-3" />

          {filteredGuides.length === 0 ? (
            <p className="text-black/50 text-sm italic font-['Sofia_Sans']">
              Нет гайдов, соответствующих фильтрам
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredGuides.map((guide, idx) => (
                <GuideCard key={idx} item={guide} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Модальное окно фильтра */}
      {filterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div
            className="relative bg-[#FFE9EF] rounded-[20px] w-full max-w-sm max-h-[80vh] overflow-y-auto p-6 shadow-xl"
            style={{
              boxShadow:
                "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            }}
          >
            <button
              onClick={() => setFilterModalOpen(false)}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-black/50 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center mb-4">
              Фильтры
            </h3>
            <div className="h-px bg-black w-60 mx-auto mt-2 mb-4" />

            {/* Категории */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/70">Категории</span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllCategories}
                    className="text-[12px] font-['Sofia_Sans'] text-black/60 hover:text-black"
                  >
                    Выбрать все
                  </button>
                  <button
                    onClick={clearAllCategories}
                    className="text-[12px] font-['Sofia_Sans'] text-black/60 hover:text-black"
                  >
                    Сбросить
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1 rounded-[10px] text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black shadow-sm ${
                      selectedCategories.includes(cat) ? "bg-[#FFD0DC]" : "bg-[#FFE9EF]"
                    }`}
                    style={{
                      border: "0.5px solid rgba(0,0,0,0.00)",
                      boxShadow:
                        "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05)",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Тип гайда */}
            <div className="mb-4">
              <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/70">Тип</span>
              <div className="flex gap-2 mt-1">
                {(["all", "video", "text"] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`px-4 py-1 rounded-[10px] text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black shadow-sm ${
                      selectedType === type ? "bg-[#FFD0DC]" : "bg-[#FFE9EF]"
                    }`}
                    style={{
                      border: "0.5px solid rgba(0,0,0,0.00)",
                      boxShadow:
                        "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05)",
                    }}
                  >
                    {type === "all" ? "Все" : type === "video" ? "Видео" : "Текст"}
                  </button>
                ))}
              </div>
            </div>

            {/* Кнопка применения (закрывает модалку) */}
            <button
              onClick={() => setFilterModalOpen(false)}
              className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow w-full flex items-center justify-center"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">Применить</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}