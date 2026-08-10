import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import backIcon from "@/assets/back_icon.svg";
import { Plus, X, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useTelegramAuth } from "@/App";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ---------- Типы ----------
interface WorkFile {
  id: string;
  name: string;
  filepath: string;
}

// Функция загрузки файла в S3 (как в других модулях)
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

export default function ProfileWorksPage() {
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  const [works, setWorks] = useState<WorkFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Модальное окно добавления
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWorks = async () => {
    if (!chatId) return;
    try {
      const res = await fetch(`${baseUrl}/master/profile/works/?chat_id=${chatId}`);
      if (!res.ok) throw new Error("Ошибка загрузки работ");
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      setWorks(data.files || []);
    } catch (err: any) {
      console.error(err);
      setError("Не удалось загрузить портфолио");
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVerified && chatId) {
      fetchWorks();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isVerified, chatId, authLoading]);

  const handleAddWork = async () => {
    if (!chatId) return;
    if (!newName.trim()) {
      toast.warning("Введите название");
      return;
    }
    if (!selectedFile) {
      toast.warning("Выберите изображение");
      return;
    }
    setIsSubmitting(true);
    try {
      const fileKey = await uploadFile(selectedFile);
      const res = await fetch(`${baseUrl}/master/profile/works/upload_work_file?chat_id=${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), filepath: fileKey }),
      });
      if (!res.ok) throw new Error("Ошибка добавления работы");
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      toast.success("Работа добавлена");
      await fetchWorks();
      setIsModalOpen(false);
      setNewName("");
      setSelectedFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка добавления");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm("Удалить эту работу?")) return;
    try {
      const res = await fetch(`${baseUrl}/master/profile/works/delete_file?file_id=${fileId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Ошибка удаления");
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      toast.success("Работа удалена");
      await fetchWorks();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка удаления");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }

  if (authError || !isVerified) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500 font-['Sofia_Sans']">{authError || "Ошибка авторизации"}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500 font-['Sofia_Sans']">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        <Link
          to="/profile"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIcon} alt="back" className="w-6 h-6 relative z-10" />
        </Link>

        <div className="pt-8 pb-2">
          <h1 className="text-[40px] leading-tight tracking-[3.2px] text-transparent" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}>
            profile
          </h1>
          <p className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "0.4px #000" }}>
            version for masters
          </p>
        </div>

        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Портфолио</h2>
          <div className="h-px bg-black w-32 mb-6" />

          {works.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <ImageIcon className="w-16 h-16 text-black/20" />
              <p className="text-black/50 text-center font-['Sofia_Sans'] mt-4">Пока нет работ</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {works.map((work) => (
                <div key={work.id} className="relative bg-[#FFE9EF] rounded-[10px] overflow-hidden shadow-md">
                  <img
                    src={work.filepath}
                    alt={work.name}
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/300x200/FFE9EF/333?text=No+image";
                    }}
                  />
                  <button
                    onClick={() => handleDelete(work.id)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <div className="p-2">
                    <p className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black truncate">
                      {work.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Плавающая кнопка добавления */}
      <button
        onClick={() => {
          setIsModalOpen(true);
          setNewName("");
          setSelectedFile(null);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#FFE9EF] rounded-full shadow-lg flex items-center justify-center z-30"
        style={{
          boxShadow:
            "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
          border: "0.5px solid rgba(0,0,0,0.00)",
        }}
      >
        <Plus className="w-8 h-8 text-black" />
      </button>

      {/* Модальное окно добавления */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div
            className="relative bg-[#FFE9EF] rounded-[20px] w-full max-w-sm p-6 shadow-xl"
            style={{
              boxShadow:
                "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            }}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-black/50 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center mb-4">
              Добавить работу
            </h3>
            <div className="h-px bg-black w-60 mx-auto mt-2 mb-4" />

            <div className="flex flex-col gap-4">
              {/* Название */}
              <div
                className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow flex items-center px-3"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <input
                  type="text"
                  placeholder="Название работы"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-transparent text-[16px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50"
                />
              </div>

              {/* Выбор файла */}
              <label
                className="relative bg-[#FFE9EF] rounded-[10px] h-32 shadow flex flex-col items-center justify-center cursor-pointer"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedFile(file);
                  }}
                />
                <Upload className="w-8 h-8 text-black/50" />
                <span className="text-[14px] font-['Sofia_Sans'] text-black/50 mt-2">
                  {selectedFile ? selectedFile.name : "Нажмите, чтобы выбрать изображение"}
                </span>
              </label>

              <button
                onClick={handleAddWork}
                disabled={isSubmitting}
                className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow w-full flex items-center justify-center disabled:opacity-50"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                {isSubmitting ? (
                  <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/50">Загрузка...</span>
                ) : (
                  <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">Добавить</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}