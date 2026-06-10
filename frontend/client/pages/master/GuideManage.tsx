import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Plus, X, ImagePlus, Upload } from "lucide-react";
import backIcon from "@/assets/back_icon.svg";
import { toast } from "sonner";
import pencilIcon from "@/assets/Pencil.svg";
import ambassadorIcon from "@/assets/ambassadorIcon.png";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
const STATIC_CHAT_ID = 980609742;

interface GuideStep {
  id: string;            // реальный step_id (для существующих) или временный (для новых)
  name: string;          // название шага
  description: string;   // текст шага
  image?: File | null;
  imagePreview?: string;
  imageKey?: string;      // существующий image_url (при редактировании)
  step_num: number;
  isNew?: boolean;        // true для новых шагов (ещё нет в БД)
  isDeleted?: boolean;    // помечен на удаление (для существующих)
}

interface VideoGuideData {
  file?: File | null;
  description: string;
  cover?: File | null;
  coverPreview?: string;
  coverKey?: string;
  videoKey?: string;
}

interface VideoStepResponse {
  status: string;
  step_id: string;      // обязательное поле – убедитесь, что бэк возвращает step_id
  video_name: string;
  description: string;
  video_url: string;
  preview: string | null;
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
  if (!uploadRes.ok) throw new Error("Ошибка загрузки файла");
  return file_key;
}

