import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTelegramAuth } from "@/App";
import { toast } from "sonner";
import { X, Plus, Trash2 } from "lucide-react";
import homeIconUrl from "@/assets/home.svg";
import backIconSrc from "@/assets/back_icon.svg";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ---------- Типы ----------
interface Category {
  id: string;
  name: string;
  parental_name: string;
  eng_name: string;
}

interface HaircutTemplate {
  id: string;
  gender: boolean;
  name: string;
  description: string;
  face_type_recommendations: string;
  hair_type_recommendations: string;
  jawline: string;
  forehead_height: string;
  cheekbones: string;
  neck_length: string;
  img_url: string;
}

interface FaceHairTemplate {
  id: string;
  name: string;
  description: string;
  face_shape_recommendations: string;
  facial_features_recommendations: string;
  hair_color_recommendations: string;
  img_url: string;
}

interface ColorTemplate {
  id: string;
  name: string;
  hex: string;
  skin_temperature: string;
  contrast: string;
  eye_color: string;
  skin_condition: string;
}

interface PermsTemplate {
  id: string;
  name: string;
  img_url: string;
  description: string;
}

interface CityTemplate {
  id: string;
  location: string; // WKT
  city: string;
}

interface MetroTemplate {
  id: string;
  name: string;
  hex: string;
  location: string;
  city_id: string;
}

// ---------- Компонент для отображения списка шаблонов ----------
interface TemplateListProps<T> {
  title: string;
  items: T[];
  loading: boolean;
  onDelete: (id: string) => void;
  onAdd: () => void;
  renderItem: (item: T) => React.ReactNode;
  renderAddButton?: () => React.ReactNode;
}

