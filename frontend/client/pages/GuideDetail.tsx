import { useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import haircutIcon from "@/assets/category_hairdresser.svg";
import backIcon from "@/assets/back_icon.svg";
import starLikedIcon from "@/assets/starLiked.svg";
import starUnlikedIcon from "@/assets/starUnliked.svg";
import arrowForwardIcon from "@/assets/arrow_forward.svg";
import educationIcon from "@/assets/education.svg";
import { Check, X as XIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Иконки категорий
const categoryIcons: Record<string, string> = {
  Стрижки: haircutIcon,
};

// Типы шагов
type Step = {
  text: string;
  imageUrl?: string;
};

// Общий тип для гайда
type Guide = {
  id: string;
  title: string;
  category: string;
  type: "text" | "video";
  steps?: Step[];                   // для текстового
  videoUrl?: string;                // для видео
  description?: string;             // текст с тайм‑кодами
  isRated: boolean;
};

// Моковые данные – теперь есть и видео‑гайд (id=2)
const guideData: Record<string, Guide> = {
  "1": {
    id: "1",
    title: "Модельная",
    category: "Стрижки",
    type: "text",
    steps: [
      {
        text: "Волосы должны быть чистыми и сухими (или слегка влажными, если вы используете ножницы). Если волосы очень длинные, начните с сухой стрижки машинкой, чтобы видеть естественный рост волос.",
        imageUrl: "https://placehold.co/320x200/FFE9EF/333?text=Step+1",
      },
      {
        text: "Разделите волосы на зоны: затылочную, височные и теменную. Закрепите их зажимами.",
      },
      {
        text: "Начните стрижку с затылочной зоны, двигаясь снизу вверх, используя машинку с насадкой 3 мм.",
        imageUrl: "https://placehold.co/320x200/FFE9EF/333?text=Step+3",
      },
    ],
    isRated: true,
  },
  "2": {
    id: "2",
    title: "Модельная (видео)",
    category: "Стрижки",
    type: "video",
    videoUrl: "https://example.com/video.mp4", // плейсхолдер
    description:
      "В этом видео я покажу подробный гайд для начинающих. Вы узнаете о плюсах и минусах этого метода, а также я расскажу секретный лайфхак, как избежать типичных ошибок.\n\n0:00 – Вступление\n0:30 – Распаковка / Настройка\n1:45 – Тест\n3:00 – Честный отзыв и вердикт\n\nСтавь лайк, если было полезно! Подпишись, чтобы не пропустить новый обзор.",
    isRated: false,
  },
};

export default function GuideDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reviewMode = searchParams.get('review') === 'true';
  const from = searchParams.get("from"); // "profile" или "guides" или null
  const returnPath = from === "profile" ? "/profile/guides" : "/guides";
  const { id } = useParams<{ id: string }>();
  const guide = id ? guideData[id] : null;

  const [currentStep, setCurrentStep] = useState(0);
  const [isRated, setIsRated] = useState(guide?.isRated ?? false);
  const handleRateToggle = () => setIsRated((prev) => !prev);

  if (!guide) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Гайд не найден</p>
      </div>
    );
  }

  // ====================== Текстовый гайд ======================
  if (guide.type === "text" && guide.steps) {
    const steps = guide.steps;
    const currentStepData = steps[currentStep];
    const handlePrev = () => setCurrentStep((s) => Math.max(0, s - 1));
    const handleNext = () => setCurrentStep((s) => Math.min(steps.length - 1, s + 1));

    return (
      <div className="min-h-screen bg-[#FFE9EF]">
        <div className="max-w-sm mx-auto px-4 pb-10 relative">
          {/* Шапка */}
          <div className="pt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={educationIcon} alt="education" className="w-6 h-6" />
              <span
                className="text-[20px] font-['MuseoModerno'] text-black"
                style={{ fontFamily: "MuseoModerno, sans-serif" }}
              >
                headband education
              </span>
            </div>
            <Link
              to={returnPath}
              className="relative w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
            >
              <div className="absolute w-11 h-11 left-[5px] top-[5px] bg-white rounded-[5px] blur-[20px] opacity-80" />
              <img src={backIcon} alt="back" className="w-6 h-6 relative z-10" />
            </Link>
          </div>

          {/* Блок информации (сетка 3 колонки) */}
          <div className="grid grid-cols-3 gap-2 place-items-center mt-6">
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-lg overflow-hidden">
                <img src={categoryIcons[guide.category] || haircutIcon} alt={guide.category} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black text-center">{guide.title}</h3>
            </div>

            <div className="flex flex-col items-center gap-1">
              <button onClick={handleRateToggle} className="focus:outline-none" aria-label={isRated ? "Убрать оценку" : "Оценить"}>
                <img src={isRated ? starLikedIcon : starUnlikedIcon} alt={isRated ? "Оценено" : "Не оценено"} className="w-12 h-12 object-contain" />
              </button>
              <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black">Оценить</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black">Шаги</span>
              <div className="w-[80px] h-[10px] bg-[#FFE9EF] rounded-full overflow-hidden shadow-[2px_2px_7px_0_rgba(0,0,0,0.10)]">
                <div
                  className="h-full bg-[#000000] rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>
              <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black">{currentStep + 1} из {steps.length}</span>
            </div>
          </div>

          {/* Контент шага */}
          <div className="mt-6">
            <div className="h-px bg-black w-full mb-4" />
            <p className="text-base font-['Sofia_Sans'] text-black leading-normal mb-4">{currentStepData.text}</p>
            {currentStepData.imageUrl && (
              <div className="rounded-xl overflow-hidden shadow-md">
                <img src={currentStepData.imageUrl} alt={`Шаг ${currentStep + 1}`} className="w-full h-auto object-cover" />
              </div>
            )}
          </div>

          {/* Навигация */}
          <div className="flex justify-between mt-8">
          {currentStep === 0 ? (
            <div />
          ) : (
            <button onClick={handlePrev} disabled={currentStep === 0} className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] shadow flex items-center justify-center gap-1 disabled:opacity-50" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
              <img src={arrowForwardIcon} alt="prev" className="w-4 h-4 rotate-180" />
              <span className="text-[14px] font-['Sofia_Sans'] text-black">Предыдущий шаг</span>
            </button>
          )}
          {currentStep === steps.length - 1 ? (
            <Link to={returnPath} className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] shadow flex items-center justify-center" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
              <span className="text-[14px] font-['Sofia_Sans'] text-black">Вернуться к гайдам</span>
            </Link>
          ) : (
            <button onClick={handleNext} disabled={currentStep === steps.length - 1} className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] shadow flex items-center justify-center gap-1 disabled:opacity-50" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
              <span className="text-[14px] font-['Sofia_Sans'] text-black">Следующий шаг</span>
              <img src={arrowForwardIcon} alt="next" className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Дополнительный блок согласования (только для review на последнем шаге) */}
        {reviewMode && currentStep === steps.length - 1 && (
          <div className="flex justify-between mt-4">
            <button onClick={() => { toast("Гайд отклонён"); navigate(returnPath); }} className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] shadow flex items-center justify-center gap-1 disabled:opacity-50" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
              <XIcon className="w-4 h-4" />
              <span className="text-[14px] font-['Sofia_Sans'] text-black">Отклонить</span>
            </button>
            <button onClick={() => { toast.success("Гайд одобрен"); navigate(returnPath); }} className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] shadow flex items-center justify-center gap-1 disabled:opacity-50" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
              <Check className="w-4 h-4" />
              <span className="text-[14px] font-['Sofia_Sans'] text-black">Согласовать</span>
            </button>
          </div>
        )}
        </div>
      </div>
    );
  }

  // ====================== Видео‑гайд ======================
  if (guide.type === "video") {
    return (
      <div className="min-h-screen bg-[#FFE9EF]">
        <div className="max-w-sm mx-auto px-4 pb-10 relative">
          {/* Шапка (такая же, как у текстового) */}
          <div className="pt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={educationIcon} alt="education" className="w-6 h-6" />
              <span
                className="text-[20px] font-['MuseoModerno'] text-black"
                style={{ fontFamily: "MuseoModerno, sans-serif" }}
              >
                headband education
              </span>
            </div>
            <Link
              to={returnPath}
              className="relative w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
            >
              <div className="absolute w-11 h-11 left-[5px] top-[5px] bg-white rounded-[5px] blur-[20px] opacity-80" />
              <img src={backIcon} alt="back" className="w-6 h-6 relative z-10" />
            </Link>
          </div>

          {/* Блок информации (сетка 2 колонки? или как в Figma – слева категория+название, по центру звезда, справа слово "Видео" */}
          <div className="grid grid-cols-3 gap-2 place-items-center mt-6">
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-lg overflow-hidden">
                <img src={categoryIcons[guide.category] || haircutIcon} alt={guide.category} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black text-center">{guide.title}</h3>
            </div>

            <div className="flex flex-col items-center gap-1">
              <button onClick={handleRateToggle} className="focus:outline-none" aria-label={isRated ? "Убрать оценку" : "Оценить"}>
                <img src={isRated ? starLikedIcon : starUnlikedIcon} alt={isRated ? "Оценено" : "Не оценено"} className="w-12 h-12 object-contain" />
              </button>
              <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black">Оценить</span>
            </div>
          </div>

          {/* Разделитель */}
          <div className="h-px bg-black w-full mt-6 mb-4" />

          <div className="bg-white rounded-xl overflow-hidden shadow-md mb-6">
            {/* Плейсхолдер (сейчас активен) */}
            <div className="aspect-video bg-gray-100 flex items-center justify-center">
                <p className="text-xs font-['Sofia_Sans'] text-black">видео плеер хз</p>
            </div>
            {/* Реальный плеер (раскомментировать, когда понадобится)
            <video
                controls
                className="w-full h-auto"
                poster="https://placehold.co/320x180/FFE9EF/333?text=Video+Preview"
            >
                <source src={guide.videoUrl} type="video/mp4" />
                Ваш браузер не поддерживает видео.
            </video>
            */}
            </div>

          {/* Описание (с переносами строк) */}
          {guide.description && (
            <div className="text-sm font-['Sofia_Sans'] text-black leading-normal whitespace-pre-line">
              {guide.description}
            </div>
          )}

          {/* Кнопка "Вернуться к гайдам" */}
          {reviewMode ? (
          <div className="flex justify-between mt-4">
            <button onClick={() => { toast("Гайд отклонён"); navigate(returnPath); }} className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] shadow flex items-center justify-center gap-1 disabled:opacity-50" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
              <XIcon className="w-4 h-4" />
              <span className="text-[14px] font-['Sofia_Sans'] text-black">Отклонить</span>
            </button>
            <button onClick={() => { toast.success("Гайд одобрен"); navigate(returnPath); }} className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] shadow flex items-center justify-center gap-1 disabled:opacity-50" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
              <Check className="w-4 h-4" />
              <span className="text-[14px] font-['Sofia_Sans'] text-black">Согласовать</span>
            </button>
          </div> ) : (
          <Link
            to="/guides"
            className="relative bg-[#FFE9EF] rounded-[10px] py-2.5 px-3 shadow text-[12px] font-['Sofia_Sans'] text-black"
            style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                      "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  }} >
            Вернуться к гайдам
          </Link>
        )}
        </div>
      </div>
    );
  }

  // Запасной вариант (если тип не text и не video)
  return null;
}