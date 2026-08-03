import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import homeIconSrc from "@/assets/home.svg";
import emptyMastersIcon from "@/assets/sad_cat.png";
import { toast } from "sonner";
import { useTelegramAuth } from "@/App";
import { X } from "lucide-react";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ---------- Типы ----------
interface Master {
  id: string;
  fullName: string;
  rating: number;
  reviewCount: number;
  avatarUrl: string;
  isAmbassador: boolean;
  bgColor: string;
}

interface MasterApiResponse {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  rates: number;
  partner: boolean;
}

interface MastersResponse {
  status: string;
  masters: MasterApiResponse[]; // только постоянные мастера
}

interface City {
  city_id: string;
  name: string;
  master_num: number;
}

interface Metro {
  metro_id: string;
  name: string;
  hex: string;
  master_num: number;
}

// Вспомогательные функции
const getBgColor = (index: number) => (index % 2 === 0 ? "#FFE9EF" : "#FFD0DC");
const formatRating = (rating: number) => rating.toFixed(1);

// Компонент карточки мастера (без изменений)
function MasterCard({ master }: { master: Master }) {
  return (
    <Link
      to={`/booking/${master.id}`}
      className="relative w-[175px] h-[80px] rounded-[10px] flex items-center gap-1 px-1"
      style={{
        backgroundColor: master.bgColor,
        boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)",
        border: "0.5px solid rgba(0,0,0,0.00)",
      }}
    >
      <img
        src={master.avatarUrl}
        alt={master.fullName}
        className="w-[56px] h-[56px] rounded-[5px] object-cover border border-white flex-shrink-0"
        style={{
          boxShadow: "1px 1px 4px rgba(0, 0, 0, 0.25) inset",
        }}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <p className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black leading-tight break-words line-clamp-2">
          {master.fullName}
        </p>
        <div className="flex items-center gap-1 mt-1 leading-none">
          <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0 align-middle">
            <polygon points="5,0 6.5,3.5 10,4 7.5,7 8,10 5,8.5 2,10 2.5,7 0,4 3.5,3.5" fill="black" />
          </svg>
          <span className="text-[11px] tracking-[-0.5px] font-['Sofia_Sans'] text-black leading-none">
            {formatRating(master.rating)}
          </span>
          <span className="text-[11px] tracking-[-0.5px] font-['Sofia_Sans'] text-black/50 leading-none ml-0.5">
            ({master.reviewCount})
          </span>
        </div>
      </div>
      {master.isAmbassador && (
        <span className="absolute bottom-1 right-1 text-[10px] font-['MuseoModerno'] text-black/100">
          partner
        </span>
      )}
    </Link>
  );
}

