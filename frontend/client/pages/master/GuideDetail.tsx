import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import haircutIcon from "@/assets/category_hairdresser.svg";
import beardIcon from "@/assets/beard_icon_category.svg";
import colorIcon from "@/assets/color_icon_category.svg";
import creamIcon from "@/assets/cream_icon_category.svg";
import nailsIcon from "@/assets/nails_icon_category.svg";
import lashesIcon from "@/assets/lashes_icon_category.svg";
import epilationIcon from "@/assets/epilation_icon_category.svg";
import makeupIcon from "@/assets/makeup_icon_category.svg";
import tanIcon from "@/assets/tan_icon_category.svg";
import lotusIcon from "@/assets/lotus_icon_category.svg";
import consultationIcon from "@/assets/consultation_icon_category.svg";
import plantIcon from "@/assets/plant_icon_category.svg";
import backIcon from "@/assets/back_icon.svg";
import starLikedIcon from "@/assets/starLiked.svg";
import starUnlikedIcon from "@/assets/starUnliked.svg";
import arrowForwardIcon from "@/assets/arrow_forward.svg";
import educationIcon from "@/assets/education.svg";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useTelegramAuth } from "@/App";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ---------- Типы ответов бэкенда ----------
interface TextStepApi {
  step_id: string;
  name: string;
  text: string;
  step_num: number;
  img_urls?: string[];
}

interface VideoStepApi {
  status: string;
  step_id?: string;
  video_name: string;
  description: string;
  video_url: string;
  preview: string | null;
}

interface UnifiedStep {
  type: "text" | "video";
  name?: string;
  text?: string;
  description?: string;
  step_num: number;
  imgUrls?: string[];
  videoUrl?: string;
  preview?: string;
}

const categoryIconMap: Record<string, string> = {
  "Стрижки": haircutIcon,
  "Борода и усы": beardIcon,
  "Окрашивание": colorIcon,
  "Косметология и Skincare": creamIcon,
  "Маникюр": nailsIcon,
  "Педикюр": nailsIcon,
  "Брови": lashesIcon,
  "Ресницы": lashesIcon,
  "Депиляция": epilationIcon,
  "Эпиляция": epilationIcon,
  "Makeup": makeupIcon,
  "Солярий": tanIcon,
  "Массажи и SPA": lotusIcon,
  "Консультации": consultationIcon,
  "Другое": plantIcon,
};

