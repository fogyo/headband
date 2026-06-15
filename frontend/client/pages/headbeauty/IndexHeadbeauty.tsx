import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, Upload, X } from "lucide-react";
import backIconSrc from "@/assets/back_icon.svg";
import { toast } from "sonner";

export default function AIStylePage() {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showGenderModal, setShowGenderModal] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSend = (gender: string) => {
    if (!selectedFile) return;
    // Здесь будет запрос к API с файлом и полом
    console.log("Отправка:", { file: selectedFile, gender });
    setShowGenderModal(false);
    navigate(`/headbeauty-category/${gender}`);
    // После успешной отправки можно перейти на другую страницу или показать результат
  };

  // При клике на кнопку "Отправить картинку" открываем модальное окно, если файл выбран
  const onSendClick = () => {
    if (!selectedFile) {
      toast.warning("Сначала выберите фото");
      return;
    }
    setShowGenderModal(true);
  };

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка Back */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIconSrc} alt="back" className="w-6 h-6 relative z-10" />
        </button>

        {/* Header */}
        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}
          >
            style
          </h1>
        </div>

        {/* Текст приветствия */}
        <div className="mt-8 text-center">
          <p className="text-[36px] font-['Sofia_Sans'] text-black leading-tight">
            Добро пожаловать в{" "}
            <span className="font-['Aclonica']">headbeauty AI</span>!
          </p>
          <p className="text-[20px] font-['Sofia_Sans'] text-black mt-4 leading-relaxed">
            Хотите примерить модную стрижку или найти «тот самый» оттенок волос, не выходя из дома?
            Наш ИИ-инструмент проанализирует геометрию Вашего лица и другие особенности, а затем покажет,
            как эти образы будут смотреться на Вас.
          </p>
        </div>

        {/* Загрузка фото */}
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

          {/* Кнопка отправки */}
          <button
            onClick={onSendClick}
            disabled={!selectedFile}
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
      </div>

      {/* Модальное окно выбора пола */}
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
                onClick={() => handleSend("male")}
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
                onClick={() => handleSend("female")}
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

            {/* Кнопка закрытия */}
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