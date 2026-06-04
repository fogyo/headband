import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import haircutIcon from "@/assets/category_hairdresser.svg";
import backIcon from "@/assets/back_icon.svg";
import starLikedIcon from "@/assets/starLiked.svg";
import starUnlikedIcon from "@/assets/starUnliked.svg";
import arrowForwardIcon from "@/assets/arrow_forward.svg";
import educationIcon from "@/assets/education.svg";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ---------- Типы ----------
interface StepInfoResponse {
  status: string;
  step_types: boolean[];   // true = видеошаг, false = текстовый
  total: number;
}

interface TextStep {
  step_id: string;
  text: string;
  step_num: number;
}

interface TextStepsResponse {
  status: string;
  steps: TextStep[];
}

interface VideoResponse {
  status: string;
  video_name: string;
  description: string;
}

interface UnifiedStep {
  type: "text" | "video";
  text?: string;
  description?: string;
  step_num: number;
  images?: string[];   // ID изображений (только для текстовых)
}

export default function GuideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const reviewMode = searchParams.get("review") === "true";
  const from = searchParams.get("from");
  const returnPath = from === "profile" ? "/profile/guides" : "/guides";

  const STATIC_CHAT_ID = 980609742; // замени на реальный chat_id

  const [steps, setSteps] = useState<UnifiedStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRated, setIsRated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchGuideData = async () => {
      try {
        // 1. Отправляем просмотр (view)
        await fetch(`${baseUrl}/master/guides/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: STATIC_CHAT_ID, guide_id: id }),
        });

        // 2. Получаем типы шагов
        const stepInfoRes = await fetch(`${baseUrl}/master/guides/step_info?guide_id=${id}`);
        if (!stepInfoRes.ok) throw new Error("step_info failed");
        const stepInfo: StepInfoResponse = await stepInfoRes.json();
        if (stepInfo.status !== "success") throw new Error(stepInfo.status);
        const { step_types, total } = stepInfo;

        // 3. Загружаем текстовые шаги, если есть
        let textStepsMap = new Map<number, TextStep>();
        if (step_types.some(t => t === false)) {
          const textRes = await fetch(`${baseUrl}/master/guides/step_text?guide_id=${id}`);
          if (textRes.ok) {
            const textData: TextStepsResponse = await textRes.json();
            if (textData.status === "success") {
              textData.steps.forEach(step => {
                textStepsMap.set(step.step_num, step);
              });
            }
          }
        }

        // 4. Загружаем описание видео, если есть видеошаги (предполагаем первый видеошаг)
        let videoDesc: string | undefined;
        if (step_types.some(t => t === true)) {
          const videoRes = await fetch(`${baseUrl}/master/guides/step_video?guide_id=${id}`);
          if (videoRes.ok) {
            const videoData: VideoResponse = await videoRes.json();
            if (videoData.status === "success") {
              videoDesc = videoData.description;
            }
          }
        }

        // 5. Собираем unified шаги в порядке step_num
        const unified: UnifiedStep[] = [];
        for (let i = 0; i < total; i++) {
          const stepNum = i + 1;
          const isVideo = step_types[i];
          if (isVideo) {
            unified.push({
              type: "video",
              description: videoDesc || "Описание отсутствует",
              step_num: stepNum,
            });
          } else {
            const textStep = textStepsMap.get(stepNum);
            if (textStep) {
              let images: string[] = [];
              try {
                const imgRes = await fetch(`${baseUrl}/master/guides/steps/${textStep.step_id}/images`);
                if (imgRes.ok) {
                  images = await imgRes.json();
                }
              } catch (e) {
                console.warn("Failed to load images", e);
              }
              unified.push({
                type: "text",
                text: textStep.text,
                step_num: stepNum,
                images,
              });
            } else {
              unified.push({
                type: "text",
                text: "Текст шага не загружен",
                step_num: stepNum,
                images: [],
              });
            }
          }
        }
        unified.sort((a, b) => a.step_num - b.step_num);
        setSteps(unified);

        // 6. Лайк – начальное состояние (бэк не отдаёт, ставим false)
        setIsRated(false);
      } catch (err: any) {
        console.error(err);
        setError("Не удалось загрузить гайд");
      } finally {
        setLoading(false);
      }
    };

    fetchGuideData();
  }, [id, STATIC_CHAT_ID]);

  const handleRateToggle = async () => {
    try {
      await fetch(`${baseUrl}/master/guides/like`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: STATIC_CHAT_ID, guide_id: id }),
      });
      setIsRated(!isRated);
    } catch (e) {
      toast.error("Не удалось поставить оценку");
    }
  };

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

  const currentStepData = steps[currentStep];
  const isVideoGuide = steps[0]?.type === "video";
  const totalSteps = steps.length;

  const handlePrev = () => setCurrentStep((s) => Math.max(0, s - 1));
  const handleNext = () => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1));

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
            className="relative w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center shadow"
          >
            <img src={backIcon} alt="back" className="w-6 h-6" />
          </Link>
        </div>

        {/* Инфо-панель: категория, лайк, шаги (только для текстовых) */}
        <div className="grid grid-cols-3 gap-2 place-items-center mt-6">
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-lg overflow-hidden">
              <img src={haircutIcon} alt="category" className="w-full h-full object-cover" />
            </div>
            <h3 className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black text-center">
              {isVideoGuide ? "Видео-гайд" : "Текстовый гайд"}
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
              <div className="w-[80px] h-[10px] bg-[#FFE9EF] rounded-full overflow-hidden shadow">
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

        {/* ОСНОВНОЙ КОНТЕНТ */}
        {isVideoGuide ? (
          // ========== ВИДЕО-ГАЙД ==========
          <>
            <div className="bg-white rounded-xl overflow-hidden shadow-md mb-6">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                <p className="text-xs font-['Sofia_Sans'] text-black">Видео-плеер будет здесь</p>
              </div>
            </div>
            <div className="text-[12px] font-['Sofia_Sans'] text-black leading-normal whitespace-pre-line">
              {currentStepData.description}
            </div>

            {reviewMode ? (
              <div className="w-full flex justify-end gap-4 mt-8">
                <button
                  onClick={() => {
                    toast("Гайд отклонён");
                    // Здесь можно отправить результат на бэк, если нужен
                  }}
                  className="relative bg-[#FFE9EF] rounded-[10px] py-2.5 px-3 shadow text-[12px] font-['Sofia_Sans'] text-black flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span>Отклонить</span>
                </button>
                <button
                  onClick={() => {
                    toast.success("Гайд одобрен");
                    // Здесь можно отправить результат на бэк
                  }}
                  className="relative bg-[#FFE9EF] rounded-[10px] py-2.5 px-3 shadow text-[12px] font-['Sofia_Sans'] text-black flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Согласовать</span>
                </button>
              </div>
            ) : (
              <div className="w-full flex justify-end mt-8">
                <Link to={returnPath} className="relative bg-[#FFE9EF] rounded-[10px] py-2.5 px-3 shadow text-[12px] font-['Sofia_Sans'] text-black">
                  Вернуться к гайдам
                </Link>
              </div>
            )}
          </>
        ) : (
          // ========== ТЕКСТОВЫЙ ГАЙД (пошагово) ==========
          <>
            <div className="mt-2">
              <p className="text-base font-['Sofia_Sans'] text-black leading-normal mb-4">
                {currentStepData.text}
              </p>
              {currentStepData.images && currentStepData.images.length > 0 && (
                <div className="rounded-xl overflow-hidden shadow-md">
                  <img
                    src={`${baseUrl}/master/guides/images/${currentStepData.images[0]}`}
                    alt={`Шаг ${currentStepData.step_num}`}
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}
            </div>

            {/* Навигация по шагам */}
            <div className="flex justify-between mt-8">
              {currentStep === 0 ? (
                <div />
              ) : (
                <button
                  onClick={handlePrev}
                  className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] shadow flex items-center justify-center gap-1"
                >
                  <img src={arrowForwardIcon} alt="prev" className="w-4 h-4 rotate-180" />
                  <span className="text-[14px] font-['Sofia_Sans'] text-black">Предыдущий шаг</span>
                </button>
              )}
              {currentStep === totalSteps - 1 ? (
                reviewMode ? (
                  <div className="flex justify-between gap-4 w-full">
                    <button
                      onClick={() => {
                        toast("Гайд отклонён");
                      }}
                      className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] shadow flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      <span className="text-[14px] font-['Sofia_Sans'] text-black">Отклонить</span>
                    </button>
                    <button
                      onClick={() => {
                        toast.success("Гайд одобрен");
                      }}
                      className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] shadow flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      <span className="text-[14px] font-['Sofia_Sans'] text-black">Согласовать</span>
                    </button>
                  </div>
                ) : (
                  <Link to={returnPath} className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] shadow flex items-center justify-center">
                    <span className="text-[14px] font-['Sofia_Sans'] text-black">Вернуться к гайдам</span>
                  </Link>
                )
              ) : (
                <button
                  onClick={handleNext}
                  className="relative w-40 h-10 bg-[#FFE9EF] rounded-[10px] shadow flex items-center justify-center gap-1"
                >
                  <span className="text-[14px] font-['Sofia_Sans'] text-black">Следующий шаг</span>
                  <img src={arrowForwardIcon} alt="next" className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}