export default function GuideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reviewMode = searchParams.get("review") === "true";
  const from = searchParams.get("from");
  const returnPath = from === "admin" ? "/admin/guides" : (from === "profile" ? "/profile/guides" : "/guides");
  const location = useLocation();
  const categoryName = (location.state as { categoryName?: string })?.categoryName || "";
  const [videoTitle, setVideoTitle] = useState("");

  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  const [steps, setSteps] = useState<UnifiedStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRated, setIsRated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guideType, setGuideType] = useState<"text" | "video">("text");

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Состояния для галереи
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const [categoriesMap, setCategoriesMap] = useState<Map<string, string>>(new Map());

  // Проверка авторизации
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }
  if (!isVerified || !chatId) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500 font-['Sofia_Sans']">{authError || "Ошибка авторизации"}</p>
      </div>
    );
  }

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${baseUrl}/master/profile/prices/categories`);
        const data = await res.json();
        if (data.status === "success") {
          const map = new Map();
          data.categories.forEach((cat: any) => map.set(cat.id, cat.name));
          setCategoriesMap(map);
        }
      } catch (err) {
        console.error("Ошибка загрузки категорий", err);
      }
    };
    fetchCategories();
  }, []);

  const fetchLikeStatus = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${baseUrl}/master/guides/like_status?guide_id=${id}&chat_id=${chatId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success") {
          setIsRated(!!data.liked);
        }
      }
    } catch (err) {
      console.warn("Не удалось загрузить статус лайка", err);
    }
  };

  useEffect(() => {
    if (!id) return;
    const fetchGuide = async () => {
      try {
        await fetch(`${baseUrl}/master/guides/view?chat_id=${chatId}&guide_id=${id}`, { method: "POST" });

        const textRes = await fetch(`${baseUrl}/master/guides/step_text?guide_id=${id}`);
        if (textRes.ok) {
          const textData = await textRes.json();
          if (textData.status === "success" && textData.steps && textData.steps.length > 0) {
            const sortedSteps = textData.steps.sort((a: TextStepApi, b: TextStepApi) => a.step_num - b.step_num);
            const unified: UnifiedStep[] = sortedSteps.map((step) => ({
              type: "text",
              name: step.name,
              text: step.text,
              step_num: step.step_num,
              imgUrls: step.img_urls || [],
            }));
            setSteps(unified);
            setGuideType("text");
            await fetchLikeStatus();
            setLoading(false);
            return;
          }
        }

        const videoRes = await fetch(`${baseUrl}/master/guides/step_video?guide_id=${id}`);
        if (videoRes.ok) {
          const videoData: VideoStepApi = await videoRes.json();
          if (videoData.status === "success") {
            setSteps([
              {
                type: "video",
                description: videoData.description,
                step_num: 1,
                videoUrl: videoData.video_url,
                preview: videoData.preview || undefined,
              },
            ]);
            setVideoTitle(videoData.video_name);
            setGuideType("video");
            await fetchLikeStatus();
            setLoading(false);
            return;
          }
        }

        throw new Error("Гайд не найден");
      } catch (err: any) {
        console.error(err);
        setError("Не удалось загрузить гайд");
        setLoading(false);
      }
    };
    fetchGuide();
  }, [id, chatId]);

  const handleRateToggle = async () => {
    try {
      await fetch(`${baseUrl}/master/guides/like?chat_id=${chatId}&guide_id=${id}`, { method: "PATCH" });
      setIsRated(!isRated);
      toast.success(isRated ? "Оценка убрана" : "Гайд оценён");
    } catch (e) {
      toast.error("Не удалось поставить оценку");
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/admins/guides/approve?guide_id=${id}`, { method: "PATCH" });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Гайд успешно одобрен");
        navigate(returnPath);
      } else {
        throw new Error("Ошибка при одобрении");
      }
    } catch (err) {
      toast.error("Не удалось одобрить гайд");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = () => {
    setIsRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!id) return;
    if (!rejectComment.trim()) {
      toast.error("Укажите причину отклонения");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/admins/guides/deny`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guide_id: id, comment: rejectComment }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Гайд отклонён");
        setIsRejectModalOpen(false);
        navigate(returnPath);
      } else {
        throw new Error("Ошибка при отклонении");
      }
    } catch (err) {
      toast.error("Не удалось отклонить гайд");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setIsGalleryOpen(true);
  };

  const closeGallery = () => setIsGalleryOpen(false);

  const goToPrev = () => {
    if (!steps[currentStep]?.imgUrls) return;
    setGalleryIndex((prev) => (prev > 0 ? prev - 1 : steps[currentStep].imgUrls!.length - 1));
  };

  const goToNext = () => {
    if (!steps[currentStep]?.imgUrls) return;
    setGalleryIndex((prev) => (prev < steps[currentStep].imgUrls!.length - 1 ? prev + 1 : 0));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeGallery();
      if (e.key === "ArrowLeft" && isGalleryOpen) goToPrev();
      if (e.key === "ArrowRight" && isGalleryOpen) goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGalleryOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }
  if (error || steps.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Гайд не найден</p>
      </div>
    );
  }

  const categoryIcon = categoryName && categoryIconMap[categoryName] ? categoryIconMap[categoryName] : haircutIcon;

  const isVideoGuide = guideType === "video";
  const totalSteps = steps.length;
  const currentStepData = steps[currentStep];
  const handlePrev = () => setCurrentStep((s) => Math.max(0, s - 1));
  const handleNext = () => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1));

  const buttonShadowStyle = {
    border: "0.5px solid rgba(0,0,0,0.00)",
    boxShadow:
      "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
  };

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Шапка */}
        <div className="pt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={educationIcon} alt="education" className="w-6 h-6" />
            <span className="text-[20px] font-['MuseoModerno'] text-black">headband education</span>
          </div>
          <Link
            to={returnPath}
            className="relative w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
          >
            <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
            <img src={backIcon} alt="back" className="w-6 h-6 relative z-10" />
          </Link>
        </div>

        {/* Инфо-панель */}
        <div className="grid grid-cols-3 gap-2 place-items-center mt-6">
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-lg overflow-hidden">
              <img src={categoryIcon} alt={categoryName || "категория"} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black text-center">
              {categoryName}
            </h3>
          </div>
          <div className="flex flex-col items-center gap-1">
            <button onClick={handleRateToggle} className="focus:outline-none">
              <img src={isRated ? starLikedIcon : starUnlikedIcon} alt="rate" className="w-12 h-12" />
            </button>
            <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black">Оценить</span>
          </div>
          {!isVideoGuide && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black">Шаги</span>
              <div className="w-[80px] h-[10px] bg-[#FFE9EF] rounded-full overflow-hidden shadow-[inset_4px_4px_4px_0px_rgba(0,0,0,0.25)]">
                <div
                  className="h-full bg-black rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                />
              </div>
              <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black">
                {currentStep + 1} из {totalSteps}
              </span>
            </div>
          )}
        </div>

        <div className="h-px bg-black w-full mt-6 mb-4" />

        {isVideoGuide ? (
          // ВИДЕО-ГАЙД
          <>
            {videoTitle && (
              <h3 className="text-[20px] font-['Sofia_Sans'] text-black font-semibold mb-2 text-center">
                {videoTitle}
              </h3>
            )}
            <div className="bg-white rounded-xl overflow-hidden shadow-md mb-6">
              <video controls className="w-full h-auto" src={currentStepData.videoUrl} poster={currentStepData.preview}>
                Ваш браузер не поддерживает видео.
              </video>
            </div>
            <div className="text-[16px] font-['Sofia_Sans'] text-black leading-normal whitespace-pre-wrap">
              {currentStepData.description}
            </div>
          </>
        ) : (
          // ТЕКСТОВЫЙ ГАЙД – с галереей
          <div className="mt-2">
            {currentStepData.name && (
              <h4 className="text-[20px] font-['Sofia_Sans'] text-black font-bold mb-2">
                {currentStepData.name}
              </h4>
            )}
            <p className="text-[16px] font-['Sofia_Sans'] text-black leading-normal mb-4 whitespace-pre-wrap">
              {currentStepData.text}
            </p>

            {currentStepData.imgUrls && currentStepData.imgUrls.length > 0 && (
              <>
                <p className="text-[18px] font-['Sofia_Sans'] text-black font-semibold mb-2">
                  Приложенные файлы
                </p>
                <div
                  className="relative rounded-xl overflow-hidden shadow-md cursor-pointer"
                  onClick={() => openGallery(0)}
                >
                  <img
                    src={currentStepData.imgUrls[0]}
                    alt={`Шаг ${currentStepData.step_num} - 1`}
                    className="w-full h-auto object-cover"
                  />
                  {currentStepData.imgUrls.length > 1 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-4xl font-bold font-['Sofia_Sans']">
                        +{currentStepData.imgUrls.length}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Навигационные кнопки / Кнопки модерации */}
        <div className="mt-8">
          {reviewMode ? (
            // Режим ревью
            <>
              {!isVideoGuide && currentStep !== totalSteps - 1 && (
                <div className="flex justify-between mt-8">
                  {currentStep !== 0 && (
                    <button
                      onClick={handlePrev}
                      className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] flex items-center justify-center gap-1"
                      style={buttonShadowStyle}
                    >
                      <img src={arrowForwardIcon} alt="prev" className="w-4 h-4 rotate-180" />
                      <span className="text-[14px] font-['Sofia_Sans'] text-black">Предыдущий шаг</span>
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] flex items-center justify-center gap-1 ml-auto"
                    style={buttonShadowStyle}
                  >
                    <span className="text-[14px] font-['Sofia_Sans'] text-black">Следующий шаг</span>
                    <img src={arrowForwardIcon} alt="next" className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!isVideoGuide && currentStep === totalSteps - 1 && (
                <div className="flex flex-col gap-4 mt-8">
                  <div className="flex justify-between">
                    {currentStep !== 0 && (
                      <button
                        onClick={handlePrev}
                        className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] flex items-center justify-center gap-1"
                        style={buttonShadowStyle}
                      >
                        <img src={arrowForwardIcon} alt="prev" className="w-4 h-4 rotate-180" />
                        <span className="text-[14px] font-['Sofia_Sans'] text-black">Предыдущий шаг</span>
                      </button>
                    )}
                    <Link
                      to={returnPath}
                      className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] flex items-center justify-center ml-auto"
                      style={buttonShadowStyle}
                    >
                      <span className="text-[14px] font-['Sofia_Sans'] text-black">Вернуться к гайдам</span>
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={handleReject}
                      disabled={isSubmitting}
                      className="relative bg-[#FFE9EF] rounded-[10px] w-40 h-10 text-[14px] font-['Sofia_Sans'] text-black flex items-center justify-center gap-2"
                      style={buttonShadowStyle}
                    >
                      <X className="w-4 h-4" /><span>Отклонить</span>
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={isSubmitting}
                      className="relative bg-[#FFE9EF] rounded-[10px] w-40 h-10 text-[14px] font-['Sofia_Sans'] text-black flex items-center justify-center gap-2"
                      style={buttonShadowStyle}
                    >
                      <Check className="w-4 h-4" /><span>Согласовать</span>
                    </button>
                  </div>
                </div>
              )}

              {isVideoGuide && (
                <div className="flex flex-col gap-4 mt-8">
                  <div className="flex justify-end">
                    <Link
                      to={returnPath}
                      className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] flex items-center justify-center ml-auto"
                      style={buttonShadowStyle}
                    >
                      <span className="text-[14px] font-['Sofia_Sans'] text-black">Вернуться к гайдам</span>
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={handleReject}
                      disabled={isSubmitting}
                      className="relative bg-[#FFE9EF] rounded-[10px] w-40 h-10 text-[14px] font-['Sofia_Sans'] text-black flex items-center justify-center gap-2"
                      style={buttonShadowStyle}
                    >
                      <X className="w-4 h-4" /><span>Отклонить</span>
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={isSubmitting}
                      className="relative bg-[#FFE9EF] rounded-[10px] w-40 h-10 text-[14px] font-['Sofia_Sans'] text-black flex items-center justify-center gap-2"
                      style={buttonShadowStyle}
                    >
                      <Check className="w-4 h-4" /><span>Согласовать</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Обычный режим
            <>
              {!isVideoGuide && (
                <div className="flex justify-between mt-8">
                  {currentStep !== 0 && (
                    <button
                      onClick={handlePrev}
                      className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] flex items-center justify-center gap-1"
                      style={buttonShadowStyle}
                    >
                      <img src={arrowForwardIcon} alt="prev" className="w-4 h-4 rotate-180" />
                      <span className="text-[14px] font-['Sofia_Sans'] text-black">Предыдущий шаг</span>
                    </button>
                  )}
                  {currentStep !== totalSteps - 1 ? (
                    <button
                      onClick={handleNext}
                      className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] flex items-center justify-center gap-1 ml-auto"
                      style={buttonShadowStyle}
                    >
                      <span className="text-[14px] font-['Sofia_Sans'] text-black">Следующий шаг</span>
                      <img src={arrowForwardIcon} alt="next" className="w-4 h-4" />
                    </button>
                  ) : (
                    <Link
                      to={returnPath}
                      className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] flex items-center justify-center ml-auto"
                      style={buttonShadowStyle}
                    >
                      <span className="text-[14px] font-['Sofia_Sans'] text-black">Вернуться к гайдам</span>
                    </Link>
                  )}
                </div>
              )}
              {isVideoGuide && (
                <div className="flex justify-end mt-8">
                  <Link
                    to={returnPath}
                    className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] flex items-center justify-center ml-auto"
                    style={buttonShadowStyle}
                  >
                    <span className="text-[14px] font-['Sofia_Sans'] text-black">Вернуться к гайдам</span>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Модальное окно отклонения */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-[24px] font-semibold mb-4 text-black">Отклонить гайд</h3>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-[14px] font-['Sofia_Sans'] text-black resize-none focus:outline-none focus:ring-2 focus:ring-pink-300"
              rows={4}
              placeholder="Укажите причину отклонения..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-[14px] font-medium text-gray-600 hover:text-gray-800"
              >
                Отмена
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-[14px] font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {isSubmitting ? "Отклонение..." : "Отклонить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Галерея на весь экран */}
      {isGalleryOpen && steps[currentStep]?.imgUrls && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={closeGallery}
        >
          <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeGallery}
              className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
            >
              <X className="w-8 h-8" />
            </button>

            <button
              onClick={goToPrev}
              className="absolute left-2 text-white/80 hover:text-white z-10 p-2"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            <img
              src={steps[currentStep].imgUrls![galleryIndex]}
              alt={`Фото ${galleryIndex + 1}`}
              className="max-h-full max-w-full object-contain"
            />

            <button
              onClick={goToNext}
              className="absolute right-2 text-white/80 hover:text-white z-10 p-2"
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-['Sofia_Sans']">
              {galleryIndex + 1} / {steps[currentStep].imgUrls!.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}