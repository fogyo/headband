import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Download, X } from "lucide-react";
import trashIcon from "@/assets/Trash.svg";
import pencilIcon from "@/assets/Pencil.svg";
import backIcon from "@/assets/back_icon.svg";
import loadingSpinner from "@/assets/loading.svg";
import { toast } from "sonner";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ---------- Типы ----------
interface CategoryFromApi {
  id: string;
  name: string;
}

interface ServiceFromApi {
  id: string;
  name: string;
  category: string;
  price: number;
  approximate_time: number;
}

interface ServiceItem {
  id: string;
  name: string;
  duration: string;
  price: string;
}

interface Category {
  id: string;
  title: string;
  services: ServiceItem[];
}

const formatDuration = (minutes: number): string => `~${minutes} мин`;
const formatPrice = (price: number): string => `${price} ₽`;

const groupServicesByCategory = (
  services: ServiceFromApi[],
  categories: CategoryFromApi[]
): Category[] => {
  const groups = new Map<string, ServiceItem[]>();
  services.forEach(service => {
    const catName = service.category;
    if (!groups.has(catName)) groups.set(catName, []);
    groups.get(catName)!.push({
      id: service.id,
      name: service.name,
      duration: formatDuration(service.approximate_time),
      price: formatPrice(service.price),
    });
  });
  const result: Category[] = [];
  for (const cat of categories) {
    const servicesInCat = groups.get(cat.name) || [];
    if (servicesInCat.length > 0) {
      result.push({ id: cat.id, title: cat.name, services: servicesInCat });
    }
  }
  return result;
};

