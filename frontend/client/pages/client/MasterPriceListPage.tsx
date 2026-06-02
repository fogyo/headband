import { useParams, useNavigate, Link } from "react-router-dom";
import backIconSrc from "@/assets/back_icon.svg";
import logoImage from "@/assets/logo_hb.png"; // в начало файла

interface ServiceItem {
  id: number;
  name: string;
  price: string;
}

interface Category {
  name: string;
  services: ServiceItem[];
}

const mockData: Category[] = [
  {
    name: "HAIRCUT",
    services: [
      { id: 1, name: "Стрижка детская (до 10 лет)", price: "1190 ₽" },
      { id: 2, name: "Стрижка мужская", price: "1300 ₽" },
      { id: 3, name: "Стрижка машинкой", price: "800 ₽" },
    ],
  },
  {
    name: "BARBER",
    services: [
      { id: 4, name: "Стрижка бороды", price: "700 ₽" },
      { id: 5, name: "Окантовка", price: "500 ₽" },
      { id: 6, name: "Камуфляж седины", price: "1200 ₽" },
      { id: 7, name: "Бритьё", price: "1000 ₽" },
    ],
  },
  {
    name: "COLORING",
    services: [
      { id: 8, name: "Окрашивание", price: "2500 ₽" },
      { id: 9, name: "Мелирование", price: "3000 ₽" },
      { id: 10, name: "Тонирование", price: "1500 ₽" },
      { id: 11, name: "Обесцвечивание", price: "2000 ₽" },
    ],
  },
];

export default function MasterPriceListPage() {
  const { masterId } = useParams<{ masterId: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка Home */}
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
            booking
          </h1>
        </div>

        {/* Прайс-лист */}
        <section className="mt-8">
          <h2 className="text-[32px] tracking-[-1.6px] font-['Sofia_Sans'] text-black"> Прайс лист</h2>
          <div className="h-px bg-black w-[210px] mb-6" />

          {mockData.map((category, catIdx) => (
            <div key={catIdx} className="mb-8">
              <div className="flex items-stretch gap-3">
                {/* Вертикальный заголовок */}
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

                {/* Разделитель */}
                <div className="w-[1px] bg-black flex-shrink-0" />

                {/* Список услуг */}
                <div className="flex-1 flex flex-col">
                  {category.services.map((service) => (
                     <Link
                    key={service.id}
                    to={`/booking/${masterId}/${service.id}`}
                    className="relative bg-[#FFE9EF] rounded-[10px] h-10 flex items-center px-4 mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      boxShadow:
                        "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)",
                      border: "0.5px solid rgba(0,0,0,0.00)",
                    }}
                  >
                    <span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black flex-1">
                      {service.name}
                    </span>
                    <span className="text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black ml-4">
                      {service.price}
                    </span>
                    <svg width="24" height="24" viewBox="0 0 24 24" className="ml-2">
                      <path d="M9 6L15 12L9 18" stroke="black" strokeWidth="2" fill="none" />
                    </svg>
                  </Link>
                  ))}
                </div>
              </div>
              {catIdx < mockData.length - 1 && (
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