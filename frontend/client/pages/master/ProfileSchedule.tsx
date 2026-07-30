import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, X } from "lucide-react";
import trashIcon from "@/assets/Trash.svg";
import backIcon from "@/assets/back_icon.svg";
import pinIcon from "@/assets/pinIcon.png";
import { toast } from "sonner";
import { useTelegramAuth } from "@/App";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ---------- Типы ----------
interface Address {
  id: string;
  address: string;
  full_address: string;
  location: string; // "POINT(lng lat)"
}

interface City {
  id: string;
  city: string;
  location: string; // "POINT(lng lat)"
}

interface WeekTemplateItem {
  weekday: number;
  start_time: string;
  end_time: string;
  address_id: string;
}

interface WeekTemplateResp extends WeekTemplateItem {
  id: string;
  address: string;
}

interface DayScheduleUI {
  dayOff: boolean;
  startTime: string;
  endTime: string;
  addressId: string;
}

interface Absence {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

// Вспомогательные функции
const formatDateToDDMM = (dateStr: string): string => {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}`;
};

const parseDDMMToDate = (ddmm: string): string => {
  const [day, month] = ddmm.split(".");
  const year = new Date().getFullYear();
  return `${year}-${month}-${day}`;
};

const toTimeWithSeconds = (hm: string): string => {
  const [hours, minutes] = hm.split(":");
  const paddedHours = hours.padStart(2, "0");
  return `${paddedHours}:${minutes}:00`;
};

const toHHMM = (timeWithSec: string): string => timeWithSec.slice(0, 5);

const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

// Парсинг WKT "POINT(lng lat)" → [lat, lng]
const parseWktPoint = (wkt: string): [number, number] | null => {
  const match = wkt.match(/POINT\s*\(([\d.]+)\s+([\d.]+)\)/);
  if (!match) return null;
  const lng = parseFloat(match[1]);
  const lat = parseFloat(match[2]);
  return [lat, lng];
};

// ---------- Компоненты ----------
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={`relative w-10 h-5 rounded-[5px] text-[12px] tracking-[-0.6px] font-bold font-['Sofia_Sans'] ${
      checked
        ? "bg-[#7FD1AE]/60 text-black/50 shadow-[inset_4px_4px_4px_0px_rgba(0,0,0,0.25)]"
        : "bg-[#FA4F96]/60 text-white/60 shadow-[2px_2px_7px_0px_rgba(0,0,0,0.10),9px_10px_13px_0px_rgba(0,0,0,0.09),20px_22px_18px_0px_rgba(0,0,0,0.05),36px_38px_21px_0px_rgba(0,0,0,0.01),57px_60px_23px_0px_rgba(0,0,0,0.00)]"
    }`}
  >
    {checked ? "on" : "off"}
  </button>
);

const DatePicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const toInputValue = (ddmm: string): string => {
    if (!ddmm) return "";
    const parts = ddmm.split(".");
    if (parts.length !== 2) return "";
    const [day, month] = parts;
    if (!day || !month) return "";
    if (isNaN(Number(day)) || isNaN(Number(month))) return "";
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  };

  const fromInputValue = (iso: string): string => {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length !== 3) return "";
    const [, month, day] = parts;
    if (!day || !month) return "";
    return `${day}.${month}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIso = e.target.value;
    if (newIso) onChange(fromInputValue(newIso));
    else onChange("");
  };

  const inputValue = toInputValue(value);

  return (
    <div
      className="bg-[#FFE9EF] rounded-[5px] h-7 flex items-center justify-center w-full"
      style={{
        boxShadow:
          "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
      }}
    >
      <input
        type="date"
        value={inputValue}
        onChange={handleChange}
        className="bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center w-full px-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:p-0"
        style={{ fontFamily: "'Sofia Sans', sans-serif" }}
      />
    </div>
  );
};

