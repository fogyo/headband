import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Download, X } from "lucide-react";
import trashIcon from "@/assets/Trash.svg"
import pencilIcon from "@/assets/Pencil.svg"
import backIcon from "@/assets/back_icon.svg";
import { toast } from "sonner";


// ---------- Типы ----------
interface ServiceItem {
  id: number;
  name: string;
  duration: string;
  price: string;
}

interface Category {
  id: number;
  title: string;
  services: ServiceItem[];
}

// ---------- Мок-данные ----------
const initialCategories: Category[] = [
  {
    id: 1,
    title: "Стрижки",
    services: [
      { id: 1, name: "Стрижка детская (до 10 лет)", duration: "~40 мин", price: "1190 ₽" },
      { id: 2, name: "Стрижка детская (до 10 лет)", duration: "~40 мин", price: "1190 ₽" },
      { id: 3, name: "Стрижка детская (до 10 лет)", duration: "~40 мин", price: "1190 ₽" },
    ],
  },
  {
    id: 2,
    title: "Окрашивание",
    services: [
      { id: 4, name: "Стрижка детская (до 10 лет)", duration: "~40 мин", price: "1190 ₽" },
      { id: 5, name: "Стрижка детская (до 10 лет)", duration: "~40 мин", price: "1190 ₽" },
      { id: 6, name: "Стрижка детская (до 10 лет)", duration: "~40 мин", price: "1190 ₽" },
    ],
  },
  {
    id: 3,
    title: "Борода и усы",
    services: [
      { id: 7, name: "Стрижка детская (до 10 лет)", duration: "~40 мин", price: "1190 ₽" },
      { id: 8, name: "Стрижка детская (до 10 лет)", duration: "~40 мин", price: "1190 ₽" },
      { id: 9, name: "Стрижка детская (до 10 лет)", duration: "~40 мин", price: "1190 ₽" },
      { id: 10, name: "Стрижка детская (до 10 лет)", duration: "~40 мин", price: "1190 ₽" },
    ],
  },
];

// ---------- Микро-компонент кнопки действия (редактировать/удалить) ----------
const IconButton = ({
  icon: Icon,
  onClick,
  label,
}: {
  icon: React.ElementType;
  onClick: () => void;
  label: string;
}) => (
  <button
    onClick={onClick}
    className="relative w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
    aria-label={label}
  >
    <div className="absolute w-11 h-11 left-[5px] top-[5px] bg-white rounded-[5px] blur-[20px] opacity-80" />
    <Icon className="w-5 h-5 text-black relative z-10" />
  </button>
);

export default function ProfilePriceListPage() {
    const [categories, setCategories] = useState(initialCategories);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newService, setNewService] = useState({
  name: "",
  categoryId: categories[0]?.id ?? 0,
  duration: "",
  price: "",
});
    const [newCategoryName, setNewCategoryName] = useState("");

    const [editingService, setEditingService] = useState<{
    categoryId: number;
    serviceId: number;
    } | null>(null);


const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
const [uploadFile, setUploadFile] = useState<File | null>(null);

// Добавить услугу
const handleAddService = () => {
  if (!newService.name || !newService.duration || !newService.price) {
    toast.warning("Заполните все поля");
    return;
  }
  const durationFormatted = `~${newService.duration} мин`;
  const priceFormatted = `${newService.price} ₽`;

  if (editingService) {
    // Редактирование существующей услуги
    const oldCategoryId = editingService.categoryId;
    const newCategoryId = newService.categoryId;

    setCategories((prev) => {
      const updated = prev.map((cat) => {
        // Удаляем из старой категории (если это не та же категория)
        if (cat.id === oldCategoryId && oldCategoryId !== newCategoryId) {
          return {
            ...cat,
            services: cat.services.filter(
              (s) => s.id !== editingService.serviceId
            ),
          };
        }
        return cat;
      });

      // Обновляем или добавляем в новую категорию
      return updated.map((cat) => {
        if (cat.id === newCategoryId) {
          const exists = cat.services.find(
            (s) => s.id === editingService.serviceId
          );
          if (exists) {
            // Обновляем на месте
            return {
              ...cat,
              services: cat.services.map((s) =>
                s.id === editingService.serviceId
                  ? { ...s, name: newService.name, duration: durationFormatted, price: priceFormatted }
                  : s
              ),
            };
          } else {
            // Добавляем в новую категорию
            const service = categories
              .find((c) => c.id === oldCategoryId)
              ?.services.find((s) => s.id === editingService.serviceId);
            if (service) {
              return {
                ...cat,
                services: [
                  ...cat.services,
                  {
                    ...service,
                    name: newService.name,
                    duration: durationFormatted,
                    price: priceFormatted,
                  },
                ],
              };
            }
          }
        }
        return cat;
      });
    });

    toast.success("Услуга изменена");
  } else {
    // Добавление новой услуги
    const maxId = Math.max(
      0,
      ...categories.flatMap((c) => c.services.map((s) => s.id))
    );
    const newServiceObj: ServiceItem = {
      id: maxId + 1,
      name: newService.name,
      duration: durationFormatted,
      price: priceFormatted,
    };
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === newService.categoryId
          ? { ...cat, services: [...cat.services, newServiceObj] }
          : cat
      )
    );
    toast.success("Услуга добавлена");
  }

  setIsAddModalOpen(false);
  setEditingService(null);
  setNewService({
    name: "",
    categoryId: categories[0]?.id ?? 0,
    duration: "",
    price: "",
  });
};
// Добавить категорию (быстрое создание)
const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCatId = Math.max(0, ...categories.map(c => c.id)) + 1;
    const newCat: Category = {
        id: newCatId,
        title: newCategoryName.trim(),
        services: [],
    };
    setCategories(prev => [...prev, newCat]);
    setNewService(prev => ({ ...prev, categoryId: newCatId }));
    setNewCategoryName("");
    toast.success("Категория добавлена");
    };
  // Удаление услуги с подтверждением
  const handleDeleteService = (categoryId: number, serviceId: number) => {
    if (!window.confirm("Удалить эту услугу? Все записи по этой услуге будут удалены")) return;

    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? { ...cat, services: cat.services.filter((s) => s.id !== serviceId) }
          : cat
      )
    );
    toast.success("Услуга удалена");
  };

