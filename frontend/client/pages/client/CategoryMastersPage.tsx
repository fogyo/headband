// client/pages/CategoryMastersPage.tsx
import { useParams, Link } from "react-router-dom";
import homeIconSrc from "@/assets/home.svg";
import ambassadorBadgeSrc from "@/assets/ambassador_badge.png";

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

// ---------- Мок-данные (замените на API позже) ----------
const mockMasters: Master[] = [
  { id: "1", fullName: "Васильчук А.М.", rating: 4.8, reviewCount: 78, avatarUrl: "https://placehold.co/50x50", isAmbassador: false, bgColor: "#FFE9EF" },
  { id: "2", fullName: "Полетов В.Н.", rating: 4.6, reviewCount: 63, avatarUrl: "https://placehold.co/50x50", isAmbassador: false, bgColor: "#FFD0DC" },
  { id: "3", fullName: "Витюгов Р.А.", rating: 4.7, reviewCount: 361, avatarUrl: "https://placehold.co/50x50", isAmbassador: true, bgColor: "#FFE9EF" },
  { id: "4", fullName: "Купер Э.А.", rating: 4.6, reviewCount: 587, avatarUrl: "https://placehold.co/50x50", isAmbassador: true, bgColor: "#FFD0DC" },
  { id: "5", fullName: "Николаева Е.П.", rating: 4.8, reviewCount: 1265, avatarUrl: "https://placehold.co/50x50", isAmbassador: true, bgColor: "#FFD0DC" },
  { id: "6", fullName: "Александров П.М.", rating: 4.5, reviewCount: 3420, avatarUrl: "https://placehold.co/50x50", isAmbassador: true, bgColor: "#FFE9EF" },
];

// ---------- Карточка мастера ----------
function MasterCard({ master }: { master: Master }) {
  return (
    <Link
      to={`/booking/${master.id}`}
      className="relative w-[175px] h-[70px] rounded-[10px] flex items-center gap-3 px-4"
      style={{
        backgroundColor: master.bgColor,
        boxShadow: "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)",
        border: "0.5px solid rgba(0,0,0,0.00)",
      }}
    >
      <img
        src={master.avatarUrl}
        alt={master.fullName}
        className="w-[50px] h-[50px] rounded-[5px] object-cover border border-white flex-shrink-0"
        style={{
          boxShadow: "1px 1px 4px rgba(0, 0, 0, 0.25) inset",
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] tracking-[-0.6px] font-['Sofia_Sans'] text-black truncate">
          {master.fullName}
        </p>
        <div className="flex items-center gap-1 mt-1 leading-none">
        <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0">
          <polygon points="5,0 6.5,3.5 10,4 7.5,7 8,10 5,8.5 2,10 2.5,7 0,4 3.5,3.5" fill="black" />
        </svg>
        <span className="text-[10px] tracking-[-0.5px] font-['Sofia_Sans'] text-black leading-none">
          {master.rating}
        </span>
      </div>
        <p className="text-[7px] tracking-[-0.35px] font-['Sofia_Sans'] text-black/50 mt-0.5">
          {master.reviewCount} оценок
        </p>
      </div>
      {master.isAmbassador && (
        <img
          src={ambassadorBadgeSrc}
          alt="ambassador"
          className="absolute bottom-0.5 right-0.5 w-12 h-7 object-contain"
        />
      )}
    </Link>
  );
}

// ---------- Главный компонент ----------
export default function CategoryMastersPage() {
  const { category } = useParams<{ category: string }>();

  const regularMasters = mockMasters.filter((m) => !m.isAmbassador);
  const ambassadorMasters = mockMasters.filter((m) => m.isAmbassador);

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

        {/* Header */}
        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}
          >
            masters
          </h1>
        </div>

        {/* Ваши мастера */}
        <section className="mt-8">
          <h2 className="text-[32px] tracking-[-1.6px] font-['Sofia_Sans'] text-black"> Ваши мастера</h2>
          <div className="h-px bg-black w-[210px] mb-4" />

          <div className="grid grid-cols-2 gap-4">
            {regularMasters.map((master) => (
              <MasterCard key={master.id} master={master} />
            ))}
          </div>
        </section>

        {/* Амбассадоры */}
        {ambassadorMasters.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[32px] tracking-[-1.6px] font-['Sofia_Sans'] text-black"> Амбассадоры</h2>
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