import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import backIconSrc from "@/assets/back_icon.svg";
import { Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

interface WorkFile {
  id: string;
  name: string;
  filepath: string;
}

export default function MasterPortfolioPage() {
  const { masterId } = useParams<{ masterId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { portfolio?: WorkFile[] } | null;

  const [works, setWorks] = useState<WorkFile[]>(state?.portfolio || []);
  const [loading, setLoading] = useState(!state?.portfolio);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state?.portfolio) {
      setWorks(state.portfolio);
      return;
    }

    const fetchPortfolio = async () => {
      if (!masterId) {
        setError("ID мастера не указан");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${baseUrl}/users/price/master_portfolio?master_id=${masterId}`);
        if (!res.ok) throw new Error("Ошибка загрузки портфолио");
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.status);
        setWorks(data.files || []);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError("Не удалось загрузить портфолио");
        toast.error(err.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [masterId, state]);

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
          <h1 className="text-[40px] leading-tight tracking-[3.2px] text-transparent" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}>
            portfolio
          </h1>
        </div>

        <section className="mt-8">
          <h2 className="text-[32px] tracking-[-1.6px] font-['Sofia_Sans'] text-black">Работы мастера</h2>
          <div className="h-px bg-black w-[210px] mb-4" />

          {works.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <ImageIcon className="w-16 h-16 text-black/20" />
              <p className="text-black/50 text-center font-['Sofia_Sans'] mt-4">У мастера пока нет работ</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {works.map((work) => (
                <div key={work.id} className="relative bg-[#FFE9EF] rounded-[10px] overflow-hidden shadow-md">
                  <img
                    src={work.filepath}
                    alt={work.name}
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/300x200/FFE9EF/333?text=No+image";
                    }}
                  />
                  <div className="p-2">
                    <p className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black truncate">
                      {work.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}