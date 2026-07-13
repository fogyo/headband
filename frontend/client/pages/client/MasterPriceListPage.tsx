import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import backIconSrc from "@/assets/back_icon.svg";
import logoImage from "@/assets/logo_hb.png";
import { toast } from "sonner";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ---------- Типы ----------
interface ServiceItem {
  id: string;
  name: string;
  price: number;
}

interface Category {
  name: string;
  services: ServiceItem[];
}

interface PriceTemplate {
  id: string;
  name: string;
  price: number;
}

interface CategoryTemplate {
  category_name: string;
  prices: PriceTemplate[];
}

interface PricePageResponse {
  status: string;
  categories: CategoryTemplate[];
}

// ---------- Компонент ----------
export default function MasterPriceListPage() {
  const { masterId } = useParams<{ masterId: string }>();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPriceList = async () => {
      if (!masterId) {
        setError("ID мастера не указан");
        setLoading(false);
        return;
      }
      try {
        const url = `${baseUrl}/users/price/?master_id=${masterId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: PricePageResponse = await res.json();
        if (data.status !== "success") throw new Error(data.status);

        const mappedCategories: Category[] = data.categories.map((cat) => ({
          name: cat.category_name.toUpperCase(),
          services: cat.prices.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
          })),
        }));

        setCategories(mappedCategories);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError("Не удалось загрузить прайс-лист");
        toast.error(err.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };

    fetchPriceList();
  }, [masterId]);

  const formatPrice = (price: number) => `${price} ₽`;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
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

  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFE9EF]">
        <div className="max-w-sm mx-auto px-4 pb-10 relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
          >
            <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
            <img src={backIconSrc} alt="back" className="w-6 h-6 relative z-10" />
          </button>
          <div className="pt-8 pb-2">
            <h1 className="text-[40px] leading-tight tracking-[3.2px] text-transparent" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}>booking</h1>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <p className="text-black/50 text-center font-['Sofia_Sans'] text-lg">У мастера пока нет прайс-листа</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIconSrc} alt="back" className="w-6 h-6 relative z-10" />
        </button>

        <div className="pt-8 pb-2">
          <h1 className="text-[40px] leading-tight tracking-[3.2px] text-transparent" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}>booking</h1>
        </div>

        <section className="mt-8">
          <h2 className="text-[32px] tracking-[-1.6px] font-['Sofia_Sans'] text-black"> Прайс лист</h2>
          <div className="h-px bg-black w-[210px] mb-6" />

          {categories.map((category, catIdx) => (
            <div key={catIdx} className="mb-8">
              <div className="flex items-stretch gap-3">
                <div className="w-8 flex-shrink-0 flex items-stretch">
                  <span
                    className="text-[24px] font-['MuseoModerno'] text-black whitespace-nowrap"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      textAlign: "center",
                    }}
                  >
                    {category.name}
                  </span>
                </div>

                <div className="w-[1px] bg-black flex-shrink-0" />

                {/* СПИСОК УСЛУГ – теперь с жёсткими ограничениями */}
                <div className="flex-1 flex flex-col min-w-0">
                  {category.services.map((service) => (
                    <Link
                      key={service.id}
                      to={`/booking/${masterId}/${service.id}`}
                      className="relative bg-[#FFE9EF] rounded-[10px] h-9 flex items-center px-2 mb-2 cursor-pointer hover:opacity-80 transition-opacity w-full"
                      style={{
                        boxShadow:
                          "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)",
                        border: "0.5px solid rgba(0,0,0,0.00)",
                      }}
                    >
                      <span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black flex-1 min-w-0 truncate">
                        {service.name}
                      </span>
                      <span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black ml-1 whitespace-nowrap flex-shrink-0">
                        {formatPrice(service.price)}
                      </span>
                      <svg width="18" height="18" viewBox="0 0 24 24" className="ml-1 flex-shrink-0">
                        <path d="M9 6L15 12L9 18" stroke="black" strokeWidth="2" fill="none" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
              {catIdx < categories.length - 1 && (
                <img
                  src={logoImage}
                  alt="logo"
                  className="w-full h-auto mt-4 rounded-[10px] ml-6"
                />
              )}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}