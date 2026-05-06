import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Plus, X, ImagePlus, Upload } from "lucide-react";
import backIcon from "@/assets/back_icon.svg";
import { toast } from "sonner";
import pencilIcon from "@/assets/Pencil.svg";
import ambassadorIcon from "@/assets/ambassadorIcon.png";

// ---------- Типы ----------
interface GuideStep {
  id: string;
  title: string;
  description: string;
  image?: File | null;
  imagePreview?: string;
}

interface VideoGuideData {
  file?: File | null;
  description: string;
  cover?: File | null;
  coverPreview?: string;
}

const availableCategories = ["Стрижки", "Окрашивание", "Борода и усы"];

// ---------- Мок-данные (для редактирования) ----------
const mockGuides: Record<number, any> = {
  1: {
    title: "Помпадур",
    category: "Стрижки",
    type: "text",
    steps: [
      { title: "Подготовка", description: "Волосы должны быть чистыми и сухими.", imagePreview: null },
      { title: "Разделение", description: "Разделите волосы на зоны.", imagePreview: null },
    ],
  },
  2: {
    title: "Модельная",
    category: "Стрижки",
    type: "video",
    videoData: {
      description: "В этом видео я покажу...",
      coverPreview: null,
    },
  },
};

export default function GuideManagePage() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "text"; // 'text' или 'video'
  const isEditing = Boolean(editId);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(availableCategories[0]);

  // Текстовый гайд
  const [steps, setSteps] = useState<GuideStep[]>([
    { id: crypto.randomUUID?.() ?? Date.now().toString(), title: "", description: "", image: null },
  ]);

  // Видео гайд
  const [videoData, setVideoData] = useState<VideoGuideData>({
    description: "",
  });

  // Загрузка данных для редактирования
  useEffect(() => {
    if (!isEditing || !editId) return;
    const guide = mockGuides[Number(editId)];
    if (!guide) {
      toast.error("Гайд не найден");
      navigate("/profile/guides");
      return;
    }
    setTitle(guide.title);
    setCategory(guide.category);

    if (guide.type === "text" && guide.steps) {
      setSteps(
        guide.steps.map((s: any) => ({
          id: crypto.randomUUID?.() ?? Date.now().toString(),
          title: s.title,
          description: s.description,
          image: null,
          imagePreview: s.imagePreview || null,
        }))
      );
    } else if (guide.type === "video" && guide.videoData) {
      setVideoData({
        description: guide.videoData.description,
        coverPreview: guide.videoData.coverPreview || null,
      });
    }
  }, [isEditing, editId, navigate]);

  // --- Общие функции ---
  const handleSave = () => {
    if (!title.trim()) {
      toast.warning("Введите название гайда");
      return;
    }
    // TODO: отправка на бэк
    console.log("Сохраняю гайд:", {
      title, category, type,
      ...(type === "text" ? { steps } : { videoData }),
    });
    toast.success(isEditing ? "Гайд обновлён" : "Гайд отправлен на согласование");
    navigate("/profile/guides");
  };

  // --- Функции для текстового гайда ---
  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { id: crypto.randomUUID?.() ?? Date.now().toString(), title: "", description: "", image: null },
    ]);
  };

  const updateStep = (id: string, field: keyof GuideStep, value: any) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeStep = (id: string) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleStepImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      updateStep(id, "image", file);
      updateStep(id, "imagePreview", e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // --- Функции для видео гайда ---
  const handleVideoFile = (file: File) => {
    setVideoData((prev) => ({ ...prev, file }));
  };

  const handleCoverUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setVideoData((prev) => ({
        ...prev,
        cover: file,
        coverPreview: e.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  // ============ РЕНДЕР ============
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

        {/* Header */}
        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}
          >
            profile
          </h1>
          <p
            className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "0.4px #000" }}
          >
            version for masters
          </p>
        </div>

        {/* Необходимая информация */}
        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">
            {isEditing ? "Редактирование гайда" : "Необходимая информация"}
          </h2>
          <div className="h-px bg-black w-64 mb-4" />

          {/* Поле "Название" */}
          <div
            className="relative bg-[#FFE9EF] rounded-[10px] h-10 flex items-center justify-center shadow mb-3"
            style={{
              border: "0.5px solid rgba(0,0,0,0.00)",
              boxShadow:
                "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            }}
          >
            <input
              type="text"
              placeholder="Название"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-full bg-transparent text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50"
            />
          </div>

          {/* Поле "Категория" */}
          <div
            className="relative bg-[#FFE9EF] rounded-[10px] h-10 flex items-center px-3 shadow mb-6"
            style={{
              border: "0.5px solid rgba(0,0,0,0.00)",
              boxShadow:
                "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            }}
          >
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-transparent text-[16px] font-['Sofia_Sans'] text-black outline-none text-center"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* === ТЕКСТОВЫЙ ГАЙД === */}
          {type === "text" && (
            <>
              <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black"> Шаги</h2>
              <div className="h-px bg-black w-64 mb-4" />

              <div className="flex flex-col gap-8">
                {steps.map((step, idx) => (
                  <div key={step.id} className="flex gap-3 items-stretch">
                    {/* Нумератор с полоской */}
                    <div className="flex flex-col items-center w-8 flex-shrink-0">
                      <span className="text-4xl font-['Sofia_Sans'] text-black mb-2">{idx + 1}</span>
                      <div
                        className="flex-1 w-[8px] bg-[#FFD0DC] rounded-[20px]"
                        style={{
                          boxShadow:
                            "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                        }}
                      />
                    </div>

                    {/* Контент шага */}
                    <div className="flex-1 flex flex-col gap-3">
                      <div
                        className="relative bg-[#FFE9EF] rounded-[10px] h-10 shadow"
                        style={{
                          border: "0.5px solid rgba(0,0,0,0.00)",
                          boxShadow:
                            "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Название шага"
                          value={step.title}
                          onChange={(e) => updateStep(step.id, "title", e.target.value)}
                          className="w-full h-full bg-transparent text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50"
                        />
                      </div>

                      <div
                        className="relative bg-[#FFE9EF] rounded-[10px] h-36 shadow"
                        style={{
                          border: "0.5px solid rgba(0,0,0,0.00)",
                          boxShadow:
                            "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                        }}
                      >
                        <textarea
                          placeholder="Описание шага"
                          value={step.description}
                          onChange={(e) => updateStep(step.id, "description", e.target.value)}
                          className="w-full h-full bg-transparent text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black outline-none resize-none p-3 placeholder-black/50"
                        />
                      </div>

                      <label
                        className="relative bg-[#FFE9EF] rounded-[10px] h-10 shadow flex items-center justify-center cursor-pointer"
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
                            if (file) handleStepImageUpload(step.id, file);
                          }}
                        />
                        {step.imagePreview ? (
                          <>
                            <img src={step.imagePreview} alt="preview" className="h-8 w-auto object-cover rounded" />
                            <img src={pencilIcon} alt="edit" className="absolute right-2 w-4 h-4" />
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-black/50 text-[16px] tracking-[-0.8px] font-['Sofia_Sans']">
                            <ImagePlus className="w-4 h-4" />
                            Добавить картинку
                          </div>
                        )}
                      </label>
                    </div>

                    {steps.length > 1 && (
                      <button onClick={() => removeStep(step.id)} className="w-6 h-6 flex items-center justify-center text-black/50">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addStep}
                className="mt-10 w-full bg-[#FFE9EF] rounded-[10px] h-10 shadow flex items-center justify-center"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">Добавить еще шаг</span>
              </button>
            </>
          )}

          {/* === ВИДЕО ГАЙД === */}
          {type === "video" && (
            <div className="flex flex-col gap-4 mt-2">
              {/* Блок загрузки видео */}
              <label className="relative bg-[#FFE9EF] rounded-[10px] h-32 shadow flex flex-col items-center justify-center cursor-pointer gap-2"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleVideoFile(file);
                  }}
                />
                {videoData.file ? (
                  <>
                    <span className="text-sm font-['Sofia_Sans'] text-black">{videoData.file.name}</span>
                    <span className="text-xs font-['Sofia_Sans'] text-black/50">(нажмите, чтобы заменить)</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-black/50" />
                    <span className="text-sm font-['Sofia_Sans'] text-black/50">Прикрепите файл</span>
                  </>
                )}
              </label>

              {/* Описание видео */}
              <div
                className="relative bg-[#FFE9EF] rounded-[10px] h-36 shadow"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <textarea
                  placeholder="Описание видео"
                  value={videoData.description}
                  onChange={(e) => setVideoData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full h-full bg-transparent text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black outline-none resize-none p-3 placeholder-black/50"
                />
              </div>

              {/* Обложка видео (опционально) */}
              <label
                className="relative bg-[#FFE9EF] rounded-[10px] h-10 shadow flex items-center justify-center cursor-pointer"
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
                    if (file) handleCoverUpload(file);
                  }}
                />
                {videoData.coverPreview ? (
                  <>
                    <img src={videoData.coverPreview} alt="cover" className="h-8 w-auto object-cover rounded" />
                    <img src={pencilIcon} alt="edit" className="absolute right-2 w-4 h-4" />
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-black/50 text-[16px] tracking-[-0.8px] font-['Sofia_Sans']">
                    <ImagePlus className="w-4 h-4" />
                    Добавить обложку
                  </div>
                )}
              </label>
            </div>
          )}

          {/* Кнопка сохранения (всегда одна) */}
          <div className="mt-4">
            <div
              onClick={handleSave}
              className="cursor-pointer relative bg-[#FFE9EF] rounded-[10px] h-10 shadow flex items-center gap-3 px-8"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                {isEditing ? "Сохранить изменения" : "Согласовать"}
              </span>
              <img src={ambassadorIcon} alt="ambassador" className="w-16 h-9 object-contain ml-auto relative z-10" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}