import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, Upload, X } from "lucide-react";
import backIconSrc from "@/assets/back_icon.svg";
import { toast } from "sonner";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
const STATIC_CHAT_ID = 980609742;

interface Session {
  id: string;
  gender: boolean;
  img_url: string;
  created_at: string;
}

async function uploadFile(file: File): Promise<string> {
  const res = await fetch(`${baseUrl}/media/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, content_type: file.type }),
  });
  if (!res.ok) throw new Error("Не удалось получить ссылку для загрузки");
  const data = await res.json();
  if (data.status !== "success") throw new Error(data.status);
  const { upload_url, file_key } = data;

  const uploadRes = await fetch(upload_url, {
    method: "PUT",
    body: file,
  });
  if (!uploadRes.ok) throw new Error("Ошибка загрузки файла в S3");
  return file_key;
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()}`;
};

export default function AIStylePage() {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${baseUrl}/headbeauty/?chat_id=${STATIC_CHAT_ID}`);
      if (!res.ok) throw new Error("Ошибка загрузки сессий");
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      setSessions(data.sessions || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Не удалось загрузить историю");
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessions.length >= 0) {
      setLoading(false);
    }
  }, [sessions]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSend = async (gender: boolean) => {
    if (!selectedFile || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const objectKey = await uploadFile(selectedFile);
      const createRes = await fetch(`${baseUrl}/headbeauty/make_new_session?chat_id=${STATIC_CHAT_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender, img_url: objectKey }),
      });
      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.detail || "Ошибка создания сессии");
      }
      const createData = await createRes.json();
      if (createData.status !== "success") throw new Error(createData.status);
      const sessionId = createData.id;
      const sessionImgUrl = createData.img_url || `https://42ec6f95-d4a7-485e-81ab-1d151bffc8af.selstorage.ru/${objectKey}`;

      const analysisRes = await fetch(`${baseUrl}/headbeauty/session/start_face_analysis?session_id=${sessionId}`, {
        method: "POST",
      });
      if (!analysisRes.ok) {
        const err = await analysisRes.json();
        throw new Error(err.detail || "Ошибка запуска анализа");
      }
      const analysisData = await analysisRes.json();
      if (analysisData.status !== "processing") throw new Error("Ошибка запуска анализа");
      const taskId = analysisData.task || null;

      // Обновляем список сессий (но не ждём, чтобы не блокировать переход)
      fetchSessions();

      navigate(`/headbeauty-category/${gender ? "female" : "male"}?session_id=${sessionId}`, {
        state: {
          gender,
          img_url: sessionImgUrl,
          session_id: sessionId,
          task_id: taskId,
        },
      });
      toast.success("Сессия создана, анализ запущен");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка создания сессии");
    } finally {
      setIsSubmitting(false);
      setShowGenderModal(false);
    }
  };

  const onSendClick = () => {
    if (!selectedFile) {
      toast.warning("Сначала выберите фото");
      return;
    }
    setShowGenderModal(true);
  };

  const selectSession = (session: Session) => {
    navigate(`/headbeauty-category/${session.gender ? "female" : "male"}?session_id=${session.id}`, {
      state: {
        gender: session.gender,
        img_url: session.img_url,
        session_id: session.id,
        task_id: "atomic_operation",
      },
    });
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Удалить эту сессию?")) return;
    try {
      const res = await fetch(`${baseUrl}/headbeauty/delete_session?session_id=${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Ошибка удаления");
      }
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      toast.success("Сессия удалена");
      await fetchSessions();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка удаления");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }

  const hasSessions = sessions.length > 0;

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIconSrc} alt="back" className="w-6 h-6 relative z-10" />
        </button>

        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}
          >
            style
          </h1>
        </div>

        {!hasSessions ? (
          <>
            <div className="mt-8 text-center">
              <p className="text-[36px] tracking-[-1.8px] font-['Sofia_Sans'] text-black leading-tight">
                Добро пожаловать в{" "}
                <span className="font-['Aclonica']">headbeauty AI</span>!
              </p>
              <p className="text-[20px] tracking-[-1px] font-['Sofia_Sans'] text-black mt-4 leading-relaxed">
                Хотите примерить модную стрижку или найти «тот самый» оттенок волос, не выходя из дома?
                Наш ИИ-инструмент проанализирует геометрию Вашего лица и другие особенности, а затем покажет,
                как эти образы будут смотреться на Вас.
              </p>
            </div>

            <div className="mt-8 flex flex-col items-center">
              <label
                className="relative bg-[#FFE9EF] rounded-[10px] w-64 h-44 shadow-md flex flex-col items-center justify-center cursor-pointer"
                style={{
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  border: "0.5px solid rgba(0,0,0,0.00)",
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="w-full h-full object-cover rounded-[10px]"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-12 h-12 text-black/50" />
                    <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/50">
                      Нажмите, чтобы загрузить фото
                    </span>
                  </div>
                )}
              </label>

              <button
                onClick={onSendClick}
                disabled={!selectedFile || isSubmitting}
                className="mt-6 relative bg-[#FFE9EF] rounded-[10px] w-64 h-11 flex items-center justify-center disabled:opacity-50"
                style={{
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  border: "0.5px solid rgba(0,0,0,0.00)",
                }}
              >
                <Upload className="w-5 h-5 mr-2" />
                <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                  Отправить картинку
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-8 text-center">
              <p className="text-[36px] tracking-[-1.8px] font-['Sofia_Sans'] text-black leading-tight">
                С возвращением в{" "}
                <span className="font-['Aclonica']">headbeauty AI</span>!
              </p>
            </div>

            <div className="mt-6 rounded-[10px] p-2"
              style={{
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                border: "0.5px solid rgba(0,0,0,0.00)",
              }}
            >
              <div className="overflow-x-auto no-scrollbar">
                <div className="flex gap-4 pb-0">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex-shrink-0 w-40 bg-[#FFE9EF] p-2 shadow-md cursor-pointer relative"
                      style={{
                        boxShadow:
                          "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                        border: "0.5px solid rgba(0,0,0,0.00)",
                      }}
                      onClick={() => selectSession(session)}
                    >
                      <button
                        onClick={(e) => deleteSession(session.id, e)}
                        className="absolute top-1 right-1 z-10 w-5 h-5 bg-black/20 rounded-full flex items-center justify-center hover:bg-black/40 transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      <div className="w-full h-24 rounded-[5px] overflow-hidden">
                        <img
                          src={session.img_url}
                          alt="session"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/160x100/FFE9EF/333?text=No+image";
                          }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div>
                          <p className="text-[12px] font-['Sofia_Sans'] text-black font-semibold">
                            Сессия {sessions.indexOf(session) + 1}
                          </p>
                          <p className="text-[10px] font-['Sofia_Sans'] text-black/50">
                            {formatDate(session.created_at)}
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full ${session.gender ? "bg-pink-400" : "bg-blue-400"}`}
                          title={session.gender ? "Женский" : "Мужской"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center">
              <label
                className="relative bg-[#FFE9EF] rounded-[10px] w-64 h-44 shadow-md flex flex-col items-center justify-center cursor-pointer"
                style={{
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  border: "0.5px solid rgba(0,0,0,0.00)",
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="w-full h-full object-cover rounded-[10px]"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-12 h-12 text-black/50" />
                    <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/50">
                      Нажмите, чтобы загрузить фото
                    </span>
                  </div>
                )}
              </label>

              <button
                onClick={onSendClick}
                disabled={!selectedFile || isSubmitting}
                className="mt-6 relative bg-[#FFE9EF] rounded-[10px] w-64 h-11 flex items-center justify-center disabled:opacity-50"
                style={{
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  border: "0.5px solid rgba(0,0,0,0.00)",
                }}
              >
                <Upload className="w-5 h-5 mr-2" />
                <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                  Отправить картинку
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {showGenderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowGenderModal(false)}
          />
          <div className="relative bg-[#FFE9EF] rounded-[20px] w-72 p-6 shadow-xl">
            <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center">
              Выберите пол
            </h3>
            <div className="h-px bg-black w-60 mx-auto mt-2 mb-4" />

            <div className="flex flex-col gap-4">
              <button
                onClick={() => handleSend(false)}
                className="relative bg-[#6A92FF] rounded-[10px] h-11 shadow w-full"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-white">
                  Мужской
                </span>
              </button>
              <button
                onClick={() => handleSend(true)}
                className="relative bg-[#FF6A92] rounded-[10px] h-11 shadow w-full"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-white">
                  Женский
                </span>
              </button>
            </div>

            <button
              onClick={() => setShowGenderModal(false)}
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