const TimeInput = ({
  value,
  onChange,
  className,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
}) => {
  const toInputFormat = (val: string): string => {
    if (!val) return "";
    const [hours, minutes] = val.split(":");
    if (hours && minutes) {
      return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
    }
    return val;
  };

  const fromInputFormat = (val: string): string => {
    if (!val) return "";
    const [hours, minutes] = val.split(":");
    if (hours && minutes) {
      return `${parseInt(hours, 10)}:${minutes}`;
    }
    return val;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(fromInputFormat(e.target.value));
  };

  const inputValue = toInputFormat(value);

  return (
    <div
      className={`${className} bg-[#FFE9EF] rounded-[5px] h-7 flex items-center justify-center ${
        disabled ? "opacity-50" : ""
      }`}
      style={{
        boxShadow:
          "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
      }}
    >
      <input
        type="time"
        value={inputValue}
        onChange={handleChange}
        disabled={disabled}
        className="bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center w-full px-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-inner-spin-button]:hidden"
        step="60"
      />
    </div>
  );
};

const AddressSelect = ({
  value,
  addresses,
  onChange,
  className,
  disabled = false,
}: {
  value: string;
  addresses: Address[];
  onChange: (addressId: string) => void;
  className?: string;
  disabled?: boolean;
}) => {
  return (
    <div
      className={`${className} bg-[#FFE9EF] rounded-[5px] h-7 flex items-center ${
        disabled ? "opacity-50" : ""
      }`}
      style={{
        boxShadow:
          "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
      }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full h-full bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none truncate px-1 py-0 leading-none text-center appearance-none disabled:text-gray-400"
      >
        {addresses.map((addr) => (
          <option key={addr.id} value={addr.id}>
            {addr.full_address || addr.address}
          </option>
        ))}
      </select>
    </div>
  );
};

// ---------- Компонент AddressModal (без карты) ----------
interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingAddress: Address | null;
  chatId: number;
}

