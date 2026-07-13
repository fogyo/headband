import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import trashIcon from "@/assets/Trash.svg";
import pencilIcon from "@/assets/Pencil.svg";
import backIcon from "@/assets/back_icon.svg";
import starIcon from "@/assets/star.svg";
import starFilledIcon from "@/assets/filled_star.svg";
import eyeIcon from "@/assets/eye.svg";
import videoTypeIcon from "@/assets/video_icon.svg";
import textTypeIcon from "@/assets/text_icon.svg";
import { toast } from "sonner";
import { X } from "lucide-react";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ---------- Типы (соответствуют новому бэкенду) ----------
interface MyGuide {
  id: string;
  title: string;
  category: string;
  bgColor: string;
  createdAt: string;   // "дд.мм.гг"
  updatedAt: string;
  approvedAt: string | null;
  likes: number;
  views: number;
  isStarred: boolean;
  type: "text" | "video";
}

interface LikedGuide {
  id: string;
  title: string;
  category: string;
  likes: number;
  views: number;
  type: "text" | "video";
  bgColor: string;
  isStarred: true;
}

interface ApproveGuide {
  id: string;
  name: string;
  category: string;
  type: "text" | "video";
  createdAt: string; // приходит date
  updatedAt: string;
}

// Вспомогательные функции
const getBgColor = (index: number) => (index % 2 < 1 ? "#FFE9EF" : "#FFD0DC");
const mapGuideType = (guideType: number): "text" | "video" => (guideType === 1 ? "video" : "text");

// Форматирование даты "2026-06-08" → "08.06.26"
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear().toString().slice(-2);
  return `${day}.${month}.${year}`;
};

// Компонент карточки со статистикой (совпадает с исходным)
function GuideCard({ item }: { item: MyGuide | LikedGuide }) {
  const typeIcon = item.type === "video" ? videoTypeIcon : textTypeIcon;
  return (
    <Link
      to={`/guide/${item.id}?from=profile`}
      state={{ categoryName: item.category }}
      className="block w-full h-24 rounded-[20px] overflow-hidden"
      style={{
        border: "0.5px solid rgba(0,0,0,0.00)",
        backgroundColor: item.bgColor,
        boxShadow:
          "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
      }}
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
          <img src={typeIcon} alt={item.type} className="w-full h-full object-contain" />
        </div>
      </div>
    </Link>
  );
}

// Карточка без статистики (для одобрения)
function GuideCardPlain({ item }: { item: ApproveGuide }) {
  const typeIcon = item.type === "video" ? videoTypeIcon : textTypeIcon;
  return (
    <Link
      to={`/guide/${item.id}?from=profile&review=true`}
      state={{ categoryName: item.category }}
      className="block w-full h-24 rounded-[20px] overflow-hidden"
      style={{
        border: "0.5px solid rgba(0,0,0,0.00)",
        backgroundColor: "#FFE9EF",
        boxShadow:
          "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
      }}
    >
      <div className="flex h-full">
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <h4
              className="text-[12px] font-['Sofia_Sans'] text-black leading-tight break-words"
              style={{ overflowWrap: "normal", wordBreak: "normal" }}
            >
              {item.name}
            </h4>
            <p
              className="text-[10px] font-['Sofia_Sans'] text-black/50 leading-tight break-words"
              style={{ overflowWrap: "normal", wordBreak: "normal" }}
            >
              {item.category}
            </p>
          </div>
        </div>
        <div className="w-[73px] h-[92px] flex-shrink-0 self-center mr-0.5">
          <img src={typeIcon} alt={item.type} className="w-full h-full object-contain" />
        </div>
      </div>
    </Link>
  );
}

