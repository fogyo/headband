import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import homeIconSrc from "@/assets/home.svg";
import backIconSrc from "@/assets/back_icon.svg";
import { toast } from "sonner";
import tokenIcon from "@/assets/silver_coin.png";
import superTokenIcon from "@/assets/gold_coin.png";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

type GenerationType = 1 | 2 | 3 | 4;
type ModelType = 1 | 2;

export default function AIPreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const sessionId = searchParams.get("session_id") || (location.state as any)?.session_id || "";
  const styleId = searchParams.get("style_id") || (location.state as any)?.style_id || "";
  const generationType = parseInt(
    searchParams.get("generation_type") || (location.state as any)?.generation_type || "1"
  ) as GenerationType;

  const [mode, setMode] = useState<ModelType>(1);
  const [tokens, setTokens] = useState<{ token: number; super_tokens: number } | null>(null);
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState<string>("");
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [historyPreviews, setHistoryPreviews] = useState<any[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Загрузка токенов
  const fetchTokens = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${baseUrl}/headbeauty/session/tokens_amount?session_id=${sessionId}`);
      if (!res.ok) throw new Error("Ошибка загрузки токенов");
      const data = await res.json();
      if (data.status === "success") {
        setTokens({ token: data.token, super_tokens: data.super_token });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Не удалось загрузить баланс токенов");
    }
  };

  // Загрузка истории (только для проверки наличия)
  const fetchHistory = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${baseUrl}/headbeauty/session/history_previews?session_id=${sessionId}`);
      if (!res.ok) throw new Error("Ошибка загрузки истории");
      const data = await res.json();
      if (data.status === "success") {
        setHistoryPreviews(data.previews || []);
      }
    } catch (err: any) {
      console.error(err);
      // Не показываем ошибку, чтобы не мешать пользователю
    }
  };

  useEffect(() => {
    fetchTokens();
    fetchHistory();
  }, [sessionId]);

  // Остановка опроса
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  // Опрос статуса задачи
  const pollTaskStatus = async (taskId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${baseUrl}/admins/task?task_id=${taskId}`);
          if (!res.ok) throw new Error("Ошибка получения статуса");
          const data = await res.json();
          if (data.status === "pending") {
            return;
          }
          clearInterval(interval);
          if (data.status === "success") {
            const previewId = data.id;
            if (previewId) resolve(previewId);
            else reject(new Error("Не удалось получить preview_id"));
          } else {
            reject(new Error(data.error || "Ошибка выполнения задачи"));
          }
        } catch (err: any) {
          clearInterval(interval);
          reject(err);
        }
      }, 2000);
    });
  };

  // Получение готового превью
  const fetchReadyPreview = async (previewId: string): Promise<string> => {
    const res = await fetch(`${baseUrl}/headbeauty/session/ready_preview?preview_id=${previewId}`);
    if (!res.ok) throw new Error("Ошибка получения превью");
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.status);
    return data.img_url;
  };

  // Запуск генерации
  const handleGenerate = async () => {
    if (!sessionId || !styleId) {
      toast.warning("Отсутствуют параметры сессии или стиля");
      return;
    }
    if (!tokens) {
      toast.warning("Баланс токенов не загружен");
      return;
    }
    // Проверка токенов для выбранного режима
    if (mode === 1 && tokens.token <= 0) {
      toast.warning("Недостаточно обычных токенов");
      return;
    }
    if (mode === 2 && tokens.super_tokens <= 0) {
      toast.warning("Недостаточно супертокенов");
      return;
    }

    setIsGenerating(true);
    try {
      const genRes = await fetch(`${baseUrl}/headbeauty/session/preview_style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          generation_type: generationType,
          model_type: mode,
          style_id: styleId,
        }),
      });
      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.detail || "Ошибка запуска генерации");
      }
      const genData = await genRes.json();
      if (genData.status !== "processing" || !genData.task) {
        throw new Error("Не удалось запустить задачу");
      }
      const taskId = genData.task;

      const previewId = await pollTaskStatus(taskId);
      const imgUrl = await fetchReadyPreview(previewId);

      setCurrentPreviewUrl(imgUrl);
      setSelectedPreviewId(previewId);
      toast.success("Генерация завершена!");

      // Обновить историю (чтобы активировать кнопку "Мои генерации")
      await fetchHistory();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка генерации");
    } finally {
      setIsGenerating(false);
    }
  };

  const backgroundImage = currentPreviewUrl || (location.state as any)?.img_url || "https://placehold.co/375x789";

  // Вычисляем, доступна ли кнопка "Получить результат"
  const isGenerateDisabled = isGenerating || !tokens || (mode === 1 && tokens.token <= 0) || (mode === 2 && tokens.super_tokens <= 0);

  return (
    <div className="relative w-full mx-auto h-screen overflow-hidden bg-[#FFE9EF]">
      <img src={backgroundImage} alt="preview background" className="absolute inset-0 w-full h-full object-cover" />

      <div className="absolute bottom-0 left-0 right-0 bg-[#FFE9EF] rounded-t-[20px] px-4 pt-6 pb-2">
        <h3 className="text-[24px] font-['Aclonica'] text-black text-center mb-4" style={{ fontFamily: "Aclonica, sans-serif" }}>
          headbeauty AI
        </h3>

        {!currentPreviewUrl ? (
          <div className="flex flex-col items-center gap-4 mt-4">
            <div className="flex bg-[#FFE9EF] rounded-[10px] p-1 shadow-md gap-2 w-full">
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => setMode(1)}
                  className={`px-4 py-2 rounded-[8px] text-[14px] font-['Sofia_Sans'] tracking-[-0.7px] transition-all w-full ${
                    mode === 1 ? "bg-black text-white" : "text-black/60 hover:text-black"
                  }`}
                >
                  Обычная
                </button>
                {tokens && (
                  <div className="flex items-center gap-1 mt-1">
                    <img src={tokenIcon} alt="токены" className="w-4 h-4" />
                    <span className="text-[14px] font-['Sofia_Sans'] text-black/80">x {tokens.token}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => setMode(2)}
                  className={`px-4 py-2 rounded-[8px] text-[14px] font-['Sofia_Sans'] tracking-[-0.7px] transition-all w-full ${
                    mode === 2 ? "bg-black text-white" : "text-black/60 hover:text-black"
                  }`}
                >
                  Улучшенная
                </button>
                {tokens && (
                  <div className="flex items-center gap-1 mt-1">
                    <img src={superTokenIcon} alt="супертокены" className="w-4 h-4" />
                    <span className="text-[14px] font-['Sofia_Sans'] text-black/80">x {tokens.super_tokens}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={handleGenerate}
                disabled={isGenerateDisabled}
                className="flex-1 relative bg-[#FFE9EF] rounded-[10px] py-3 px-4 shadow-sm text-[16px] font-['Sofia_Sans'] text-black disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                {isGenerating ? "Выполняется генерация..." : "Получить результат"}
              </button>
              <button
                onClick={() =>
                  navigate(`/headbeauty-history?session_id=${sessionId}`, {
                    state: {
                      session_id: sessionId,
                      img_url: currentPreviewUrl,
                      preview_id: selectedPreviewId,
                    },
                  })
                }
                disabled={historyPreviews.length === 0}
                className="flex-1 relative bg-[#FFE9EF] rounded-[10px] py-3 px-4 shadow-sm text-[16px] font-['Sofia_Sans'] text-black disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                История генераций
              </button>
            </div>

            {isGenerating && (
              <div className="flex items-center gap-2 text-[14px] font-['Sofia_Sans'] text-black/70">
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>выполняется генерация...</span>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-[14px] font-['Sofia_Sans'] text-black/70">Результат генерации</span>
              <button
                onClick={() => {
                  toast.info("Чтобы установить это изображение, перейдите в историю генераций");
                }}
                className="bg-[#FFE9EF] rounded-[10px] py-1.5 px-4 shadow-sm text-[12px] font-['Sofia_Sans'] text-black"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                Установить эту картинку
              </button>
            </div>
            <button
              onClick={() =>
                navigate(`/headbeauty-history?session_id=${sessionId}`, {
                  state: {
                    session_id: sessionId,
                    img_url: currentPreviewUrl,
                    preview_id: selectedPreviewId,
                  },
                })
              }
              disabled={historyPreviews.length === 0}
              className="relative bg-[#FFE9EF] rounded-[10px] py-2 px-6 shadow-sm text-[14px] font-['Sofia_Sans'] text-black disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              История генераций
            </button>
          </div>
        )}

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