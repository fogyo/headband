import { useState } from "react";
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
import { X, Check, X as XIcon } from "lucide-react";

// ---------- Типы ----------
interface MyGuide {
  id: number;
  title: string;
  category: string;
  bgColor: string;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  likes: number;
  views: number;
  isStarred: boolean;
  type: "text" | "video";
}

// ---------- Мок-данные ----------
const initialMyGuides: MyGuide[] = [
  {
    id: 1,
    title: "Помпадур",
    category: "Стрижки",
    bgColor: "#FFE9EF",
    createdAt: "12.03.26",
    updatedAt: "27.04.26",
    approvedAt: "03.05.26",
    likes: 72,
    views: 567,
    isStarred: false,
    type: "text",
  },
  {
    id: 2,
    title: "Модельная",
    category: "Стрижки",
    bgColor: "#FFE9EF",
    createdAt: "08.01.26",
    updatedAt: "14.03.26",
    approvedAt: "19.03.26",
    likes: 184,
    views: 921,
    isStarred: false,
    type: "video",
  },
];

const initialStarredGuides: MyGuide[] = [
  {
    id: 101,
    title: "Фэйд",
    category: "Стрижки",
    bgColor: "#FFE9EF",
    views: 567,
    likes: 72,
    isStarred: true,
    type: "text",
    createdAt: "",
    updatedAt: "",
    approvedAt: null,
  },
  {
    id: 102,
    title: "Мелирование",
    category: "Окрашивание",
    bgColor: "#FFD0DC",
    views: 567,
    likes: 72,
    isStarred: true,
    type: "text",
    createdAt: "",
    updatedAt: "",
    approvedAt: null,
  },
  {
    id: 103,
    title: "Модельная",
    category: "Стрижки",
    bgColor: "#FFD0DC",
    views: 567,
    likes: 72,
    isStarred: true,
    type: "video",
    createdAt: "",
    updatedAt: "",
    approvedAt: null,
  },
  {
    id: 104,
    title: "Фэйд",
    category: "Стрижки",
    bgColor: "#FFE9EF",
    views: 567,
    likes: 72,
    isStarred: true,
    type: "video",
    createdAt: "",
    updatedAt: "",
    approvedAt: null,
  },
];

const initialApprovalGuides: MyGuide[] = [
  {
    id: 1,
    title: "Мелирование",
    category: "Окрашивание",
    bgColor: "#FFD0DC",
    createdAt: "10.05.26",
    updatedAt: "12.05.26",
    approvedAt: null,
    likes: 0,
    views: 0,
    isStarred: false,
    type: "text",
  },
  {
    id: 2,
    title: "Фэйд",
    category: "Стрижки",
    bgColor: "#FFE9EF",
    createdAt: "11.05.26",
    updatedAt: "13.05.26",
    approvedAt: null,
    likes: 0,
    views: 0,
    isStarred: false,
    type: "video",
  },
];

// ---------- Компонент карточки (со статистикой) ----------
function GuideCard({ item }: { item: MyGuide }) {
  const typeIcon = item.type === "video" ? videoTypeIcon : textTypeIcon;
  return (
    <Link
      to={`/guide/${item.id}?from=profile`}
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
        <div className="w-[73px] h-[92px] flex-shrink-0 self-center mr-0.5">
          <img src={typeIcon} alt={item.type} className="w-full h-full object-contain" />
        </div>
      </div>
    </Link>
  );
}

// ---------- Карточка без статистики (для одобрения) ----------
function GuideCardPlain({ item }: { item: MyGuide }) {
  const typeIcon = item.type === "video" ? videoTypeIcon : textTypeIcon;
  return (
    <Link
      to={`/guide/${item.id}?from=profile`}
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
        </div>
        <div className="w-[73px] h-[92px] flex-shrink-0 self-center mr-0.5">
          <img src={typeIcon} alt={item.type} className="w-full h-full object-contain" />
        </div>
      </div>
    </Link>
  );
}

export default function ProfileGuidesPage() {
  // ⚠️ Замените false на true для просмотра версии амбассадора
  const [isAmbassador] = useState(true);
  
  const handleEdit = (id: number) => {
  // Перенаправляем на GuideManage с флагом edit и id гайда
  window.location.href = `/profile/guides/${id}/edit`;
};

  const [myGuides, setMyGuides] = useState(initialMyGuides);
  const [starredGuides] = useState(initialStarredGuides);
  const [approvalGuides, setApprovalGuides] = useState(initialApprovalGuides);
  const [showTypeModal, setShowTypeModal] = useState(false);

  const handleDelete = (id: number) => {
    if (!window.confirm("Удалить гайд?")) return;
    setMyGuides((prev) => prev.filter((g) => g.id !== id));
    toast.success("Гайд удалён");
  };

  const handleApprove = (id: number) => {
    setApprovalGuides((prev) => prev.filter((g) => g.id !== id));
    toast.success("Гайд одобрен");
  };

  const handleReject = (id: number) => {
    setApprovalGuides((prev) => prev.filter((g) => g.id !== id));
    toast("Гайд отклонён");
  };

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
                    <span className="ml-auto">{guide.approvedAt ?? "—"}</span>
                  </div>
                </div>

                <div className="w-44 h-24 flex-shrink-0 self-center">
                  <GuideCard item={guide} />
                </div>

                {/* Кнопки действий (видны и обычным, и амбассадорам) */}
                <div className="flex flex-col justify-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleEdit(guide.id);
                    }}
                    className="relative w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
                  >
                    <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-100" />
                    <img src={pencilIcon} alt="Изменить" className="w-6 h-6 relative z-10" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(guide.id);
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

          {/* Кнопка "Добавить гайд" — только для обычных мастеров */}
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
                    <Link
                        to={`/guide/${guide.id}?from=profile&review=true`}
                        className="block w-full h-24 rounded-[20px] overflow-hidden"
                        style={{
                        border: "0.5px solid rgba(0,0,0,0.00)",
                        backgroundColor: guide.bgColor,
                        boxShadow:
                            "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                        }}
                    >
                        <div className="flex h-full">
                        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                            <div className="min-w-0">
                            <h4
                                className="text-[12px] font-['Sofia_Sans'] text-black leading-tight truncate"
                                style={{ overflowWrap: "normal", wordBreak: "normal" }}
                            >
                                {guide.title}
                            </h4>
                            <p
                                className="text-[10px] font-['Sofia_Sans'] text-black/50 leading-tight break-normal"
                                style={{ overflowWrap: "normal", wordBreak: "normal" }}
                            >
                                {guide.category}
                            </p>
                            </div>
                        </div>
                        <div className="w-[73px] h-[92px] flex-shrink-0 self-center mr-0.5">
                            <img
                            src={guide.type === "video" ? videoTypeIcon : textTypeIcon}
                            alt={guide.type}
                            className="w-full h-full object-contain"
                            />
                        </div>
                        </div>
                    </Link>
                    </div>

                    {/* Пустое место для сохранения выравнивания */}
                    
                </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Отмеченные гайды (всегда со статистикой) */}
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