function TemplateList<T>({
  title,
  items,
  loading,
  onDelete,
  onAdd,
  renderItem,
}: TemplateListProps<T>) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[20px] tracking-[-1px] font-['Sofia_Sans'] text-black">
          {title}
        </h3>
        <button
          onClick={onAdd}
          className="relative bg-[#FFE9EF] rounded-[10px] py-1.5 px-4 shadow-sm text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black flex items-center gap-1"
          style={{
            border: "0.5px solid rgba(0,0,0,0.00)",
            boxShadow:
              "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Добавить</span>
        </button>
      </div>
      <div
        className="relative bg-white rounded-[10px] p-3 shadow-inner overflow-y-auto"
        style={{
          boxShadow: "inset 4px 4px 4px rgba(0, 0, 0, 0.25)",
          maxHeight: "300px",
        }}
      >
        {loading ? (
          <p className="text-black/50 text-center font-['Sofia_Sans']">Загрузка...</p>
        ) : items.length === 0 ? (
          <p className="text-black/50 text-center font-['Sofia_Sans']">Нет записей</p>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-1.5 border-b border-black/5 last:border-0"
              >
                <div className="flex-1 min-w-0">{renderItem(item)}</div>
                <button
                  onClick={() => onDelete((item as any).id)}
                  className="text-black/50 hover:text-red-500 transition flex-shrink-0 ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Основная страница ----------
export default function AdminTemplatesPage() {
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  // Состояния для всех типов
  const [categories, setCategories] = useState<Category[]>([]);
  const [haircuts, setHaircuts] = useState<HaircutTemplate[]>([]);
  const [faceHairs, setFaceHairs] = useState<FaceHairTemplate[]>([]);
  const [colors, setColors] = useState<ColorTemplate[]>([]);
  const [perms, setPerms] = useState<PermsTemplate[]>([]);
  const [cities, setCities] = useState<CityTemplate[]>([]);
  const [metros, setMetros] = useState<MetroTemplate[]>([]);
  const [citiesMap, setCitiesMap] = useState<Map<string, string>>(new Map());

  const [loading, setLoading] = useState(true);

  // Модальное окно создания
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Загрузка всех данных
  const fetchData = async () => {
    try {
      const [
        categoriesRes,
        haircutsRes,
        faceHairsRes,
        colorsRes,
        permsRes,
        citiesRes,
        metrosRes,
      ] = await Promise.all([
        fetch(`${baseUrl}/admins/templates/category_list`),
        fetch(`${baseUrl}/admins/templates/haircut_template_list`),
        fetch(`${baseUrl}/admins/templates/face_hair_template_list`),
        fetch(`${baseUrl}/admins/templates/color_template_list`),
        fetch(`${baseUrl}/admins/templates/perms_template_list`),
        fetch(`${baseUrl}/admins/templates/city_template_list`),
        fetch(`${baseUrl}/admins/templates/metro_template_list`),
      ]);

      const [categoriesData, haircutsData, faceHairsData, colorsData, permsData, citiesData, metrosData] =
        await Promise.all([
          categoriesRes.json(),
          haircutsRes.json(),
          faceHairsRes.json(),
          colorsRes.json(),
          permsRes.json(),
          citiesRes.json(),
          metrosRes.json(),
        ]);

      if (categoriesData.status === "success") setCategories(categoriesData.categories || []);
      if (haircutsData.status === "success") setHaircuts(haircutsData.haircuts || []);
      if (faceHairsData.status === "success") setFaceHairs(faceHairsData.face_hair_templates || []);
      if (colorsData.status === "success") setColors(colorsData.color_templates || []);
      if (permsData.status === "success") setPerms(permsData.perms_templates || []);
      if (citiesData.status === "success") setCities(citiesData.city_templates || []);

      // Строим маппинг городов
      const map = new Map<string, string>();
      if (citiesData.status === "success" && citiesData.city_templates) {
        citiesData.city_templates.forEach((city: CityTemplate) => {
          map.set(city.id, city.city);
        });
      }
      setCitiesMap(map);

      if (metrosData.status === "success") setMetros(metrosData.metro_templates || []);
    } catch (err) {
      console.error(err);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!chatId || !isVerified) return;
    fetchData();
  }, [chatId, isVerified]);

  // Универсальное удаление
  const handleDelete = async (url: string, id: string) => {
    if (!window.confirm("Удалить запись?")) return;
    try {
      const res = await fetch(`${baseUrl}${url}?template_id=${id}&chat_id=${chatId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status || "Ошибка удаления");
      toast.success("Запись удалена");
      await fetchData(); // перезагружаем все данные
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось удалить");
    }
  };

  // Открытие модалки для создания
  const openCreateModal = (type: string) => {
    setModalType(type);
    setFormData({});
    setIsModalOpen(true);
  };

  // Отправка создания
  const handleCreate = async () => {
    try {
      let url = "";
      let payload = formData;
      switch (modalType) {
        case "category":
          url = `/admins/templates/category_create?chat_id=${chatId}`;
          payload = {
            name: formData.name,
            parental_name: formData.parental_name,
            eng_name: formData.eng_name,
          };
          break;
        case "haircut":
          url = `/admins/templates/haircut_template_create?chat_id=${chatId}`;
          payload = {
            gender: formData.gender === "true",
            name: formData.name,
            description: formData.description,
            face_type_recommendations: formData.face_type_recommendations,
            hair_type_recommendations: formData.hair_type_recommendations,
            jawline: formData.jawline,
            forehead_height: formData.forehead_height,
            cheekbones: formData.cheekbones,
            neck_length: formData.neck_length,
            img_url: formData.img_url,
          };
          break;
        case "face_hair":
          url = `/admins/templates/face_hair_template_create?chat_id=${chatId}`;
          payload = {
            name: formData.name,
            description: formData.description,
            face_shape_recommendations: formData.face_shape_recommendations,
            facial_features_recommendations: formData.facial_features_recommendations,
            hair_color_recommendations: formData.hair_color_recommendations,
            img_url: formData.img_url,
          };
          break;
        case "color":
          url = `/admins/templates/color_template_create?chat_id=${chatId}`;
          payload = {
            name: formData.name,
            hex: formData.hex,
            skin_temperature: formData.skin_temperature,
            contrast: formData.contrast,
            eye_color: formData.eye_color,
            skin_condition: formData.skin_condition,
          };
          break;
        case "perms":
          url = `/admins/templates/perms_template_create?chat_id=${chatId}`;
          payload = {
            name: formData.name,
            img_url: formData.img_url,
            description: formData.description,
          };
          break;
        case "city":
          url = `/admins/templates/city_template_create?chat_id=${chatId}`;
          payload = {
            location: formData.location,
            city: formData.city,
          };
          break;
        case "metro":
          url = `/admins/templates/metro_template_create?chat_id=${chatId}`;
          payload = {
            name: formData.name,
            hex: formData.hex,
            location: formData.location,
            city_id: formData.city_id,
          };
          break;
        default:
          return;
      }
      const res = await fetch(`${baseUrl}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status || "Ошибка создания");
      toast.success("Запись создана");
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось создать");
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

  // Рендер полей для модалки в зависимости от типа
  const renderModalFields = () => {
    switch (modalType) {
      case "category":
        return (
          <>
            <inputField label="Название" field="name" />
            <inputField label="Родительская категория" field="parental_name" />
            <inputField label="Английское название" field="eng_name" />
          </>
        );
      case "haircut":
        return (
          <>
            <selectField label="Пол" field="gender" options={["true", "false"]} labels={["Мужской", "Женский"]} />
            <inputField label="Название" field="name" />
            <inputField label="Описание" field="description" />
            <inputField label="Рекомендации по типу лица" field="face_type_recommendations" />
            <inputField label="Рекомендации по типу волос" field="hair_type_recommendations" />
            <inputField label="Линия челюсти" field="jawline" />
            <inputField label="Высота лба" field="forehead_height" />
            <inputField label="Скулы" field="cheekbones" />
            <inputField label="Длина шеи" field="neck_length" />
            <inputField label="URL изображения" field="img_url" />
          </>
        );
      case "face_hair":
        return (
          <>
            <inputField label="Название" field="name" />
            <inputField label="Описание" field="description" />
            <inputField label="Рекомендации по форме лица" field="face_shape_recommendations" />
            <inputField label="Рекомендации по чертам лица" field="facial_features_recommendations" />
            <inputField label="Рекомендации по цвету волос" field="hair_color_recommendations" />
            <inputField label="URL изображения" field="img_url" />
          </>
        );
      case "color":
        return (
          <>
            <inputField label="Название" field="name" />
            <inputField label="HEX-код" field="hex" />
            <inputField label="Температура кожи" field="skin_temperature" />
            <inputField label="Контраст" field="contrast" />
            <inputField label="Цвет глаз" field="eye_color" />
            <inputField label="Состояние кожи" field="skin_condition" />
          </>
        );
      case "perms":
        return (
          <>
            <inputField label="Название" field="name" />
            <inputField label="URL изображения" field="img_url" />
            <inputField label="Описание" field="description" />
          </>
        );
      case "city":
        return (
          <>
            <inputField label="Город" field="city" />
            <inputField label="Location (WKT)" field="location" />
          </>
        );
      case "metro":
        return (
          <>
            <inputField label="Название" field="name" />
            <inputField label="Цвет (HEX)" field="hex" />
            <inputField label="Location (WKT)" field="location" />
            <selectField
              label="Город"
              field="city_id"
              options={cities.map((c) => c.id)}
              labels={cities.map((c) => c.city)}
            />
          </>
        );
      default:
        return <p>Неизвестный тип</p>;
    }
  };

  // Вспомогательные компоненты для полей
  const inputField = ({ label, field }: { label: string; field: string }) => (
    <div className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow flex items-center px-3" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
      <input
        type="text"
        placeholder={label}
        value={formData[field] || ""}
        onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
        className="w-full bg-transparent text-[16px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50"
      />
    </div>
  );

  const selectField = ({ label, field, options, labels }: { label: string; field: string; options: string[]; labels: string[] }) => (
    <div className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow flex items-center px-3" style={{ border: "0.5px solid rgba(0,0,0,0.00)", boxShadow: "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)" }}>
      <select
        value={formData[field] || ""}
        onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
        className="w-full bg-transparent text-[16px] font-['Sofia_Sans'] text-black outline-none text-center"
      >
        <option value="">{label}</option>
        {options.map((opt, idx) => (
          <option key={idx} value={opt}>{labels[idx]}</option>
        ))}
      </select>
    </div>
  );

  // Рендер элементов для каждого типа
  const renderItem = {
    category: (item: Category) => (
      <span className="text-[14px] font-['Sofia_Sans'] text-black">{item.name} ({item.parental_name})</span>
    ),
    haircut: (item: HaircutTemplate) => (
      <span className="text-[14px] font-['Sofia_Sans'] text-black">{item.name} {item.gender ? "(М)" : "(Ж)"}</span>
    ),
    face_hair: (item: FaceHairTemplate) => (
      <span className="text-[14px] font-['Sofia_Sans'] text-black">{item.name}</span>
    ),
    color: (item: ColorTemplate) => (
      <span className="text-[14px] font-['Sofia_Sans'] text-black">{item.name} ({item.hex})</span>
    ),
    perms: (item: PermsTemplate) => (
      <span className="text-[14px] font-['Sofia_Sans'] text-black">{item.name}</span>
    ),
    city: (item: CityTemplate) => (
      <span className="text-[14px] font-['Sofia_Sans'] text-black">{item.city}</span>
    ),
    metro: (item: MetroTemplate) => {
      const cityName = citiesMap.get(item.city_id) || item.city_id;
      return (
        <span className="text-[14px] font-['Sofia_Sans'] text-black">
          {item.name} ({cityName})
        </span>
      );
    },
  };

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        <Link
          to="/admin"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIconSrc} alt="back" className="w-6 h-6 relative z-10" />
        </Link>

        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}
          >
            templates
          </h1>
          <p
            className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "0.4px #000" }}
          >
            version for admins
          </p>
        </div>

        <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black mt-6">Управление шаблонами</h2>
        <div className="h-px bg-black w-32 mb-4" />

        {/* Блоки для каждого типа */}
        <TemplateList
          title="Категории"
          items={categories}
          loading={loading}
          onDelete={(id) => handleDelete("/admins/templates/category_delete", id)}
          onAdd={() => openCreateModal("category")}
          renderItem={renderItem.category}
        />
        <TemplateList
          title="Стрижки (haircut)"
          items={haircuts}
          loading={loading}
          onDelete={(id) => handleDelete("/admins/templates/haircut_template_delete", id)}
          onAdd={() => openCreateModal("haircut")}
          renderItem={renderItem.haircut}
        />
        <TemplateList
          title="Борода и усы (face_hair)"
          items={faceHairs}
          loading={loading}
          onDelete={(id) => handleDelete("/admins/templates/face_hair_template_delete", id)}
          onAdd={() => openCreateModal("face_hair")}
          renderItem={renderItem.face_hair}
        />
        <TemplateList
          title="Цвета (color)"
          items={colors}
          loading={loading}
          onDelete={(id) => handleDelete("/admins/templates/color_template_delete", id)}
          onAdd={() => openCreateModal("color")}
          renderItem={renderItem.color}
        />
        <TemplateList
          title="Завивки (perms)"
          items={perms}
          loading={loading}
          onDelete={(id) => handleDelete("/admins/templates/perms_template_delete", id)}
          onAdd={() => openCreateModal("perms")}
          renderItem={renderItem.perms}
        />
        <TemplateList
          title="Города"
          items={cities}
          loading={loading}
          onDelete={(id) => handleDelete("/admins/templates/city_template_delete", id)}
          onAdd={() => openCreateModal("city")}
          renderItem={renderItem.city}
        />
        <TemplateList
          title="Метро"
          items={metros}
          loading={loading}
          onDelete={(id) => handleDelete("/admins/templates/metro_template_delete", id)}
          onAdd={() => openCreateModal("metro")}
          renderItem={renderItem.metro}
        />
      </div>

      {/* Модальное окно создания */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div
            className="relative bg-[#FFE9EF] rounded-[20px] w-full max-w-sm max-h-[90vh] overflow-y-auto p-6 shadow-xl"
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
              Создать {modalType.replace("_", " ")}
            </h3>
            <div className="h-px bg-black w-60 mx-auto mt-2 mb-4" />

            <div className="flex flex-col gap-4">
              {renderModalFields()}
              <button
                onClick={handleCreate}
                className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow w-full flex items-center justify-center"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">Создать</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}