function AddressModal({ isOpen, onClose, onSaved, editingAddress, chatId }: AddressModalProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedFullAddress, setSelectedFullAddress] = useState<string>("");
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Загрузка городов
  useEffect(() => {
    if (!isOpen) return;
    const loadCities = async () => {
      setLoadingCities(true);
      try {
        const res = await fetch(`${baseUrl}/master/profile/schedule/cities`);
        if (!res.ok) throw new Error("Ошибка загрузки городов");
        const data = await res.json();
        if (data.status === "success") {
          setCities(data.cities);
          if (data.cities.length > 0) {
            setSelectedCityId(data.cities[0].id);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Не удалось загрузить города");
      } finally {
        setLoadingCities(false);
      }
    };
    loadCities();
  }, [isOpen]);

  // Если редактируем – заполняем данные
  useEffect(() => {
    if (!isOpen) return;
    if (editingAddress) {
      const coords = parseWktPoint(editingAddress.location);
      if (coords) {
        setSelectedPosition(coords);
        setSearchQuery(editingAddress.full_address || editingAddress.address);
        setSelectedAddress(editingAddress.address);
        setSelectedFullAddress(editingAddress.full_address || editingAddress.address);
      } else {
        setSelectedPosition(null);
        setSearchQuery("");
        setSelectedAddress("");
        setSelectedFullAddress("");
      }
    } else {
      setSelectedPosition(null);
      setSearchQuery("");
      setSelectedAddress("");
      setSelectedFullAddress("");
    }
  }, [isOpen, editingAddress]);

  // Поиск адресов через Nominatim с заголовками
  const searchAddress = useCallback(async (query: string, cityId?: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const city = cities.find(c => c.id === cityId);
      const cityName = city ? city.city : "";
      // Формируем запрос: добавляем город, если он выбран, чтобы сузить поиск
      let searchQueryStr = query;
      if (cityName) {
        searchQueryStr = `${query}, ${cityName}`;
      }
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQueryStr)}&limit=10&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'headband v1',
          'Accept-Language': 'ru',
        },
      });
      
      if (!response.ok) {
        // Если ошибка, пробуем без города
        if (cityName) {
          const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1`;
          const fallbackResponse = await fetch(fallbackUrl, {
            headers: {
              'User-Agent': 'headband v1',
              'Accept-Language': 'ru',
            },
          });
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            setSearchResults(data);
            return;
          }
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setSearchResults(data);
    } catch (err: any) {
      console.error(err);
      toast.error("Не удалось выполнить поиск адреса");
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  }, [cities]);

  // Debounce для поиска
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (searchQuery) {
        searchAddress(searchQuery, selectedCityId);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, selectedCityId, searchAddress]);

  // Выбор адреса из результатов
  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSelectedPosition([lat, lng]);
    setSearchQuery(result.display_name);
    setSelectedAddress(result.display_name.split(",")[0] || result.display_name);
    setSelectedFullAddress(result.display_name);
    setSearchResults([]);
  };

  // Сохранение
  const handleSave = async () => {
    if (!selectedPosition) {
      toast.warning("Выберите адрес из списка");
      return;
    }
    if (!selectedAddress.trim()) {
      toast.warning("Введите адрес");
      return;
    }
    if (!selectedCityId) {
      toast.warning("Выберите город");
      return;
    }
    const [lat, lng] = selectedPosition;
    setIsSaving(true);
    try {
      if (editingAddress) {
        const payload = {
          id: editingAddress.id,
          address: selectedAddress,
          full_address: selectedFullAddress,
          lat: lat.toString(),
          long: lng.toString(),
        };
        const res = await fetch(`${baseUrl}/master/profile/schedule/addresses/update`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Ошибка обновления");
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);
        toast.success("Адрес обновлён");
      } else {
        const payload = {
          address: selectedAddress,
          full_address: selectedFullAddress,
          lat: lat.toString(),
          long: lng.toString(),
        };
        const res = await fetch(`${baseUrl}/master/profile/schedule/create_address?chat_id=${chatId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Ошибка создания");
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);
        toast.success("Адрес создан");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div
        className="relative bg-[#FFE9EF] rounded-[20px] w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-xl"
        style={{
          boxShadow:
            "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-black/50 hover:text-black"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center mb-4">
          {editingAddress ? "Редактирование адреса" : "Добавление адреса"}
        </h3>
        <div className="flex flex-col gap-4">
          {/* Город */}
          <div>
            <label className="text-[14px] font-['Sofia_Sans'] text-black/70">Город</label>
            <div
              className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow flex items-center px-2"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              <select
                value={selectedCityId}
                onChange={(e) => setSelectedCityId(e.target.value)}
                className="flex-1 bg-transparent text-[16px] font-['Sofia_Sans'] text-black outline-none text-center"
                disabled={loadingCities}
              >
                {loadingCities && <option value="">Загрузка...</option>}
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Поиск адреса */}
          <div>
            <label className="text-[14px] font-['Sofia_Sans'] text-black/70">Адрес</label>
            <div
              className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow flex items-center px-2"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              <input
                type="text"
                placeholder="Введите адрес..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[16px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50"
              />
              {loadingSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              )}
            </div>
            {searchResults.length > 0 && (
              <ul className="mt-1 bg-white rounded-[10px] shadow-lg max-h-40 overflow-y-auto border border-black/10">
                {searchResults.map((result, idx) => (
                  <li
                    key={idx}
                    onClick={() => selectSearchResult(result)}
                    className="px-3 py-2 text-[14px] font-['Sofia_Sans'] text-black hover:bg-[#FFE9EF] cursor-pointer border-b border-black/5 last:border-0"
                  >
                    {result.display_name}
                  </li>
                ))}
              </ul>
            )}
            {searchQuery && !loadingSearch && searchResults.length === 0 && (
              <p className="mt-1 text-[14px] font-['Sofia_Sans'] text-black/50 text-center">
                Ничего не найдено. Попробуйте изменить запрос.
              </p>
            )}
          </div>

          {/* Кнопки */}
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[14px] font-['Sofia_Sans'] text-black/60 hover:text-black"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="relative bg-[#FFE9EF] rounded-[10px] py-2 px-6 shadow-sm text-[14px] font-['Sofia_Sans'] text-black disabled:opacity-50"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              {isSaving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}ы
// ---------- Основной компонент ----------
export default function ProfileSchedulePage() {
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  // Состояния
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [week, setWeek] = useState<DayScheduleUI[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [newAbsence, setNewAbsence] = useState({ startDate: "", endDate: "", reason: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
  const [addressDraft, setAddressDraft] = useState("");
  const [customDay, setCustomDay] = useState({ date: "", startTime: "9:00", endTime: "18:00", addressId: "" });

  // Модалка адреса
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Загрузка данных
  useEffect(() => {
    const loadAll = async () => {
      if (!isVerified || !chatId) {
        setLoading(false);
        setError(authError || "Ожидание авторизации...");
        return;
      }
      try {
        setLoading(true);
        setError(null);
        await fetchAddresses();
        await fetchTemplate();
        await fetchAbsences();
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [chatId, isVerified, authLoading, authError]);

  // Синхронизация customDay.addressId при изменении адресов
  useEffect(() => {
    if (addresses.length && !customDay.addressId) {
      setCustomDay((prev) => ({ ...prev, addressId: addresses[0].id }));
    }
  }, [addresses, customDay.addressId]);

  // Функции API
  const fetchAddresses = async () => {
    const res = await fetch(`${baseUrl}/master/profile/schedule/addresses?chat_id=${chatId}`);
    if (!res.ok) throw new Error("Ошибка загрузки адресов");
    const data = await res.json();
    if (data.status === "success" || data.status === "empty") {
      setAddresses(data.addresses || []);
      return data.addresses;
    }
    throw new Error(data.status || "Неизвестная ошибка");
  };

  const fetchTemplate = async () => {
    const res = await fetch(`${baseUrl}/master/profile/schedule/get_template?chat_id=${chatId}`);
    if (!res.ok) throw new Error("Ошибка загрузки шаблона");
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.status);
    const templates: WeekTemplateResp[] = data.templates;
    const weekMap = new Map<number, WeekTemplateResp>();
    templates.forEach((t) => weekMap.set(t.weekday, t));
    const newWeek: DayScheduleUI[] = [];
    for (let i = 0; i < 7; i++) {
      const weekday = i + 1;
      const t = weekMap.get(weekday);
      if (t) {
        newWeek.push({
          dayOff: false,
          startTime: toHHMM(t.start_time),
          endTime: toHHMM(t.end_time),
          addressId: t.address_id,
        });
      } else {
        newWeek.push({ dayOff: true, startTime: "", endTime: "", addressId: "" });
      }
    }
    setWeek(newWeek);
  };

  const fetchAbsences = async () => {
    const res = await fetch(`${baseUrl}/master/profile/schedule/absence?chat_id=${chatId}`);
    if (!res.ok) throw new Error("Ошибка загрузки отсутствий");
    const data = await res.json();
    if (data.status !== "success" && data.status !== "no absences") throw new Error(data.status);
    setAbsences(data.absences || []);
  };

  // Адреса: создание/обновление/удаление
  const deleteAddress = async (addressId: string) => {
    const res = await fetch(`${baseUrl}/master/profile/schedule/delete_address/${addressId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Ошибка удаления");
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.status);
  };

  const startEditAddress = (idx: number) => {
    setEditingAddress(addresses[idx]);
    setIsAddressModalOpen(true);
  };

  const addNewAddress = () => {
    setEditingAddress(null);
    setIsAddressModalOpen(true);
  };

  const onAddressSaved = async () => {
    await fetchAddresses();
  };

  // Шаблон, отсутствия (без изменений)
  const saveTemplate = async () => {
    if (addresses.length === 0) {
      toast.error("Добавьте хотя бы один адрес перед сохранением шаблона");
      return;
    }
    const daysToSend: WeekTemplateItem[] = [];
    for (let i = 0; i < week.length; i++) {
      const day = week[i];
      if (!day.dayOff) {
        if (!day.addressId) {
          toast.error(`Для дня ${dayNames[i]} выберите адрес`);
          return;
        }
        daysToSend.push({
          weekday: i + 1,
          start_time: toTimeWithSeconds(day.startTime),
          end_time: toTimeWithSeconds(day.endTime),
          address_id: day.addressId,
        });
      }
    }
    try {
      const res = await fetch(`${baseUrl}/master/profile/schedule/set_template?chat_id=${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: daysToSend }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Server response:", text);
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      toast.success("Шаблон сохранён");
    } catch (err) {
      console.error(err);
      toast.error("Ошибка сохранения шаблона");
    }
  };

  const deleteDayTemplate = async (weekday: number) => {
    const res = await fetch(
      `${baseUrl}/master/profile/schedule/day_off_template?chat_id=${chatId}&weekday=${weekday}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Ошибка удаления дня: ${errorText}`);
    }
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.status);
  };

  const updateSingleDayTemplate = async (weekday: number, startTime: string, endTime: string, addressId: string) => {
    const payload = [
      {
        weekday: weekday,
        start_time: toTimeWithSeconds(startTime),
        end_time: toTimeWithSeconds(endTime),
        address_id: addressId,
      },
    ];
    const res = await fetch(`${baseUrl}/master/profile/schedule/update_template?chat_id=${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Ошибка обновления дня: ${errorText}`);
    }
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.status);
  };

  const addAbsence = async () => {
    if (!newAbsence.startDate || !newAbsence.endDate) return;
    const confirmed = window.confirm("Все существующие записи в этот период будут удалены. Продолжить?");
    if (!confirmed) return;
    try {
      const startDate = parseDDMMToDate(newAbsence.startDate);
      const endDate = parseDDMMToDate(newAbsence.endDate);
      const res = await fetch(`${baseUrl}/master/profile/schedule/set_absence?chat_id=${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: startDate, end_date: endDate, reason: newAbsence.reason }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.status !== "success") throw new Error();
      await fetchAbsences();
      setNewAbsence({ startDate: "", endDate: "", reason: "" });
      toast.success("Период отсутствия добавлен");
    } catch {
      toast.error("Ошибка добавления");
    }
  };

  const deleteAbsence = async (id: string) => {
    if (!window.confirm("Удалить период?")) return;
    try {
      const res = await fetch(`${baseUrl}/master/profile/schedule/delete_absences/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.status !== "success") throw new Error();
      setAbsences((prev) => prev.filter((a) => a.id !== id));
      toast.success("Период удалён");
    } catch {
      toast.error("Ошибка удаления");
    }
  };

  const handleCustomDaySubmit = async () => {
    if (!customDay.date) return;
    const confirmed = window.confirm(
      "Все записи, которые не попадают в новые временные рамки, будут отменены. Продолжить?"
    );
    if (!confirmed) return;
    try {
      const dateObj = parseDDMMToDate(customDay.date);
      const res = await fetch(`${baseUrl}/master/profile/schedule/working_day/update?chat_id=${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day_date: dateObj,
          start_time: toTimeWithSeconds(customDay.startTime),
          end_time: toTimeWithSeconds(customDay.endTime),
          address_id: customDay.addressId,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.status !== "success") throw new Error();
      toast.success("Изменения применены");
      setCustomDay({ date: "", startTime: "9:00", endTime: "18:00", addressId: addresses[0]?.id || "" });
    } catch {
      toast.error("Ошибка сохранения");
    }
  };

  const updateDay = (idx: number, patch: Partial<DayScheduleUI>) => {
    setWeek((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  // Ранние возвраты
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    );
  }
  if (authError || !isVerified) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500">{authError || "Ошибка авторизации"}</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const hasAddresses = addresses.length > 0;

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSaved={onAddressSaved}
        editingAddress={editingAddress}
        chatId={chatId!}
      />

      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        <Link
          to="/profile"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIcon} alt="back" className="w-6 h-6 relative z-10" />
        </Link>
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

        {/* Адреса работы */}
        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Адреса работы</h2>
          <div className="h-px bg-black w-56 mb-4" />

          {!hasAddresses ? (
            <div className="flex justify-center">
              <button
                onClick={addNewAddress}
                className="relative bg-[#FFE9EF] rounded-[10px] py-2.5 px-6 shadow-sm flex items-center justify-center gap-1"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <Plus className="w-4 h-4 text-black" />
                <span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black">Добавить адрес</span>
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {addresses.map((addr, idx) => (
                  <div
                    key={addr.id}
                    className="relative bg-[#FFE9EF] rounded-[10px] py-3 px-4 flex items-center gap-2 shadow-sm"
                    style={{
                      border: "0.5px solid rgba(0,0,0,0.00)",
                      boxShadow:
                        "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                    }}
                  >
                    <img src={pinIcon} alt="pin" className="w-8 h-8 rounded object-cover" />
                    <span className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black flex-1 truncate">
                      {addr.full_address || addr.address}
                    </span>
                    <button
                      onClick={() => startEditAddress(idx)}
                      className="absolute top-1 right-1 p-0.5"
                    >
                      <Pencil className="w-3.5 h-3.5 text-black/100" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addNewAddress}
                className="relative mx-auto bg-[#FFE9EF] rounded-[10px] py-2.5 px-6 shadow-sm flex items-center justify-center gap-1"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <Plus className="w-4 h-4 text-black" />
                <span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black">Добавить адрес</span>
              </button>
            </>
          )}
        </section>

        {/* Остальные секции – только если есть адреса */}
        {hasAddresses && (
          <>
            <section className="mt-10">
              <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Шаблон рабочей недели</h2>
              <div className="h-px bg-black w-56 mb-4" />
              <div className="flex items-center gap-2 mb-1 text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/100">
                <div className="w-8 flex-shrink-0" />
                <div className="flex-1 text-center">начало</div>
                <div className="flex-1 text-center">конец</div>
                <div className="flex-1 text-center">адрес</div>
                <div className="w-10 flex-shrink-0 text-center">вых</div>
              </div>
              <div className="flex flex-col gap-3">
                {dayNames.map((day, idx) => {
                  const d = week[idx];
                  const handleToggle = async () => {
                    const willBeOff = !d.dayOff;
                    const prevState = { ...d };
                    updateDay(idx, {
                      dayOff: willBeOff,
                      startTime: willBeOff ? "" : "9:00",
                      endTime: willBeOff ? "" : "18:00",
                      addressId: willBeOff ? "" : addresses[0]?.id || "",
                    });
                    try {
                      if (willBeOff) {
                        await deleteDayTemplate(idx + 1);
                      } else {
                        const newStart = "9:00";
                        const newEnd = "18:00";
                        const newAddressId = addresses[0]?.id || "";
                        await updateSingleDayTemplate(idx + 1, newStart, newEnd, newAddressId);
                      }
                      toast.success(willBeOff ? "День отмечен как выходной" : "Рабочий день восстановлен");
                    } catch (err: any) {
                      console.error(err);
                      toast.error(err.message || "Ошибка сохранения");
                      updateDay(idx, prevState);
                    }
                  };

                  return (
                    <div key={day} className="flex items-center gap-5">
                      <div className="w-8 flex-shrink-0 text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                        {day}
                      </div>
                      <TimeInput
                        value={d.startTime}
                        onChange={(v) => updateDay(idx, { startTime: v })}
                        className="flex-1"
                        disabled={d.dayOff}
                      />
                      <TimeInput
                        value={d.endTime}
                        onChange={(v) => updateDay(idx, { endTime: v })}
                        className="flex-1"
                        disabled={d.dayOff}
                      />
                      <AddressSelect
                        value={d.addressId}
                        addresses={addresses}
                        onChange={(addrId) => updateDay(idx, { addressId: addrId })}
                        className="flex-1"
                        disabled={d.dayOff}
                      />
                      <div className="w-10 flex-shrink-0 flex justify-center">
                        <Toggle checked={d.dayOff} onChange={handleToggle} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={saveTemplate}
                  className="bg-[#FFE9EF] rounded-[10px] py-2.5 px-3 shadow-sm text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black"
                  style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                      "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  }}
                >
                  Сохранить шаблон
                </button>
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Изменить конкретный<br /> день</h2>
              <div className="h-px bg-black w-56 mb-4" />
              <div className="grid grid-cols-4 gap-2 mb-1 text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/100">
                <div className="text-center">дата</div>
                <div className="text-center">начало</div>
                <div className="text-center">конец</div>
                <div className="text-center">адрес</div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="flex justify-center">
                  <DatePicker value={customDay.date} onChange={(v) => setCustomDay((prev) => ({ ...prev, date: v }))} />
                </div>
                <div className="flex justify-center">
                  <TimeInput
                    value={customDay.startTime}
                    onChange={(v) => setCustomDay((prev) => ({ ...prev, startTime: v }))}
                  />
                </div>
                <div className="flex justify-center">
                  <TimeInput
                    value={customDay.endTime}
                    onChange={(v) => setCustomDay((prev) => ({ ...prev, endTime: v }))}
                  />
                </div>
                <div className="flex justify-center">
                  <AddressSelect
                    value={customDay.addressId}
                    addresses={addresses}
                    onChange={(addrId) => setCustomDay((prev) => ({ ...prev, addressId: addrId }))}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleCustomDaySubmit}
                  className="bg-[#FFE9EF] rounded-[10px] py-2.5 px-3 shadow-sm text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black"
                  style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                      "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  }}
                >
                  Принять изменения
                </button>
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Установить период<br /> отсутствия</h2>
              <div className="h-px bg-black w-56 mb-4" />
              {absences.length > 0 && (
                <div className="mb-8">
                  {absences.map((abs) => (
                    <div key={abs.id} className="flex items-center gap-2 mb-3">
                      <div className="flex-1 text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                        {formatDateToDDMM(abs.start_date)}
                      </div>
                      <div className="flex-1 text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                        {formatDateToDDMM(abs.end_date)}
                      </div>
                      <div className="flex-[2] text-center text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black truncate">
                        {abs.reason}
                      </div>
                      <div className="flex items-center justify-end gap-1" style={{ width: "60px" }}>
                        <button
                          onClick={() => deleteAbsence(abs.id)}
                          className="relative w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
                        >
                          <div className="absolute w-11 h-11 left-[5px] top-[5px] bg-white rounded-[5px] blur-[20px] opacity-80" />
                          <img src={trashIcon} alt="back" className="w-6 h-6 relative z-10" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 mb-1 text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/100">
                <div className="text-center">начало</div>
                <div className="text-center">конец</div>
                <div className="text-center">причина</div>
              </div>
              <div className="grid grid-cols-[1fr_1fr_2fr] gap-2 mb-2 w-full">
                <div className="flex justify-center">
                  <DatePicker
                    value={newAbsence.startDate}
                    onChange={(v) => setNewAbsence((prev) => ({ ...prev, startDate: v }))}
                  />
                </div>
                <div className="flex justify-center">
                  <DatePicker
                    value={newAbsence.endDate}
                    onChange={(v) => setNewAbsence((prev) => ({ ...prev, endDate: v }))}
                  />
                </div>
                <div className="flex justify-center">
                  <div
                    className="bg-[#FFE9EF] rounded-[5px] h-7 flex items-center justify-center w-full"
                    style={{
                      boxShadow:
                        "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                    }}
                  >
                    <input
                      type="text"
                      placeholder="необязательно"
                      value={newAbsence.reason}
                      onChange={(e) => setNewAbsence((prev) => ({ ...prev, reason: e.target.value }))}
                      className="bg-transparent text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black outline-none text-center w-full"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 gap-1">
                <p className="text-[8px] font-['Sofia_Sans'] text-black/50">
                  *если на один день, то указывайте начало и конец одинаковые
                </p>
                <button
                  onClick={addAbsence}
                  className="bg-[#FFE9EF] rounded-[10px] py-2.5 px-3 shadow-sm text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black"
                  style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                      "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  }}
                >
                  Сохранить
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}