const handleEditService = (categoryId: number, serviceId: number) => {
  const category = categories.find((c) => c.id === categoryId);
  const service = category?.services.find((s) => s.id === serviceId);
  if (!service) return;
  // Извлечь число из строки "~40 мин"
  const durationMatch = service.duration.match(/\d+/);
  const durationNum = durationMatch ? durationMatch[0] : service.duration;
  // Убрать "₽" из цены
  const priceNum = service.price.replace(/[^0-9]/g, "");
  
  setNewService({
    name: service.name,
    categoryId: categoryId,
    duration: durationNum,
    price: priceNum,
  });
  setEditingService({ categoryId, serviceId });
  setIsAddModalOpen(true);
};
const handleSendFile = () => {
  if (!uploadFile) {
    toast.warning("Выберите файл");
    return;
  }
  // Здесь будет реальный запрос к бэкенду
  console.log("Отправляю файл:", uploadFile);
  toast.success("Файл отправлен");
  setIsUploadModalOpen(false);
  setUploadFile(null);
};

const handleUploadServices = () => setIsUploadModalOpen(true);

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
        {/* Модальное окно загрузки файла */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Затемнение + блюр */}
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadFile(null);
              }}
            />

            {/* Само окно */}
            <div className="relative bg-[#FFE9EF] rounded-[20px] w-72 p-6 shadow-xl">
              {/* Заголовок */}
              <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center">
                Добавление услуг
              </h3>
              <div className="h-px bg-black w-60 mx-auto mt-2 mb-4" />

              <div className="flex flex-col gap-4">
                {/* Область загрузки – теперь это лейбл на весь блок */}
                <label
                  className="relative bg-[#FFE9EF] rounded-[10px] h-44 shadow flex flex-col items-center justify-center cursor-pointer"
                  style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                      "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  }}
                >
                  {/* Иконка загрузки */}
                  <div className="mb-2">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <rect x="6" y="4" width="36" height="32" rx="3" stroke="black" strokeWidth="2" />
                      <path d="M18 24L24 18L30 24" stroke="black" strokeWidth="2" />
                      <line x1="24" y1="18" x2="24" y2="30" stroke="black" strokeWidth="2" />
                      <line x1="12" y1="38" x2="36" y2="38" stroke="black" strokeWidth="2" />
                    </svg>
                  </div>
                  {uploadFile ? (
                    <p className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black text-center">
                      {uploadFile.name}
                    </p>
                  ) : (
                    <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black/50">
                      Нажмите, чтобы выбрать файл
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>

                {/* Кнопка отправки */}
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

              {/* Крестик закрытия */}
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

        {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Затемнение + блюр */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
            
            {/* Само окно */}
            <div className="relative bg-[#FFE9EF] rounded-[20px] w-72 p-6 shadow-xl">
            {/* Заголовок */}
            <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center">
            {editingService ? "Изменение услуги" : "Добавление услуги"}
            </h3>
            <div className="h-px bg-black w-60 mx-auto mt-2 mb-4" />

            {/* Поля */}
            <div className="flex flex-col gap-4">
                {/* Название */}
                <div className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow"
                style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}>
                <input
                    type="text"
                    placeholder="Название услуги"
                    value={newService.name}
                    onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full h-full bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50"
                />
                </div>

                {/* Категория */}
                <div className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow flex items-center px-2"
                style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}>
                <select
                    value={newService.categoryId}
                    onChange={(e) => setNewService(prev => ({ ...prev, categoryId: Number(e.target.value) }))}
                    className="flex-1 bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center"
                >
                    {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.title}</option>
                    ))}
                </select>
                </div>

                {/* Длительность и цена */}
                <div className="flex gap-3">
                    <div className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow flex-1"
                    style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}>
                        <input
                        type="number"
                        min="1"
                        placeholder="Длительность (мин)"
                        value={newService.duration}
                        onChange={(e) => setNewService(prev => ({ ...prev, duration: e.target.value }))}
                        className="w-full h-full bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50"
                        />
                    </div>
                <div className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow flex-1"
                style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}>
                    <input
                    type="text"
                    placeholder="Цена (рубли)"
                    value={newService.price}
                    onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full h-full bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50"
                    />
                </div>
                </div>

                {/* Кнопка добавления */}
                <button
                    onClick={handleAddService}
                    className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow w-full"
                    style={{
                        border: "0.5px solid rgba(0,0,0,0.00)",
                        boxShadow:
                        "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                    }}
                    >
                    <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                        {editingService ? "Изменить услугу" : "Добавить услугу"}
                    </span>
                </button>
            </div>

            {/* Крестик закрытия */}
            <button
            onClick={() => {
                setIsAddModalOpen(false);
                setEditingService(null);
                setNewService({ name: "", categoryId: categories[0]?.id ?? 0, duration: "", price: "" });
            }}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center"
            >
            <X className="w-4 h-4 text-black/50" />
            </button>
            </div>
        </div>
        )}
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка назад */}
        <Link
          to="/profile"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIcon} alt="back" className="w-6 h-6 relative z-10" />
        </Link>

        {/* Header */}
        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{
              fontFamily: "Poppins, sans-serif",
              WebkitTextStroke: "1px #000",
            }}
          >
            profile
          </h1>
          <p
            className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]"
            style={{
              fontFamily: "Poppins, sans-serif",
              WebkitTextStroke: "0.4px #000",
            }}
          >
            version for masters
          </p>
        </div>

        {/* Заголовок раздела */}
        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black"> Прайс лист</h2>
          <div className="h-px bg-black w-52 mb-6" />

          {/* Категории */}
          <div className="flex flex-col gap-8">
            {categories.map((category) => (
                <div key={category.id} className="flex gap-3">
                {/* Повёрнутый заголовок категории с фиксированной шириной */}
                <div className="w-8 flex-shrink-0 flex items-stretch">
                    <span
                    className="text-[20px] font-['Sofia_Sans'] text-black whitespace-nowrap"
                    style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        textAlign: "center",
                    }}
                    >
                    {category.title}
                    </span>
                </div>

                {/* Розовая полоска */}
                <div className="w-[3px] flex-shrink-0 bg-pink-400 rounded-[34px] shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]" />

                {/* Список услуг */}
                <div className="flex-1 flex flex-col gap-4">
                    {category.services.map((service) => (
                    <div
                        key={service.id}
                        className="flex items-start justify-between gap-2"
                    >
                        <div className="flex-1">
                        <p className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black leading-tight">
                            {service.name}
                        </p>
                        <div className="flex items-center gap-20 text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black">
                            <span>{service.duration}</span>
                            <span>{service.price}</span>
                        </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                        <button
                            onClick={() => handleEditService(category.id, service.id)}
                            className="relative w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
                            aria-label="Изменить">
                            <div className="absolute w-11 h-11 left-[5px] top-[5px] bg-white rounded-[5Ыpx] blur-[20px] opacity-80" />
                            <img src={pencilIcon} alt="Изменить" className="w-6 h-6 relative z-10" />
                        </button>
                        <button
                            onClick={() => handleDeleteService(category.id, service.id)}
                            className="relative w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
                            aria-label="Удалить"
                            >
                            <div className="absolute w-11 h-11 left-[5px] top-[5px] bg-white rounded-[5px] blur-[20px] opacity-80" />
                            <img src={trashIcon} alt="Удалить" className="w-6 h-6 relative z-10" />
                        </button>
                        </div>
                    </div>
                    ))}
                </div>
                </div>
            ))}
            </div>
          {/* Кнопки внизу */}
          <div className="flex justify-between mt-8 gap-4">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="relative flex-1 bg-[#FFE9EF] rounded-[10px] py-3 px-4 flex items-center justify-center gap-2 shadow-sm"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              <Plus className="w-5 h-5 text-black" />
              <span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black">
                Добавить услугу
              </span>
            </button>
            <button
              onClick={handleUploadServices}
              className="relative flex-1 bg-[#FFE9EF] rounded-[10px] py-3 px-4 flex items-center justify-center gap-2 shadow-sm"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              <Download className="w-5 h-5 text-black" />
              <span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black">
                Загрузить услуги
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}