import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import homeIconSrc from "@/assets/home.svg";
import backIconSrc from "@/assets/back_icon.svg";
import { toast } from "sonner";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

interface Haircut {
  id: string;
  name: string;
  img_url: string;
}

interface FaceParameters {
  face_type: string;
  hair_type: string;
  jawline: string;
  forehead_height: string;
  cheekbones: string;
  neck_length: string;
}

// Структура категорий и опций для типа волос
const hairTypeOptions = [
  {
    category: "По структуре (форма пряди)",
    options: ["Прямые", "Слегка волнистые", "Волнистые", "Кудрявые", "Сильно вьющиеся", "Афро-текстуры"],
  },
  {
    category: "По толщине и жесткости",
    options: ["Тонкие", "Средние", "Густые", "Плотные", "Жесткие", "Мягкие"],
  },
  {
    category: "По состоянию и плотности",
    options: ["Редкие", "Редеющие", "Пористые"],
  },
  {
    category: "По «послушности» и склонности к укладке",
    options: ["Послушные", "Непослушные", "Текстурные"],
  },
  {
    category: "По длине",
    options: ["Длинные (от 15 см и выше)"],
  },
];

export default function AIHairPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gender: urlGender } = useParams<{ gender: string }>();
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get("session_id");

  const state = location.state as { gender?: boolean; img_url?: string; session_id?: string; task_id?: string } | null;
  const gender = state?.gender !== undefined ? state.gender : (urlGender === "male" ? true : false);
  const [imgUrl, setImgUrl] = useState<string>(state?.img_url || "");
  const [allHaircuts, setAllHaircuts] = useState<Haircut[]>([]);
  const [recommendedHaircuts, setRecommendedHaircuts] = useState<Haircut[]>([]);
  const [loading, setLoading] = useState(true);
  const effectiveSessionId = sessionId || state?.session_id || "";

  const [faceTaskId, setFaceTaskId] = useState<string | null>(state?.task_id || null);
  const [faceAnalysisDone, setFaceAnalysisDone] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isGettingRecommendations, setIsGettingRecommendations] = useState(false);

  const [faceParameters, setFaceParameters] = useState<FaceParameters | null>(null);
  const [loadingParams, setLoadingParams] = useState(false);

  // Состояния для модалки типа волос
  const [isHairTypeModalOpen, setIsHairTypeModalOpen] = useState(false);
  const [selectedHairTypes, setSelectedHairTypes] = useState<string[]>([]);
  const [isUpdatingHairType, setIsUpdatingHairType] = useState(false);

  // Загрузка параметров лица
  const fetchFaceParams = async () => {
    if (!effectiveSessionId) return;
    setLoadingParams(true);
    try {
      const res = await fetch(`${baseUrl}/headbeauty/session/face_parameters?session_id=${effectiveSessionId}`);
      if (!res.ok) throw new Error("Ошибка загрузки параметров");
      const data = await res.json();
      if (data.status === "success") {
        setFaceParameters({
          face_type: data.face_type || "",
          hair_type: data.hair_type || "",
          jawline: data.jawline || "",
          forehead_height: data.forehead_height || "",
          cheekbones: data.cheekbones || "",
          neck_length: data.neck_length || "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingParams(false);
    }
  };

  // Загружаем параметры при монтировании (если аналитика уже завершена или параметры уже есть)
  useEffect(() => {
    fetchFaceParams();
  }, [effectiveSessionId]);

  // Загружаем параметры после завершения анализа
  useEffect(() => {
    if (faceAnalysisDone) {
      fetchFaceParams();
    }
  }, [faceAnalysisDone]);

  // Загрузка фонового изображения
  useEffect(() => {
    const fetchBg = async () => {
      if (!effectiveSessionId) return;
      try {
        const res = await fetch(`${baseUrl}/headbeauty/session/get_bg?session_id=${effectiveSessionId}`);
        if (!res.ok) throw new Error("Ошибка загрузки фона");
        const data = await res.json();
        if (data.status === "success") {
          setImgUrl(data.img_url);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (!state?.img_url && effectiveSessionId) {
      fetchBg();
    }
  }, [sessionId, state, effectiveSessionId]);

  // Загрузка списка стрижек
  useEffect(() => {
    const fetchHaircuts = async () => {
      if (!effectiveSessionId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${baseUrl}/headbeauty/session/haircuts?session_id=${effectiveSessionId}`);
        if (!res.ok) throw new Error("Ошибка загрузки стрижек");
        const data = await res.json();
        if (data.status === "success") {
          setAllHaircuts(data.haircuts);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };
    fetchHaircuts();
  }, [sessionId, state, effectiveSessionId]);

  // ---------- Опрос статуса задачи анализа лица ----------
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const pollTaskStatus = async (taskId: string) => {
    try {
      const res = await fetch(`${baseUrl}/admins/task?task_id=${taskId}`);
      if (!res.ok) throw new Error("Ошибка получения статуса задачи");
      const data = await res.json();

      if (data.status === "pending") {
        return;
      }

      stopPolling();
      if (data.status === "success") {
        setFaceAnalysisDone(true);
        toast.success("Анализ лица завершён");
      } else {
        toast.error(data.error || "Ошибка анализа лица");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка при проверке статуса");
      stopPolling();
    }
  };

  const startPolling = (taskId: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = setInterval(() => {
      pollTaskStatus(taskId);
    }, 2000);
  };

  useEffect(() => {
    if (faceTaskId && !faceAnalysisDone) {
      startPolling(faceTaskId);
    }
    return () => stopPolling();
  }, [faceTaskId, faceAnalysisDone]);

  // ---------- Получение рекомендаций ----------
  const handleGetRecommendations = async () => {
    if (!effectiveSessionId) {
      toast.warning("Нет активной сессии");
      return;
    }
    setIsGettingRecommendations(true);
    try {
      const res = await fetch(`${baseUrl}/headbeauty/session/hair_recommends?session_id=${effectiveSessionId}`);
      if (!res.ok) throw new Error("Ошибка запуска рекомендаций");
      const data = await res.json();
      if (data.status !== "processing" || !data.task) {
        throw new Error("Не удалось запустить рекомендации");
      }
      const recTaskId = data.task;

      let isReady = false;
      let attempts = 0;
      const maxAttempts = 30;
      while (!isReady && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
        const statusRes = await fetch(`${baseUrl}/admins/task?task_id=${recTaskId}`);
        if (!statusRes.ok) continue;
        const statusData = await statusRes.json();
        if (statusData.status === "success") {
          isReady = true;
          break;
        } else if (statusData.status === "failed") {
          throw new Error(statusData.error || "Ошибка рекомендаций");
        }
      }
      if (!isReady) {
        throw new Error("Рекомендации не готовы, попробуйте позже");
      }

      const readyRes = await fetch(`${baseUrl}/headbeauty/session/ready_hair_recommendations?session_id=${effectiveSessionId}`);
      if (!readyRes.ok) throw new Error("Ошибка получения рекомендаций");
      const readyData = await readyRes.json();
      if (readyData.status === "success") {
        setRecommendedHaircuts(readyData.recommended);
        toast.success("Рекомендации получены");
      } else {
        throw new Error(readyData.status);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка получения рекомендаций");
    } finally {
      setIsGettingRecommendations(false);
    }
  };

  const handleHaircutClick = (haircut: Haircut) => {
    console.log("Выбрана стрижка:", haircut);
  };

  // ---------- Обработка типа волос ----------
  const openHairTypeModal = () => {
    if (faceParameters?.hair_type) {
      const current = faceParameters.hair_type.split(", ").map(s => s.trim()).filter(Boolean);
      setSelectedHairTypes(current);
    } else {
      setSelectedHairTypes([]);
    }
    setIsHairTypeModalOpen(true);
  };

  const toggleHairOption = (option: string) => {
    setSelectedHairTypes(prev =>
      prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]
    );
  };

  const handleSaveHairType = async () => {
    if (!effectiveSessionId) return;
    const hairTypeStr = selectedHairTypes.join(", ");
    setIsUpdatingHairType(true);
    try {
      const res = await fetch(`${baseUrl}/headbeauty/session/update_hair_type?session_id=${effectiveSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hair_type: hairTypeStr }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Ошибка обновления");
      }
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      toast.success("Тип волос обновлён");
      setIsHairTypeModalOpen(false);
      // Перезагружаем параметры
      await fetchFaceParams();
      // Сбрасываем рекомендации, так как они устарели
      setRecommendedHaircuts([]);
      setIsGettingRecommendations(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка сохранения");
    } finally {
      setIsUpdatingHairType(false);
    }
  };

  const recommendedIds = new Set(recommendedHaircuts.map(h => h.id));
  const otherHaircuts = allHaircuts.filter(h => !recommendedIds.has(h.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full mx-auto h-screen overflow-hidden bg-[#FFE9EF]">
      <img
        src={imgUrl || "https://placehold.co/375x789"}
        alt="background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Полупрозрачная панель с параметрами лица */}
      {faceParameters && (
        <div className="absolute top-8 right-4 z-30 bg-[#FFE9EF]/80 backdrop-blur-sm rounded-[10px] p-3 shadow-md max-w-[180px]">
          <p className="text-[11px] font-['Sofia_Sans'] text-black/80 tracking-[-0.6px] leading-tight">
            <span className="font-semibold">Лицо:</span> {faceParameters.face_type}
          </p>
          <p className="text-[11px] font-['Sofia_Sans'] text-black/80 tracking-[-0.6px] leading-tight">
            <span className="font-semibold">Челюсть:</span> {faceParameters.jawline}
          </p>
          <p className="text-[11px] font-['Sofia_Sans'] text-black/80 tracking-[-0.6px] leading-tight">
            <span className="font-semibold">Лоб:</span> {faceParameters.forehead_height}
          </p>
          <p className="text-[11px] font-['Sofia_Sans'] text-black/80 tracking-[-0.6px] leading-tight">
            <span className="font-semibold">Скулы:</span> {faceParameters.cheekbones}
          </p>
          <p className="text-[11px] font-['Sofia_Sans'] text-black/80 tracking-[-0.6px] leading-tight">
            <span className="font-semibold">Шея:</span> {faceParameters.neck_length}
          </p>
          <div className="mt-1 flex items-center justify-between gap-1 border-t border-black/10 pt-1">
            <p className="text-[11px] font-['Sofia_Sans'] text-black/80 tracking-[-0.6px] leading-tight">
              <span className="font-semibold">Волосы:</span>
              <span className="ml-1">{faceParameters.hair_type || "не указан"}</span>
            </p>
            <button
              onClick={openHairTypeModal}
              className="text-[10px] font-['Sofia_Sans'] text-black/60 hover:text-black/90 underline underline-offset-2 whitespace-nowrap"
            >
              {faceParameters.hair_type ? "изменить" : "добавить"}
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-[#FFE9EF] rounded-t-[20px] px-4 pt-6 pb-2">
        <h3 className="text-[24px] font-['Aclonica'] text-black text-center mb-4" style={{ fontFamily: "Aclonica, sans-serif" }}>
          headbeauty AI
        </h3>

        {/* Горизонтальный скролл с вертикальными заголовками */}
        <div className="mt-2 rounded-[10px] p-2 overflow-hidden"
          style={{
            boxShadow:
              "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            border: "0.5px solid rgba(0,0,0,0.00)",
          }}
        >
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-0 pb-0 items-stretch">
              {/* Блок Recommended – всегда виден */}
              <div className="flex-shrink-0 flex items-stretch">
                <div className="sticky left-0 bg-[#FFE9EF] z-10 pr-2 flex items-center">
                  <span className="text-[16px] font-['MuseoModerno'] text-black/100 tracking-[-0.8px] whitespace-nowrap" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                    Recommended
                  </span>
                </div>
                <div className="flex gap-4 pl-0 pr-10 items-center">
                  {recommendedHaircuts.length > 0 ? (
                    recommendedHaircuts.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleHaircutClick(item)}
                        className="flex-shrink-0 w-28 bg-[#FFE9EF] p-2 shadow-md cursor-pointer"
                        style={{
                          boxShadow:
                            "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                          border: "0.5px solid rgba(0,0,0,0.00)",
                        }}
                      >
                        <div className="w-full h-20 rounded-[5px] overflow-hidden">
                          <img
                            src={item.img_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://placehold.co/160x100/FFE9EF/333?text=No+image";
                            }}
                          />
                        </div>
                        <div className="mt-1 text-center flex items-center justify-center h-6">
                          <p className="text-[12px] font-['Sofia_Sans'] text-black tracking-[-0.6px] leading-tight line-clamp-2">
                            {item.name}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex-shrink-0 w-36 flex items-center justify-center p-2">
                      {!faceAnalysisDone ? (
                        <span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black/50 text-center">
                          Анализ лица...
                        </span>
                      ) : isGettingRecommendations ? (
                        <span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black/50 text-center">
                          Загрузка...
                        </span>
                      ) : (
                        <button
                          onClick={handleGetRecommendations}
                          disabled={!faceAnalysisDone}
                          className="bg-[#FFE9EF] rounded-[10px] py-2 px-3 shadow-sm text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            border: "0.5px solid rgba(0,0,0,0.00)",
                            boxShadow:
                              "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                          }}
                        >
                          Получить рекомендации
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Блок All – всегда виден */}
              {otherHaircuts.length > 0 && (
                <div className="flex-shrink-0 flex items-stretch">
                  <div className="sticky left-0 bg-[#FFE9EF] z-10 pr-2 flex items-center">
                    <span className="text-[16px] font-['MuseoModerno'] text-black/100 tracking-[-0.8px] whitespace-nowrap" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                      All
                    </span>
                  </div>
                  <div className="flex gap-4 pl-0 pr-0">
                    {otherHaircuts.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleHaircutClick(item)}
                        className="flex-shrink-0 w-28 bg-[#FFE9EF] p-2 shadow-md cursor-pointer"
                        style={{
                          boxShadow:
                            "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                          border: "0.5px solid rgba(0,0,0,0.00)",
                        }}
                      >
                        <div className="w-full h-20 rounded-[5px] overflow-hidden">
                          <img
                            src={item.img_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://placehold.co/160x100/FFE9EF/333?text=No+image";
                            }}
                          />
                        </div>
                        <div className="mt-1 text-center flex items-center justify-center h-6">
                          <p className="text-[12px] font-['Sofia_Sans'] text-black tracking-[-0.6px] leading-tight line-clamp-2">
                            {item.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {allHaircuts.length === 0 && !loading && (
                <p className="text-black/50 text-center w-full">Нет доступных стрижек</p>
              )}
            </div>
          </div>
        </div>

        {/* Кнопки Home и Back */}
        <button
          onClick={() => navigate("/")}
          className="absolute top-6 right-4 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={homeIconSrc} alt="home" className="w-6 h-6 relative z-10" />
        </button>
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-4 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIconSrc} alt="back" className="w-6 h-6 relative z-10" />
        </button>
      </div>

      {/* Модальное окно выбора типа волос */}
      {isHairTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsHairTypeModalOpen(false)}
          />
          <div className="relative bg-[#FFE9EF] rounded-[20px] w-full max-w-md p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center mb-2">
              Выберите тип волос
            </h3>
            <p className="text-center text-[14px] text-black/50 mb-4 font-['Sofia_Sans']">
              (можно выбрать несколько)
            </p>

            <div className="space-y-4">
              {hairTypeOptions.map((group, idx) => (
                <div key={idx}>
                  <h4 className="text-[16px] font-['Sofia_Sans'] text-black font-semibold mb-2 tracking-[-0.8px]">
                    {group.category}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => toggleHairOption(option)}
                        className={`px-3 py-1.5 rounded-[5px] text-[12px] font-['Sofia_Sans'] tracking-[-0.6px] transition-all ${
                          selectedHairTypes.includes(option)
                            ? "bg-black/100 text-white/90"
                            : "bg-[#FFE9EF] text-black/50 border border-black/10"
                        }`}
                        style={{
                          boxShadow: selectedHairTypes.includes(option)
                            ? "inset 2px 2px 4px rgba(0,0,0,0.05)"
                            : "2px 2px 4px rgba(0,0,0,0.02)",
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setIsHairTypeModalOpen(false)}
                className="px-4 py-2 text-[14px] font-['Sofia_Sans'] text-black/60 hover:text-black"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveHairType}
                disabled={isUpdatingHairType}
                className="relative bg-[#FFE9EF] rounded-[10px] py-2 px-6 shadow-sm text-[14px] font-['Sofia_Sans'] text-black disabled:opacity-50"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                {isUpdatingHairType ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}