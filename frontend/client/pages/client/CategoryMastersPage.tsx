import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import homeIconSrc from "@/assets/home.svg";
import ambassadorBadgeSrc from "@/assets/ambassador_badge.png";
import emptyMastersIcon from "@/assets/sad_cat.png";
import { toast } from "sonner";
import { useTelegramAuth } from "@/App";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

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
  const_masters: MasterApiResponse[];
  partner_masters: MasterApiResponse[];
}

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
            {master.rating}
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

export default function CategoryMastersPage() {
  const { category } = useParams<{ category: string }>();
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  const [regularMasters, setRegularMasters] = useState<Master[]>([]);
  const [ambassadorMasters, setAmbassadorMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category) {
      setError("Категория не указана");
      setLoading(false);
      return;
    }
    if (!isVerified || !chatId) {
      if (!authLoading) {
        setError(authError || "Авторизация не пройдена");
        setLoading(false);
      }
      return;
    }

    const fetchMasters = async () => {
      try {
        const url = `${baseUrl}/users/master/?chat_id=${chatId}&parental_category=${encodeURIComponent(category)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: MastersResponse = await res.json();
        if (data.status !== "success") throw new Error(data.status);

        const regular: Master[] = data.const_masters.map((m, idx) => ({
          id: m.id,
          fullName: m.name,
          rating: m.rating,
          reviewCount: m.rates,
          avatarUrl: m.avatar || "https://placehold.co/50x50",
          isAmbassador: m.partner,
          bgColor: idx % 2 === 0 ? "#FFE9EF" : "#FFD0DC",
        }));

        const ambassadors: Master[] = data.partner_masters.map((m, idx) => ({
          id: m.id,
          fullName: m.name,
          rating: m.rating,
          reviewCount: m.rates,
          avatarUrl: m.avatar || "https://placehold.co/50x50",
          isAmbassador: true,
          bgColor: idx % 2 === 0 ? "#FFE9EF" : "#FFD0DC",
        }));

        setRegularMasters(regular);
        setAmbassadorMasters(ambassadors);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError("Не удалось загрузить мастеров");
        toast.error(err.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };

    fetchMasters();
  }, [category, chatId, isVerified, authLoading, authError]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }

  if (error || authError) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500 font-['Sofia_Sans']">{error || authError}</p>
      </div>
    );
  }

  if (regularMasters.length === 0 && ambassadorMasters.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFE9EF]">
        <div className="max-w-sm mx-auto px-4 pb-10 relative">
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

          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <img src={emptyMastersIcon} alt="Нет мастеров" className="w-40 h-40 mb-4" />
            <p className="text-black/50 text-center font-['Sofia_Sans'] text-lg">
              Нет мастеров в этой категории
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
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

        {regularMasters.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[32px] tracking-[-1.6px] font-['Sofia_Sans'] text-black"> Ваши мастера</h2>
            <div className="h-px bg-black w-[210px] mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {regularMasters.map((master) => (
                <MasterCard key={master.id} master={master} />
              ))}
            </div>
          </section>
        )}

        {ambassadorMasters.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[32px] tracking-[-1.6px] font-['Sofia_Sans'] text-black"> Партнеры</h2>
            <div className="h-px bg-black w-[210px] mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {ambassadorMasters.map((master) => (
                <MasterCard key={master.id} master={master} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}