export default function GuideManagePage() {
  const navigate = useNavigate();
  const [videoStepId, setVideoStepId] = useState<string>("");
  const [videoPreviewKey, setVideoPreviewKey] = useState<string | null>(null);
  const [videoPreviewPreview, setVideoPreviewPreview] = useState<string | null>(null);
  const { id: editId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "text";
  const isEditing = Boolean(editId);
  const location = useLocation();
  const state = location.state as { title?: string; categoryId?: string } | null;

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [steps, setSteps] = useState<GuideStep[]>([]);
  const [videoData, setVideoData] = useState<VideoGuideData>({ description: "" });
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // Загрузка категорий
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${baseUrl}/master/profile/prices/categories`);
        if (!res.ok) throw new Error("Ошибка загрузки категорий");
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);
        setCategories(data.categories);
        if (data.categories.length > 0 && !categoryId) {
          setCategoryId(data.categories[0].id);
        }
      } catch (err) {
        console.error(err);
        toast.error("Не удалось загрузить категории");
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  useEffect(() => {
  if (!isEditing || type !== "video") return;
  if (!editId) return;

  const fetchVideoGuide = async () => {
    setLoadingData(true);
        try {
          if (state?.title) setTitle(state.title);
          if (state?.categoryId) setCategoryId(state.categoryId);

          const res = await fetch(`${baseUrl}/master/guides/step_video?guide_id=${editId}`);
          if (!res.ok) throw new Error("Ошибка загрузки видео");
          const data: VideoStepResponse = await res.json();
          if (data.status !== "success") throw new Error(data.status);

          setVideoStepId(data.step_id);
          setVideoData({
            description: data.description,
            file: null,
            cover: null,
            coverPreview: data.preview || null,
            coverKey: data.preview || null,  // здесь храним URL превью (если нужно)
            videoKey: null,                   // не храним старый URL
          });
          setVideoPreviewPreview(data.preview || null);
          if (data.video_name && !state?.title) setTitle(data.video_name);
        } catch (err: any) {
          console.error(err);
          toast.error("Не удалось загрузить видео гайд");
          navigate("/profile/guides");
        } finally {
          setLoadingData(false);
        }
      };
      fetchVideoGuide();
    }, [isEditing, editId, type, state, navigate]);

  // Загрузка данных текстового гайда при редактировании
  useEffect(() => {
    if (!isEditing || type !== "text") return;
    if (!editId) return;

    const fetchGuide = async () => {
      setLoadingData(true);
      try {
        // Название и категория из location.state (если переданы)
        if (state?.title) setTitle(state.title);
        if (state?.categoryId) setCategoryId(state.categoryId);

        // Загружаем шаги и название гайда
        const res = await fetch(`${baseUrl}/master/guides/step_text?guide_id=${editId}`);
        if (!res.ok) throw new Error("Ошибка загрузки шагов");
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);

        // Если название не пришло из state, берём из ответа бэкенда
        if (data.name && !state?.title) setTitle(data.name);

        const loadedSteps: GuideStep[] = data.steps.map((step: any) => ({
          id: step.step_id,
          name: step.name || "",
          description: step.text || "",
          imageKey: step.img_url || undefined,
          imagePreview: step.img_url ? step.img_url : undefined,
          image: null,
          step_num: step.step_num,
          isNew: false,
          isDeleted: false,
        }));
        loadedSteps.sort((a, b) => a.step_num - b.step_num);
        setSteps(loadedSteps);
      } catch (err: any) {
        console.error(err);
        toast.error("Не удалось загрузить гайд");
        navigate("/profile/guides");
      } finally {
        setLoadingData(false);
      }
    };
    fetchGuide();
  }, [isEditing, editId, type, state, navigate]);
  // Управление шагами (теперь разрешено и при редактировании)
  const addStep = () => {
    const newStepNum = steps.length + 1;
    setSteps(prev => [
      ...prev,
      {
        id: crypto.randomUUID?.() ?? Date.now().toString(),
        name: "",
        description: "",
        image: null,
        step_num: newStepNum,
        isNew: true,
        isDeleted: false,
      },
    ]);
  };

  const updateStep = (id: string, field: keyof GuideStep, value: any) => {
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeStep = (id: string) => {
    setSteps(prev => {
      const stepToRemove = prev.find(s => s.id === id);
      if (stepToRemove?.isNew) {
        // новый шаг – просто удаляем из массива
        return prev.filter(s => s.id !== id);
      } else {
        // существующий – помечаем на удаление
        return prev.map(s => (s.id === id ? { ...s, isDeleted: true } : s));
      }
    });
  };

  const handleStepImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      updateStep(id, "image", file);
      updateStep(id, "imagePreview", e.target?.result as string);
      updateStep(id, "imageKey", undefined);
    };
    reader.readAsDataURL(file);
  };

  // Видео гайд (пока без изменений)
  const handleVideoFile = (file: File) => setVideoData(prev => ({ ...prev, file }));
  const handleCoverUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setVideoData(prev => ({ ...prev, cover: file, coverPreview: e.target?.result as string }));
    reader.readAsDataURL(file);
  };

  // Сохранение
  const handleSave = async () => {
    if (!title.trim()) {
      toast.warning("Введите название гайда");
      return;
    }
    if (!categoryId) {
      toast.warning("Выберите категорию");
      return;
    }

    try {
      if (type === "text") {
        if (isEditing) {
          // --- РЕДАКТИРОВАНИЕ ---
          // 1. Собираем шаги, которые нужно обновить (не удалённые, существующие)
          const stepsToUpdate: any[] = [];
          const stepsToAdd: any[] = [];
          const stepsToDelete: string[] = [];

          let newStepCounter = 1; // для нумерации новых шагов

          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if (step.isDeleted) {
              if (!step.isNew) {
                stepsToDelete.push(step.id);
              }
              continue;
            }

            // Определяем step_num (порядок в массиве, начиная с 1)
            const currentStepNum = i + 1;

            // Обработка изображения: если есть новое – загружаем, иначе оставляем старое
            let imageUrl = step.imageKey ?? null;
            if (step.image) {
              imageUrl = await uploadFile(step.image);
            }

            if (step.isNew) {
              // Новый шаг – добавляем в steps_to_add
              stepsToAdd.push({
                name: step.name,
                text: step.description,
                step_num: currentStepNum,
                image_url: imageUrl,
              });
            } else {
              // Существующий шаг – обновляем
              stepsToUpdate.push({
                step_id: step.id,
                name: step.name,
                text: step.description,
                step_num: currentStepNum,
                image_url: imageUrl,
              });
            }
          }

          const payload: any = {
            guide_id: editId,
            name: title,
            category_id: categoryId,
            steps: stepsToUpdate,
            steps_to_add: stepsToAdd,
            steps_to_delete: stepsToDelete,
          };

          const res = await fetch(`${baseUrl}/master/profile/guides/update_text`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Ошибка обновления");
          }
          const data = await res.json();
          if (data.status !== "success") throw new Error(data.status);
          toast.success("Гайд обновлён");
          navigate("/profile/guides");
        } else {
          // --- СОЗДАНИЕ НОВОГО ГАЙДА ---
          const stepsPayload = [];
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            let imageKey = step.imageKey ?? null;
            if (step.image) {
              imageKey = await uploadFile(step.image);
            }
            stepsPayload.push({
              name: step.name,
              text: step.description,
              step_num: i + 1,
              image_url: imageKey,
            });
          }
          const res = await fetch(`${baseUrl}/master/profile/guides/create_text?chat_id=${STATIC_CHAT_ID}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: title,
              category_id: categoryId,
              steps: stepsPayload,
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Ошибка создания");
          }
          const data = await res.json();
          if (data.status !== "success") throw new Error(data.status);
          toast.success("Гайд отправлен на согласование");
          navigate("/profile/guides");
        }
      } else {
        // Видео гайд
        if (!videoData.file && !isEditing) {
          toast.warning("Прикрепите видеофайл");
          return;
        }
        if (!videoData.description.trim()) {
          toast.warning("Добавьте описание видео");
          return;
        }

        let videoKey = null;
        let previewKey = null;

        if (videoData.file) {
          videoKey = await uploadFile(videoData.file);
        }
        if (videoData.cover) {
          previewKey = await uploadFile(videoData.cover);
        } else if (videoData.coverKey) {
          // если обложка не менялась, оставляем старый ключ (URL)
          previewKey = videoData.coverKey;
        }

        if (isEditing) {
          // Редактирование видео
          const payload: any = {
            guide_id: editId,
            name: title,
            category_id: categoryId,
            video: {
              step_id: videoStepId,
              name: title,
              text: videoData.description,
              step_num: 1,
              ...(videoKey !== null && { filepath: videoKey }),
              ...(previewKey !== null && { image_url: previewKey }),
            },
          };
          const res = await fetch(`${baseUrl}/master/profile/guides/update_video`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Ошибка обновления видео");
          }
          const data = await res.json();
          if (data.status !== "success") throw new Error(data.status);
          toast.success("Видео гайд обновлён");
        } else {
          // Создание нового видео
          const res = await fetch(`${baseUrl}/master/profile/guides/create_video?chat_id=${STATIC_CHAT_ID}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: title,
              category_id: categoryId,
              video: {
                name: title,
                text: videoData.description,
                step_num: 1,
                filepath: videoKey,      // при создании видео обязательно
                image_url: previewKey,
              },
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Ошибка создания видео");
          }
          const data = await res.json();
          if (data.status !== "success") throw new Error(data.status);
          toast.success("Видео гайд отправлен на согласование");
        }
        navigate("/profile/guides");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка сохранения");
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка назад */}
        <Link
          to="/profile/guides"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIcon} alt="back" className="w-6 h-6 relative z-10" />
        </Link>

        <div className="pt-8 pb-2">
          <h1 className="text-[40px] leading-tight tracking-[3.2px] text-transparent" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}>profile</h1>
          <p className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "0.4px #000" }}>version for masters</p>
        </div>

        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">{isEditing ? "Редактирование гайда" : "Необходимая информация"}</h2>
          <div className="h-px bg-black w-64 mb-4" />

          <div className="relative bg-[#FFE9EF] rounded-[10px] h-10 flex items-center justify-center shadow mb-3" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
            <input type="text" placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} className="w-full h-full bg-transparent text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50" />
          </div>

          <div className="relative bg-[#FFE9EF] rounded-[10px] h-10 flex items-center px-3 shadow mb-6" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-transparent text-[16px] font-['Sofia_Sans'] text-black outline-none text-center disabled:text-gray-400"
              disabled={categoriesLoading || isEditing}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {type === "text" && (
            <>
              <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black"> Шаги</h2>
              <div className="h-px bg-black w-64 mb-4" />
              <div className="flex flex-col gap-8">
                {steps
                  .filter(step => !step.isDeleted)
                  .map((step, idx) => (
                    <div key={step.id} className="flex gap-3 items-stretch">
                      <div className="flex flex-col items-center w-8 flex-shrink-0">
                        <span className="text-4xl font-['Sofia_Sans'] text-black mb-2">{idx + 1}</span>
                        <div className="flex-1 w-[8px] bg-[#FFD0DC] rounded-[20px]" style={{ boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }} />
                      </div>
                      <div className="flex-1 flex flex-col gap-3">
                        <div className="relative bg-[#FFE9EF] rounded-[10px] h-10 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
                          <input type="text" placeholder="Название шага" value={step.name} onChange={e => updateStep(step.id, "name", e.target.value)} className="w-full h-full bg-transparent text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50" />
                        </div>
                        <div className="relative bg-[#FFE9EF] rounded-[10px] h-36 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
                          <textarea
                            placeholder="Описание шага"
                            value={step.description}
                            onChange={e => updateStep(step.id, "description", e.target.value)}
                            className="w-full h-full bg-transparent text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black outline-none resize-none p-3 placeholder-black/50"
                          />
                        </div>
                        <label className="relative bg-[#FFE9EF] rounded-[10px] h-10 shadow flex items-center justify-center cursor-pointer" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleStepImageUpload(step.id, file); }} />
                          {step.imagePreview ? (
                            <><img src={step.imagePreview} alt="preview" className="h-8 w-auto object-cover rounded" /><img src={pencilIcon} alt="edit" className="absolute right-2 w-4 h-4" /></>
                          ) : (
                            <div className="flex items-center gap-2 text-black/50 text-[16px] tracking-[-0.8px] font-['Sofia_Sans']"><ImagePlus className="w-4 h-4" /> Добавить картинку</div>
                          )}
                        </label>
                      </div>
                      {steps.filter(s => !s.isDeleted).length > 1 && (
                        <button onClick={() => removeStep(step.id)} className="w-6 h-6 flex items-center justify-center text-black/50"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
              </div>
              <button onClick={addStep} className="mt-10 w-full bg-[#FFE9EF] rounded-[10px] h-10 shadow flex items-center justify-center" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
                <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">Добавить еще шаг</span>
              </button>
            </>
          )}

          {type === "video" && (
            // ... (без изменений, как в вашем коде)
            <div className="flex flex-col gap-4 mt-2">
              <label className="relative bg-[#FFE9EF] rounded-[10px] h-32 shadow flex flex-col items-center justify-center cursor-pointer gap-2" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
                <input type="file" accept="video/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleVideoFile(file); }} />
                {videoData.file ? (
                  <><span className="text-sm font-['Sofia_Sans'] text-black">{videoData.file.name}</span><span className="text-xs font-['Sofia_Sans'] text-black/50">(нажмите, чтобы заменить)</span></>
                ) : (
                  <><Upload className="w-6 h-6 text-black/50" /><span className="text-sm font-['Sofia_Sans'] text-black/50">Прикрепите файл</span></>
                )}
              </label>
              <div className="relative bg-[#FFE9EF] rounded-[10px] h-36 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
                <textarea placeholder="Описание видео" value={videoData.description} onChange={e => setVideoData(prev => ({ ...prev, description: e.target.value }))} className="w-full h-full bg-transparent text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black outline-none resize-none p-3 placeholder-black/50" />
              </div>
              <label className="relative bg-[#FFE9EF] rounded-[10px] h-10 shadow flex items-center justify-center cursor-pointer" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
                <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleCoverUpload(file); }} />
                {videoData.coverPreview ? (
                  <><img src={videoData.coverPreview} alt="cover" className="h-8 w-auto object-cover rounded" /><img src={pencilIcon} alt="edit" className="absolute right-2 w-4 h-4" /></>
                ) : (
                  <div className="flex items-center gap-2 text-black/50 text-[16px] tracking-[-0.8px] font-['Sofia_Sans']"><ImagePlus className="w-4 h-4" /> Добавить обложку</div>
                )}
              </label>
            </div>
          )}

          <div className="mt-4">
            <div onClick={handleSave} className="cursor-pointer relative bg-[#FFE9EF] rounded-[10px] h-10 shadow flex items-center gap-3 px-8" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
              <span className="absolute inset-0 flex items-center justify-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">{isEditing ? "Сохранить изменения" : "Согласовать"}</span>
              <img src={ambassadorIcon} alt="ambassador" className="w-16 h-9 object-contain ml-auto relative z-10" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}