export default function ProfileGuidesPage() {
  const STATIC_CHAT_ID = 980609742;
  const [isAmbassador, setIsAmbassador] = useState(false);
  const [myGuides, setMyGuides] = useState<MyGuide[]>([]);
  const [starredGuides, setStarredGuides] = useState<LikedGuide[]>([]);
  const [approvalGuides, setApprovalGuides] = useState<ApproveGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);

  useEffect(() => {
    const fetchGuides = async () => {
      try {
        const res = await fetch(`${baseUrl}/master/profile/guides/?chat_id=${STATIC_CHAT_ID}`);
        if (!res.ok) throw new Error("Ошибка загрузки");
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);

        // Мои гайды
        const my: MyGuide[] = (data.my_guides || []).map((g: any, idx: number) => ({
          id: g.id,
          title: g.name,
          category: g.category,
          bgColor: getBgColor(idx),
          createdAt: formatDate(g.created),
          updatedAt: formatDate(g.changed),
          approvedAt: formatDate(g.approved),
          likes: g.likes,
          views: g.views,
          isStarred: g.like,
          type: mapGuideType(g.guide_type),
        }));
        setMyGuides(my);

        // Отмеченные гайды (лайкнутые)
        const liked: LikedGuide[] = (data.liked_guides || []).map((g: any, idx: number) => ({
          id: g.id,
          title: g.name,
          category: g.category,
          likes: g.likes,
          views: g.views,
          type: mapGuideType(g.guide_type),
          bgColor: getBgColor(idx),
          isStarred: true,
        }));
        setStarredGuides(liked);

        // Гайды на одобрение (только для амбассадора)
        if (data.approve_guides && data.approve_guides.length > 0) {
          setIsAmbassador(true);
          const approve: ApproveGuide[] = data.approve_guides.map((g: any) => ({
            id: g.id,
            name: g.name,
            category: g.category,
            type: mapGuideType(g.guide_type),
            createdAt: formatDate(g.created),
            updatedAt: formatDate(g.changed),
          }));
          setApprovalGuides(approve);
        } else {
          setIsAmbassador(false);
        }
      } catch (err: any) {
        console.error(err);
        setError("Не удалось загрузить гайды");
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGuides();
  }, []);

  const handleDelete = async (id: string, type: "text" | "video") => {
    if (!window.confirm("Удалить гайд?")) return;
    try {
      const res = await fetch(`${baseUrl}/master/profile/guides/delete_guide?guide_id=${id}&type=${type === "video" ? "Video" : "Text"}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Ошибка удаления");
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      setMyGuides((prev) => prev.filter((g) => g.id !== id));
      toast.success("Гайд удалён");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEdit = (id: string, type: "text" | "video") => {
    window.location.href = `/profile/guides/${id}/edit?type=${type}`;
  };

  if (loading) return <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center"><p>Загрузка...</p></div>;
  if (error) return <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center"><p className="text-red-500">{error}</p></div>;

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка назад */}
        <Link
          to="/profile"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIcon} alt="back" className="w-6 h-6 relative z-10" />
        </Link>

        {/* Header */}
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

        {/* Мои гайды */}
        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black"> Мои гайды</h2>
          <div className="h-px bg-black w-52 mb-4" />

          {myGuides.length === 0 && (
            <p className="text-black/50 text-[14px] tracking-[-0.7] italic font-['Sofia_Sans']">
              У вас пока нет гайдов
            </p>
          )}

          <div className="flex flex-col gap-4">
            {myGuides.map((guide) => (
              <div key={guide.id} className="flex gap-3 items-stretch">
                <div className="flex-1 flex flex-col justify-between text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black py-2">
                  <div className="flex gap-2">
                    <span>Создан</span>
                    <span className="ml-auto">{guide.createdAt}</span>
                  </div>
                  <div className="flex gap-2">
                    <span>Изменен</span>
                    <span className="ml-auto">{guide.updatedAt}</span>
                  </div>
                  <div className="flex gap-2">
                    <span>Одобрен</span>
                    <span className="ml-auto">{guide.approvedAt}</span>
                  </div>
                </div>

                <div className="w-44 h-24 flex-shrink-0 self-center">
                  <GuideCard item={guide} />
                </div>

                {/* Кнопки действий */}
                <div className="flex flex-col justify-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleEdit(guide.id, guide.type);
                    }}
                    className="relative w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
                  >
                    <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-100" />
                    <img src={pencilIcon} alt="Изменить" className="w-6 h-6 relative z-10" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(guide.id, guide.type);
                    }}
                    className="relative w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
                  >
                    <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-100" />
                    <img src={trashIcon} alt="Удалить" className="w-6 h-6 relative z-10" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Кнопка "Добавить гайд" */}
          <div className="flex justify-end mt-6">
            <button
              onClick={() => setShowTypeModal(true)}
              className="bg-[#FFE9EF] rounded-[10px] py-2.5 px-8 shadow-sm text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              Добавить гайд
            </button>
          </div>
        </section>

        {/* Гайды на одобрение (только для амбассадоров) */}
        {isAmbassador && (
          <section className="mt-10">
            <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black"> Гайды на одобрение</h2>
            <div className="h-px bg-black w-52 mb-4" />

            {approvalGuides.length === 0 ? (
              <p className="text-black/50 text-[14px] tracking-[-0.7] italic font-['Sofia_Sans']">
                Нет гайдов на одобрение
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {approvalGuides.map((guide) => (
                  <div key={guide.id} className="flex gap-3 items-stretch">
                    <div className="flex-1 flex flex-col justify-between text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black py-4">
                      <div className="flex gap-2">
                        <span>Создан</span>
                        <span className="ml-auto">{guide.createdAt}</span>
                      </div>
                      <div className="flex gap-2">
                        <span>Изменен</span>
                        <span className="ml-auto">{guide.updatedAt}</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center gap-2 flex-shrink-0 invisible">
                      <div className="relative w-10 h-10" />
                      <div className="relative w-10 h-10" />
                    </div>

                    <div className="w-44 h-24 flex-shrink-0 self-center">
                      <GuideCardPlain item={guide} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Отмеченные гайды */}
        <section className="mt-10">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black"> Отмеченные гайды</h2>
          <div className="h-px bg-black w-52 mb-4" />

          {starredGuides.length === 0 ? (
            <p className="text-black/50 text-sm italic font-['Sofia_Sans']">
              Пока здесь пусто
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {starredGuides.map((guide) => (
                <GuideCard key={guide.id} item={guide} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Модальное окно выбора типа гайда */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowTypeModal(false)} />
          <div className="relative bg-[#FFE9EF] rounded-[20px] w-72 p-6 shadow-xl">
            <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center">
              Тип гайда
            </h3>
            <div className="h-px bg-black w-60 mx-auto mt-2 mb-4" />
            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  setShowTypeModal(false);
                  window.location.href = "/profile/guides/new?type=text";
                }}
                className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow w-full"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                  Текстовый гайд
                </span>
              </button>
              <button
                onClick={() => {
                  setShowTypeModal(false);
                  window.location.href = "/profile/guides/new?type=video";
                }}
                className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow w-full"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                  Видео гайд
                </span>
              </button>
            </div>
            <button
              onClick={() => setShowTypeModal(false)}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-black/50" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}