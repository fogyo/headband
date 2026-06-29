import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import homeIconSrc from "@/assets/home.svg";
import backIconSrc from "@/assets/back_icon.svg";
import { toast } from "sonner";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

interface Perm {
  id: string;
  name: string;
  img_url: string;
}

export default function AIPermPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gender: urlGender } = useParams<{ gender: string }>();
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get("session_id");

  const state = location.state as { gender?: boolean; img_url?: string; session_id?: string } | null;
  const gender = state?.gender !== undefined ? state.gender : (urlGender === "male" ? true : false);
  const [imgUrl, setImgUrl] = useState<string>(state?.img_url || "");
  const [allPerms, setAllPerms] = useState<Perm[]>([]);
  const [loading, setLoading] = useState(true);
  const effectiveSessionId = sessionId || state?.session_id || "";

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

  // Загрузка списка всех завивок
  useEffect(() => {
    const fetchPerms = async () => {
      if (!effectiveSessionId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${baseUrl}/headbeauty/session/perms?session_id=${effectiveSessionId}`);
        if (!res.ok) throw new Error("Ошибка загрузки завивок");
        const data = await res.json();
        if (data.status === "success") {
          setAllPerms(data.perms || []);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };
    fetchPerms();
  }, [sessionId, state, effectiveSessionId]);

  const handlePermClick = (perm: Perm) => {
    console.log("Выбрана завивка:", perm);
    // Здесь позже переход к деталям
  };

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

        {/* Горизонтальный скролл с карточками завивок */}
        <div className="mt-2 rounded-[10px] p-2 overflow-hidden"
          style={{
            boxShadow:
              "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            border: "0.5px solid rgba(0,0,0,0.00)",
          }}
        >
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-4 pb-0">
              {allPerms.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handlePermClick(item)}
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
              {allPerms.length === 0 && !loading && (
                <p className="text-black/50 text-center w-full">Нет доступных завивок</p>
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