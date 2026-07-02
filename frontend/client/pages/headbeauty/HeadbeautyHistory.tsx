import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import homeIconSrc from "@/assets/home.svg";
import backIconSrc from "@/assets/back_icon.svg";
import { toast } from "sonner";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

interface Preview {
  preview_id: string;
  img_url: string;
}

export default function AIHistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get("session_id") || (location.state as any)?.session_id || "";

  // Состояния
  const [historyPreviews, setHistoryPreviews] = useState<Preview[]>([]);
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState<string>("");
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // При загрузке получаем данные из location.state (если переданы)
  useEffect(() => {
    const state = location.state as any;
    if (state?.img_url) {
      setCurrentPreviewUrl(state.img_url);
      if (state?.preview_id) {
        setSelectedPreviewId(state.preview_id);
      }
    }
  }, [location.state]);

  const fetchHistory = async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/headbeauty/session/history_previews?session_id=${sessionId}`);
      if (!res.ok) throw new Error("Ошибка загрузки истории");
      const data = await res.json();
      if (data.status === "success") {
        setHistoryPreviews(data.previews || []);
        // Если ещё не установлено превью из state, и есть история – берём первое
        if (!currentPreviewUrl && data.previews && data.previews.length > 0) {
          const first = data.previews[0];
          setCurrentPreviewUrl(first.img_url);
          setSelectedPreviewId(first.preview_id);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Не удалось загрузить историю");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [sessionId]);

  const handleHistoryClick = async (previewId: string) => {
    if (previewId === selectedPreviewId) return;
    try {
      const res = await fetch(`${baseUrl}/headbeauty/session/ready_preview?preview_id=${previewId}`);
      if (!res.ok) throw new Error("Ошибка получения превью");
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      setCurrentPreviewUrl(data.img_url);
      setSelectedPreviewId(previewId);
    } catch (err: any) {
      console.error(err);
      toast.error("Не удалось загрузить превью");
    }
  };

  const handleSetImage = async () => {
    if (!selectedPreviewId) {
      toast.warning("Сначала выберите превью");
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/headbeauty/session/set_img_to_session?preview_id=${selectedPreviewId}`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Ошибка установки");
      }
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      toast.success("Изображение установлено для дальнейшей работы");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка установки");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }

  const backgroundImage = currentPreviewUrl || "https://placehold.co/375x789";

  return (
    <div className="relative w-full mx-auto h-screen overflow-hidden bg-[#FFE9EF]">
      <img
        src={backgroundImage}
        alt="history background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute bottom-0 left-0 right-0 bg-[#FFE9EF] rounded-t-[20px] px-4 pt-6 pb-2">
        <h3 className="text-[24px] font-['Aclonica'] text-black text-center mb-4" style={{ fontFamily: "Aclonica, sans-serif" }}>
          headbeauty AI
        </h3>

        <div className="flex justify-between items-center mb-2">
          <span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black/70">
            {selectedPreviewId ? "Выбранное превью" : "Нет выбранного превью"}
          </span>
          {selectedPreviewId && (
            <button
              onClick={handleSetImage}
              className="bg-[#FFE9EF] rounded-[10px] py-1.5 px-4 shadow-sm text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              Установить эту картинку
            </button>
          )}
        </div>

        <div className="mt-2 rounded-[10px] p-2 overflow-hidden"
          style={{
            boxShadow:
              "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            border: "0.5px solid rgba(0,0,0,0.00)",
          }}
        >
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-4 pb-0">
              {historyPreviews.length > 0 ? (
                historyPreviews.map((item) => (
                  <div
                    key={item.preview_id}
                    onClick={() => handleHistoryClick(item.preview_id)}
                    className={`flex-shrink-0 w-28 bg-[#FFE9EF] p-2 shadow-md cursor-pointer transition-all ${
                      selectedPreviewId === item.preview_id ? "ring-2 ring-black" : ""
                    }`}
                    style={{
                      boxShadow:
                        "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                      border: "0.5px solid rgba(0,0,0,0.00)",
                    }}
                  >
                    <div className="w-full h-20 rounded-[5px] overflow-hidden">
                      <img
                        src={item.img_url}
                        alt="preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://placehold.co/160x100/FFE9EF/333?text=No+image";
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-black/50 text-center w-full text-[14px] font-['Sofia_Sans']">
                  История превью пуста
                </p>
              )}
            </div>
          </div>
        </div>

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

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}