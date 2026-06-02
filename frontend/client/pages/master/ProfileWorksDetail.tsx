import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { X, Upload, Image } from "lucide-react";
import backIcon from "@/assets/back_icon.svg";
import { toast } from "sonner";

interface WorkImage {
  id: number;
  url: string;
}

const initialImages: WorkImage[] = [];

export default function ProfileWorksDetailPage() {
  const { hashtag } = useParams<{ hashtag: string }>();
  const [images, setImages] = useState<WorkImage[]>(initialImages);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const handleFileSelect = (file: File | null) => {
    setUploadFile(file);
  };

  const handleSendFile = () => {
    if (!uploadFile) {
      toast.warning("Выберите файл");
      return;
    }

    const localUrl = URL.createObjectURL(uploadFile);
    const newImage: WorkImage = {
      id: Date.now(),
      url: localUrl,
    };

    setImages((prev) => [...prev, newImage]);
    setIsUploadModalOpen(false);
    setUploadFile(null);
    toast.success("Файл загружен");
  };

  const handleDelete = (id: number) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    toast.success("Изображение удалено");
  };

  return (
    <div className="min-h-screen bg-[#FFE9EF] pb-20"> {/* Добавил отступ снизу, чтобы картинки не перекрывались кнопкой */}
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка назад */}
        <Link
          to="/profile/portfolio"
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

        {/* Заголовок папки */}
        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">
            #{hashtag}
          </h2>
          <div className="h-px bg-black w-32 mb-6" />

          {/* Сетка изображений */}
          <div className="grid grid-cols-2 gap-4">
            {images.length > 0 ? (
              images.map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square bg-[#FFE9EF] rounded-[10px] overflow-hidden"
                   style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
                >
                  <img
                    src={img.url}
                    alt="work"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="absolute top-1 right-1 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white"
                  >
                    <X className="w-3.5 h-3.5 text-black/70" />
                  </button>
                </div>
              ))
            ) : (
              // Заглушки, когда нет ни одной картинки
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="aspect-square bg-[#FFE9EF] rounded-[10px] flex items-center justify-center border border-black/10"
                >
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></g></svg>               
              </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Кнопка загрузки – фиксирована внизу */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30">
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="relative bg-[#FFE9EF] rounded-[10px] py-3 px-4 flex items-center justify-center gap-2 shadow"
          style={{
            border: "0.5px solid rgba(0,0,0,0.00)",
            boxShadow:
              "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
          }}
        >
          <Upload className="w-5 h-5 text-black" />
          <span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black">
            Загрузить работу
          </span>
        </button>
      </div>

      {/* Модальное окно загрузки */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => {
              setIsUploadModalOpen(false);
              setUploadFile(null);
            }}
          />
          <div className="relative bg-[#FFE9EF] rounded-[20px] w-72 p-6 shadow-xl">
            <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center">
              Загрузка работы
            </h3>
            <div className="h-px bg-black w-60 mx-auto mt-2 mb-4" />

            <div className="flex flex-col gap-4">
              <label
                className="relative bg-[#FFE9EF] rounded-[10px] h-44 shadow flex flex-col items-center justify-center cursor-pointer"
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
                    if (file) handleFileSelect(file);
                  }}
                />
                {uploadFile ? (
                  <>
                    <img
                      src={URL.createObjectURL(uploadFile)}
                      alt="preview"
                      className="h-32 w-auto object-cover rounded"
                    />
                    <p className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black text-center mt-1">
                      {uploadFile.name}
                    </p>
                  </>
                ) : (
                  <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black/50">
                    Нажмите, чтобы выбрать файл
                  </span>
                )}
              </label>

              <button
                onClick={handleSendFile}
                className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow w-full"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                  Отправить картинку
                </span>
              </button>
            </div>

            <button
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadFile(null);
              }}
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