// ---------- Функция загрузки файла в S3 ----------
async function uploadFileToS3(file: File): Promise<string> {
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

export default function ProfilePriceListPage() {
  const STATIC_CHAT_ID = 980609742;

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesOptions, setCategoriesOptions] = useState<CategoryFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<{ categoryId: string; serviceId: string } | null>(null);
  const [newService, setNewService] = useState({ name: "", categoryId: "", duration: "", price: "" });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Остановка опроса
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setUploading(false);
  };

  // Опрос статуса задачи
  const pollTaskStatus = async (taskId: string) => {
    try {
      const res = await fetch(`${baseUrl}/admins/task?task_id=${taskId}`);
      if (!res.ok) {
        throw new Error("Ошибка получения статуса задачи");
      }
      const data = await res.json();

      if (data.status === "pending") {
        // продолжаем ожидать
        return;
      }

      // Задача завершена
      stopPolling();

      if (data.status === "success") {
        toast.success("Прайс успешно загружен и обработан");
        await loadData(); // перезагружаем данные
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setTaskId(null);
      } else {
        // failed
        toast.error(data.error || "Ошибка обработки файла");
        setTaskId(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка при проверке статуса");
      stopPolling();
      setTaskId(null);
    }
  };

  const startPolling = (taskId: string) => {
    setTaskId(taskId);
    setUploading(true);
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = setInterval(() => {
      pollTaskStatus(taskId);
    }, 2000); // опрашиваем каждые 2 секунды
  };

  // Очистка интервала при размонтировании
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const fetchCategories = async (): Promise<CategoryFromApi[]> => {
    const res = await fetch(`${baseUrl}/master/profile/prices/categories`);
    if (!res.ok) throw new Error("Ошибка загрузки категорий");
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.status);
    return data.categories;
  };

  const fetchPrices = async (): Promise<ServiceFromApi[]> => {
    const res = await fetch(`${baseUrl}/master/profile/prices/prices?chat_id=${STATIC_CHAT_ID}`);
    if (!res.ok) throw new Error("Ошибка загрузки услуг");
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.status);
    return data.prices;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const cats = await fetchCategories();
      const uniqueCats = Array.from(new Map(cats.map(cat => [cat.id, cat])).values());
      setCategoriesOptions(uniqueCats);
      const services = await fetchPrices();
      const grouped = groupServicesByCategory(services, uniqueCats);
      setCategories(grouped);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Не удалось загрузить прайс-лист");
      toast.error("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (categoriesOptions.length > 0 && !newService.categoryId) {
      setNewService(prev => ({ ...prev, categoryId: categoriesOptions[0].id }));
    }
  }, [categoriesOptions]);

  const createService = async (data: { category_id: string; name: string; approximate_time: number; price: number }) => {
    const res = await fetch(`${baseUrl}/master/profile/prices/create_price?chat_id=${STATIC_CHAT_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorText = await res.text();
      let errorMsg = "Ошибка создания услуги";
      try {
        const parsed = JSON.parse(errorText);
        errorMsg = parsed.detail || JSON.stringify(parsed);
      } catch (e) {
        errorMsg = errorText;
      }
      throw new Error(errorMsg);
    }
    const result = await res.json();
    if (result.status !== "success") throw new Error(result.status);
    return result.id;
  };

  const updateService = async (id: string, data: Partial<{ name: string; price: number; category_id: string; approximate_time: number }>) => {
    const res = await fetch(`${baseUrl}/master/profile/prices/?chat_id=${STATIC_CHAT_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Ошибка обновления");
    }
    const result = await res.json();
    if (result.status !== "success") throw new Error(result.status);
  };

  const deleteServiceApi = async (priceId: string) => {
    const res = await fetch(`${baseUrl}/master/profile/prices/${priceId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Ошибка удаления");
    }
    const result = await res.json();
    if (result.status !== "success") throw new Error(result.status);
  };

  const handleAddService = async () => {
    if (!newService.name || !newService.duration || !newService.price) {
      toast.warning("Заполните все поля");
      return;
    }
    const durationNum = parseInt(newService.duration, 10);
    const priceNum = parseInt(newService.price, 10);
    if (isNaN(durationNum) || isNaN(priceNum)) {
      toast.warning("Длительность и цена должны быть числами");
      return;
    }
    try {
      if (editingService) {
        await updateService(editingService.serviceId, {
          name: newService.name,
          price: priceNum,
          approximate_time: durationNum,
          category_id: newService.categoryId,
        });
      } else {
        await createService({
          category_id: newService.categoryId,
          name: newService.name,
          approximate_time: durationNum,
          price: priceNum,
        });
      }
      await loadData();
      toast.success(editingService ? "Услуга изменена" : "Услуга добавлена");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка сохранения");
    } finally {
      setIsAddModalOpen(false);
      setEditingService(null);
      setNewService({ name: "", categoryId: categoriesOptions[0]?.id || "", duration: "", price: "" });
    }
  };

  const handleDeleteService = async (categoryId: string, serviceId: string) => {
    if (!window.confirm("Удалить эту услугу? Все записи по этой услуге будут удалены")) return;
    try {
      await deleteServiceApi(serviceId);
      toast.success("Услуга удалена");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Ошибка удаления");
    }
  };

  const handleEditService = (categoryId: string, serviceId: string) => {
    const category = categories.find(c => c.id === categoryId);
    const service = category?.services.find(s => s.id === serviceId);
    if (!service) return;
    const durationMatch = service.duration.match(/\d+/);
    const durationNum = durationMatch ? durationMatch[0] : "";
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

  const handleSendFile = async () => {
    if (!uploadFile) {
      toast.warning("Выберите файл");
      return;
    }
    try {
      const fileKey = await uploadFileToS3(uploadFile);
      const res = await fetch(`${baseUrl}/master/profile/prices/upload_price_file/?chat_id=${STATIC_CHAT_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filepath: fileKey }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Ошибка обработки файла");
      }
      const data = await res.json();
      if (data.status !== "processing") {
        throw new Error("Неожиданный статус ответа");
      }
      // Запускаем опрос
      startPolling(data.task);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка загрузки");
      setUploading(false);
    }
  };

  const handleUploadServices = () => setIsUploadModalOpen(true);

  if (loading) return <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center"><p className="text-black font-['Sofia_Sans']">Загрузка...</p></div>;
  if (error) return <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center"><p className="text-red-500 font-['Sofia_Sans']">{error}</p></div>;

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      {/* Модалка загрузки файла */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => {
              if (!uploading) {
                setIsUploadModalOpen(false);
                setUploadFile(null);
                if (taskId) stopPolling();
              }
            }}
          />
          <div className="relative bg-[#FFE9EF] rounded-[20px] w-72 p-6 shadow-xl">
            <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center">
              {uploading ? "Загрузка прайс-листа" : "Добавление услуг"}
            </h3>
            <div className="h-px bg-black w-60 mx-auto mt-2 mb-4" />

            {uploading ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <img src={loadingSpinner} alt="Загрузка..." className="w-12 h-12" />
                <p className="text-[16px] font-['Sofia_Sans'] text-black text-center leading-tight">
                  Ваш прайс-лист загружается,<br />пожалуйста, подождите
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  <label
                    className="relative bg-[#FFE9EF] rounded-[10px] h-44 shadow flex flex-col items-center justify-center cursor-pointer"
                    style={{
                      border: "0.5px solid rgba(0,0,0,0.00)",
                      boxShadow:
                        "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                    }}
                  >
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
                  <button
                    onClick={handleSendFile}
                    disabled={uploading}
                    className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow w-full flex items-center justify-center"
                    style={{
                      border: "0.5px solid rgba(0,0,0,0.00)",
                      boxShadow:
                        "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                    }}
                  >
                    {uploading ? (
                      <img src={loadingSpinner} alt="Загрузка..." className="w-5 h-5" />
                    ) : (
                      <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                        Отправить картинку
                      </span>
                    )}
                  </button>
                </div>
              </>
            )}

            {!uploading && (
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadFile(null);
                  if (taskId) stopPolling();
                }}
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-black/50" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Модалка добавления/редактирования услуги (без изменений) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-[#FFE9EF] rounded-[20px] w-72 p-6 shadow-xl">
            <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center">{editingService ? "Изменение услуги" : "Добавление услуги"}</h3>
            <div className="h-px bg-black w-60 mx-auto mt-2 mb-4" />
            <div className="flex flex-col gap-4">
              <div className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
                <input type="text" placeholder="Название услуги" value={newService.name} onChange={e => setNewService(prev => ({ ...prev, name: e.target.value }))} className="w-full h-full bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50" />
              </div>
              <div className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow flex items-center px-2" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
                <select value={newService.categoryId} onChange={e => setNewService(prev => ({ ...prev, categoryId: e.target.value }))} className="flex-1 bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center">
                  {categoriesOptions.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow flex-1" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
                  <input type="number" min="1" placeholder="Длительность (мин)" value={newService.duration} onChange={e => setNewService(prev => ({ ...prev, duration: e.target.value }))} className="w-full h-full bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50" />
                </div>
                <div className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow flex-1" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
                  <input type="text" placeholder="Цена (рубли)" value={newService.price} onChange={e => setNewService(prev => ({ ...prev, price: e.target.value }))} className="w-full h-full bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50" />
                </div>
              </div>
              <button onClick={handleAddService} className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow w-full" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
                <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">{editingService ? "Изменить услугу" : "Добавить услугу"}</span>
              </button>
            </div>
            <button onClick={() => { setIsAddModalOpen(false); setEditingService(null); setNewService({ name: "", categoryId: categoriesOptions[0]?.id || "", duration: "", price: "" }); }} className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center"><X className="w-4 h-4 text-black/50" /></button>
          </div>
        </div>
      )}

      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        <Link to="/profile" className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]">
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIcon} alt="back" className="w-6 h-6 relative z-10" />
        </Link>

        <div className="pt-8 pb-2">
          <h1 className="text-[40px] leading-tight tracking-[3.2px] text-transparent" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}>profile</h1>
          <p className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "0.4px #000" }}>version for masters</p>
        </div>

        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Прайс лист</h2>
          <div className="h-px bg-black w-52 mb-6" />
          <div className="flex flex-col gap-8">
            {categories.map((category) => (
              <div key={category.id} className="flex gap-3">
                <div className="w-8 flex-shrink-0 flex items-stretch">
                  <span className="text-[20px] font-['Sofia_Sans'] text-black whitespace-nowrap" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", textAlign: "center" }}>{category.title}</span>
                </div>
                <div className="w-[3px] flex-shrink-0 bg-pink-400 rounded-[34px] shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]" />
                <div className="flex-1 flex flex-col gap-4">
                  {category.services.map((service) => (
                    <div key={service.id} className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black leading-tight">{service.name}</p>
                        <div className="flex items-center gap-20 text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black"><span>{service.duration}</span><span>{service.price}</span></div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleEditService(category.id, service.id)} className="relative w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]" aria-label="Изменить">
                          <div className="absolute w-11 h-11 left-[5px] top-[5px] bg-white rounded-[5px] blur-[20px] opacity-80" />
                          <img src={pencilIcon} alt="Изменить" className="w-6 h-6 relative z-10" />
                        </button>
                        <button onClick={() => handleDeleteService(category.id, service.id)} className="relative w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]" aria-label="Удалить">
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
          <div className="flex justify-between mt-8 gap-4">
            <button onClick={() => setIsAddModalOpen(true)} className="relative flex-1 bg-[#FFE9EF] rounded-[10px] py-3 px-4 flex items-center justify-center gap-2 shadow-sm" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
              <Plus className="w-5 h-5 text-black" /><span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black">Добавить услугу</span>
            </button>
            <button onClick={handleUploadServices} className="relative flex-1 bg-[#FFE9EF] rounded-[10px] py-3 px-4 flex items-center justify-center gap-2 shadow-sm" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
              <Download className="w-5 h-5 text-black" /><span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black">Загрузить услуги</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}