// ---------- Основной компонент ----------
export default function CategoryMastersPage() {
  const { category } = useParams<{ category: string }>();
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  // Состояния для постоянных мастеров
  const [regularMasters, setRegularMasters] = useState<Master[]>([]);
  const [loadingRegular, setLoadingRegular] = useState(true);
  const [errorRegular, setErrorRegular] = useState<string | null>(null);

  // Состояния для партнеров
  const [partnerMasters, setPartnerMasters] = useState<Master[]>([]);
  const [partnerSelected, setPartnerSelected] = useState(false); // true, если выбрана станция и показаны мастера

  // Модальное окно
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<"city" | "metro" | "masters">("city");
  const [cities, setCities] = useState<City[]>([]);
  const [metros, setMetros] = useState<Metro[]>([]);
  const [metroSearchQuery, setMetroSearchQuery] = useState("");
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedMetroId, setSelectedMetroId] = useState<string | null>(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingMetros, setLoadingMetros] = useState(false);
  const [loadingPartnerMasters, setLoadingPartnerMasters] = useState(false);

  // Загрузка постоянных мастеров
  useEffect(() => {
    if (!category) {
      setErrorRegular("Категория не указана");
      setLoadingRegular(false);
      return;
    }
    if (!isVerified || !chatId) {
      if (!authLoading) {
        setErrorRegular(authError || "Авторизация не пройдена");
        setLoadingRegular(false);
      }
      return;
    }

    const fetchRegular = async () => {
      try {
        const url = `${baseUrl}/users/master/?chat_id=${chatId}&parental_category=${encodeURIComponent(category)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: MastersResponse = await res.json();
        if (data.status !== "success") throw new Error(data.status);

        const regular: Master[] = data.masters.map((m, idx) => ({
          id: m.id,
          fullName: m.name,
          rating: m.rating,
          reviewCount: m.rates,
          avatarUrl: m.avatar || "https://placehold.co/50x50",
          isAmbassador: false,
          bgColor: getBgColor(idx),
        }));
        setRegularMasters(regular);
        setErrorRegular(null);
      } catch (err: any) {
        console.error(err);
        setErrorRegular("Не удалось загрузить мастеров");
        toast.error(err.message || "Ошибка загрузки");
      } finally {
        setLoadingRegular(false);
      }
    };

    fetchRegular();
  }, [category, chatId, isVerified, authLoading, authError]);

  // Загрузка городов для модалки
  const loadCities = async () => {
    if (!category) return;
    setLoadingCities(true);
    try {
      const url = `${baseUrl}/users/master/partner_masters_amount_by_city?parental_category=${encodeURIComponent(category)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Ошибка загрузки городов");
      const data = await res.json();
      if (data.status === "success") {
        setCities(data.partner_by_city);
        setModalStep("city");
      } else {
        throw new Error("Нет городов");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Не удалось загрузить города");
      // Если нет городов, закрываем модалку?
    } finally {
      setLoadingCities(false);
    }
  };

  // Загрузка метро для выбранного города
  const loadMetros = async (cityId: string) => {
    if (!category) return;
    try {
      const url = `${baseUrl}/users/master/partner_masters_amount_by_metro?parental_category=${encodeURIComponent(category)}&city_id=${cityId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Ошибка загрузки метро");
      const data = await res.json();
      if (data.status === "success") {
        setMetros(data.partner_by_metro);
        setModalStep("metro");
        setMetroSearchQuery(""); // сброс поиска при переходе
      } else {
        throw new Error("Нет станций метро");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Не удалось загрузить станции метро");
    } finally {
      setLoadingMetros(false);
    }
  };

  // Загрузка мастеров для выбранной станции
  const loadMastersByStation = async (metroId: string) => {
    if (!category) return;
    setLoadingPartnerMasters(true);
    try {
      const url = `${baseUrl}/users/master/partner_masters_by_station?parental_category=${encodeURIComponent(category)}&metro_id=${metroId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Ошибка загрузки партнеров");
      const data = await res.json();
      if (data.status === "success") {
        const partners: Master[] = data.masters.map((m: MasterApiResponse, idx: number) => ({
          id: m.id,
          fullName: m.name,
          rating: m.rating,
          reviewCount: m.rates,
          avatarUrl: m.avatar || "https://placehold.co/50x50",
          isAmbassador: true,
          bgColor: getBgColor(idx),
        }));
        setPartnerMasters(partners);
        setPartnerSelected(true);
        setShowModal(false); // закрываем модалку
        toast.success(`Найдено ${partners.length} партнеров`);
      } else if (data.status === "empty") {
        toast.info("Нет партнеров рядом с этой станцией");
        setPartnerMasters([]);
        setPartnerSelected(false);
        setShowModal(false);
      } else {
        throw new Error("Ошибка загрузки партнеров");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка загрузки");
      setPartnerMasters([]);
      setPartnerSelected(false);
      setShowModal(false);
    } finally {
      setLoadingPartnerMasters(false);
    }
  };

  // Обработчики кликов в модалке
  const handleCityClick = (cityId: string) => {
  if (loadingMetros) return; // не даём кликать повторно
  setSelectedCityId(cityId);
  setLoadingMetros(true); // показываем загрузку сразу
  loadMetros(cityId);
};

  const handleMetroClick = (metroId: string) => {
    setSelectedMetroId(metroId);
    loadMastersByStation(metroId);
  };

  // Сброс выбора партнеров (возврат к кнопке)
  const resetPartners = () => {
    setPartnerMasters([]);
    setPartnerSelected(false);
    setSelectedCityId(null);
    setSelectedMetroId(null);
    setCities([]);
    setMetros([]);
    setModalStep("city");
    setMetroSearchQuery("")
  };

  // Открытие модалки
  const openModal = () => {
    setShowModal(true);
    loadCities();
  };

  // Закрытие модалки
  const closeModal = () => {
    setShowModal(false);
    setMetroSearchQuery("")
    // Не сбрасываем состояния, чтобы при повторном открытии не загружать всё заново
  };

  if (authLoading || loadingRegular) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }

  if (errorRegular || authError) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500 font-['Sofia_Sans']">{errorRegular || authError}</p>
      </div>
    );
  }

  const hasRegular = regularMasters.length > 0;
  const hasPartners = partnerMasters.length > 0;

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка Home */}
        <Link
          to="/user"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={homeIconSrc} alt="home" className="w-6 h-6 relative z-10" />
        </Link>

        <div className="pt-8 pb-2">
          <h1 className="text-[40px] leading-tight tracking-[3.2px] text-transparent" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}>masters</h1>
        </div>

        {/* Ваши мастера */}
        <section className="mt-8">
          <h2 className="text-[32px] tracking-[-1.6px] font-['Sofia_Sans'] text-black">Ваши мастера</h2>
          <div className="h-px bg-black w-[210px] mb-4" />
          {hasRegular ? (
            <div className="grid grid-cols-2 gap-4">
              {regularMasters.map((master) => (
                <MasterCard key={master.id} master={master} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <img src={emptyMastersIcon} alt="Нет мастеров" className="w-32 h-32 mb-3" />
              <p className="text-black/50 text-center font-['Sofia_Sans'] text-base">
                Пока здесь пусто
              </p>
            </div>
          )}
        </section>

        {/* Партнеры */}
        <section className="mt-10">
          <h2 className="text-[32px] tracking-[-1.6px] font-['Sofia_Sans'] text-black">Партнеры</h2>
          <div className="h-px bg-black w-[210px] mb-4" />

          {!partnerSelected && (
            // Кнопка "Найти мастеров поблизости"
            <div className="flex justify-center mt-4">
              <button
                onClick={openModal}
                className="relative bg-[#FFE9EF] rounded-[10px] py-3 px-8 shadow-sm text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black flex items-center justify-center"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                Найти мастеров поблизости
              </button>
            </div>
          )}

          {partnerSelected && (
            <>
              {/* Кнопка "Сменить район" */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={resetPartners}
                  className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black/60 hover:text-black"
                >
                  Сменить район
                </button>
              </div>
              {hasPartners ? (
                <div className="grid grid-cols-2 gap-4">
                  {partnerMasters.map((master) => (
                    <MasterCard key={master.id} master={master} />
                  ))}
                </div>
              ) : (
                <p className="text-black/50 text-center font-['Sofia_Sans']">
                  Нет партнеров в выбранном районе
                </p>
              )}
            </>
          )}
        </section>
      </div>

      {/* Модальное окно выбора города/метро */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div
            className="relative bg-[#FFE9EF] rounded-[20px] w-full max-w-sm max-h-[80vh] overflow-hidden p-6 shadow-xl"
            style={{
              boxShadow:
                "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            }}
          >
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-black/50 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center mb-4">
              {modalStep === "city" && "Выберите город"}
              {modalStep === "metro" && "Выберите станцию метро"}
              {modalStep === "masters" && "Мастера"}
            </h3>
            <div className="h-px bg-black w-60 mx-auto mt-2 mb-4" />

            <div className="overflow-y-auto max-h-[60vh]">
              {modalStep === "city" && (
                <>
                  {loadingCities ? (
                    <p className="text-center text-black/50">Загрузка городов...</p>
                  ) : cities.length === 0 ? (
                    <p className="text-center text-black/50">Нет городов с партнерами</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {cities.map((city) => (
                       <div
                        key={city.city_id}
                        onClick={() => handleCityClick(city.city_id)}
                        className="flex items-center justify-between px-4 py-3 bg-[#FFE9EF] shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        style={{
                          border: "0.5px solid rgba(0,0,0,0.00)",
                          boxShadow:
                            "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                            <circle cx="12" cy="9" r="3" />
                          </svg>
                          <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                            {city.name}
                          </span>
                        </div>
                        {loadingMetros && selectedCityId === city.city_id ? (
                          <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/50">⏳</span>
                        ) : (
                          <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/50">
                            {city.master_num}
                          </span>
                        )}
                      </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {modalStep === "metro" && (
                <>
                  {/* Поле поиска */}
                  <div className="relative mb-3">
                    <div
                      className="bg-[#FFE9EF] h-11 shadow flex items-center px-3"
                      style={{
                        border: "0.5px solid rgba(0,0,0,0.00)",
                        boxShadow:
                          "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Поиск станции..."
                        value={metroSearchQuery}
                        onChange={(e) => setMetroSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-[16px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50"
                      />
                    </div>
                  </div>

                  {loadingMetros ? (
                    <p className="text-center text-black/50">Загрузка станций...</p>
                  ) : metros.length === 0 ? (
                    <p className="text-center text-black/50">Нет станций метро с партнерами</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {metros
                        .filter((metro) =>
                          metro.name.toLowerCase().includes(metroSearchQuery.toLowerCase())
                        )
                        .map((metro) => (
                          <div
                            key={metro.metro_id}
                            onClick={() => handleMetroClick(metro.metro_id)}
                            className="flex items-center justify-between px-4 py-3 bg-[#FFE9EF] shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                            style={{
                              border: "0.5px solid rgba(0,0,0,0.00)",
                              boxShadow:
                                "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05)",
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: metro.hex || "#888" }}
                              />
                              <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                                {metro.name}
                              </span>
                            </div>
                            <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/50">
                              {metro.master_num}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}

              {modalStep === "masters" && (
                <p className="text-center text-black/50">Загрузка...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}