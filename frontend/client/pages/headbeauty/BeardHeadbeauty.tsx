import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import homeIconSrc from "@/assets/home.svg";
import backIconSrc from "@/assets/back_icon.svg";
import { toast } from "sonner";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

interface Beard {
  id: string;
  name: string;
  img_url: string;
}

export default function AIBeardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gender: urlGender } = useParams<{ gender: string }>();
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get("session_id");

  const state = location.state as { gender?: boolean; img_url?: string; session_id?: string; task_id?: string } | null;
  const gender = state?.gender !== undefined ? state.gender : (urlGender === "male" ? true : false);
  const [imgUrl, setImgUrl] = useState<string>(state?.img_url || "");
  const [allBeards, setAllBeards] = useState<Beard[]>([]);
  const [recommendedBeards, setRecommendedBeards] = useState<Beard[]>([]);
  const [loading, setLoading] = useState(true);
  const effectiveSessionId = sessionId || state?.session_id || "";

  const [faceTaskId, setFaceTaskId] = useState<string | null>(state?.task_id || null);
  const [faceAnalysisDone, setFaceAnalysisDone] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isGettingRecommendations, setIsGettingRecommendations] = useState(false);

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

  // Загрузка списка всех бород
  useEffect(() => {
    const fetchBeards = async () => {
      if (!effectiveSessionId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${baseUrl}/headbeauty/session/beards?session_id=${effectiveSessionId}`);
        if (!res.ok) throw new Error("Ошибка загрузки бород");
        const data = await res.json();
        if (data.status === "success") {
          setAllBeards(data.haircuts);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };
    fetchBeards();
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
    if (faceTaskId === "atomic_operation") {
      setFaceAnalysisDone(true);
    } else if (faceTaskId && !faceAnalysisDone) {
      startPolling(faceTaskId);
    }
    return () => stopPolling();
  }, [faceTaskId, faceAnalysisDone]);

  // ---------- Получение рекомендаций бород ----------
  const handleGetRecommendations = async () => {
    if (!effectiveSessionId) {
      toast.warning("Нет активной сессии");
      return;
    }
    setIsGettingRecommendations(true);
    try {
      const res = await fetch(`${baseUrl}/headbeauty/session/beard_recommends?session_id=${effectiveSessionId}`);
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

      const readyRes = await fetch(`${baseUrl}/headbeauty/session/ready_beard_recommendations?session_id=${effectiveSessionId}`);
      if (!readyRes.ok) throw new Error("Ошибка получения рекомендаций");
      const readyData = await readyRes.json();
      if (readyData.status === "success") {
        setRecommendedBeards(readyData.recommended);
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

  const handleBeardClick = (beard: Beard) => {
    navigate(`/headbeauty-preview?session_id=${effectiveSessionId}&style_id=${beard.id}&generation_type=2`, {
    state: {
      session_id: effectiveSessionId,
      style_id: beard.id,
      generation_type: 2,   
      img_url: imgUrl, 
      gender: gender,     
    },
  });
  };

  const recommendedIds = new Set(recommendedBeards.map(b => b.id));
  const otherBeards = allBeards.filter(b => !recommendedIds.has(b.id));

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
                  {recommendedBeards.length > 0 ? (
                    recommendedBeards.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleBeardClick(item)}
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
                          <p className="text-[14px] font-['Sofia_Sans'] text-black tracking-[-0.6px] leading-tight line-clamp-2">
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
              {otherBeards.length > 0 && (
                <div className="flex-shrink-0 flex items-stretch">
                  <div className="sticky left-0 bg-[#FFE9EF] z-10 pr-2 flex items-center">
                    <span className="text-[16px] font-['MuseoModerno'] text-black/100 tracking-[-0.8px] whitespace-nowrap" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                      All
                    </span>
                  </div>
                  <div className="flex gap-4 pl-0 pr-0">
                    {otherBeards.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleBeardClick(item)}
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
                          <p className="text-[14px] font-['Sofia_Sans'] text-black tracking-[-0.6px] leading-tight line-clamp-2">
                            {item.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {allBeards.length === 0 && !loading && (
                <p className="text-black/50 text-center w-full">Нет доступных бород</p>
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
    </div>
  );
}