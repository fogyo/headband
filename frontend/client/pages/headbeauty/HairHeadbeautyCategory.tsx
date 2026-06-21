import { useParams, useNavigate, useLocation } from "react-router-dom";
import homeIconSrc from "@/assets/home.svg";
import backIconSrc from "@/assets/back_icon.svg";
import haircutIcon from "@/assets/ai_hair_hair_icon.svg";
import beardIcon from "@/assets/ai_hair_beard_icon.svg";
import coloringIcon from "@/assets/ai_hair_coloring_icon.svg";
import permIcon from "@/assets/ai_hair_styling_icon.svg";

const femaleHairCategories = [
  { label: "Стрижки", image: haircutIcon, route: "hair" },
  { label: "Окраска", image: coloringIcon, route: "coloring" },
  { label: "Завивка", image: permIcon, route: "perm" },
];

const maleHairCategories = [
  { label: "Стрижки", image: haircutIcon, route: "hair" },
  { label: "Окраска", image: coloringIcon, route: "coloring" },
  { label: "Завивка", image: permIcon, route: "perm" },
  { label: "Борода и усы", image: beardIcon, route: "beard" },
];

export default function AIHairCatsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gender: urlGender } = useParams<{ gender: string }>();
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get("session_id");

  const state = location.state as { gender?: boolean; img_url?: string; session_id?: string; task_id?: string } | null;
  const gender = state?.gender !== undefined ? state.gender : (urlGender === "female" ? true : false);
  const imgUrl = state?.img_url || "";
  const effectiveSessionId = sessionId || state?.session_id || "";

  const selectedGender = gender ? "male" : "female";
  const categories = gender ? femaleHairCategories : maleHairCategories;

  const handleCategoryClick = (route: string) => {
    navigate(`/headbeauty-${route}/${selectedGender}?session_id=${effectiveSessionId}`, {
      state: {
        gender,
        img_url: imgUrl,
        session_id: effectiveSessionId,
        task_id: state?.task_id,
      },
    });
  };

  return (
    <div className="relative w-full mx-auto h-screen overflow-hidden bg-[#FFE9EF]">
      <img
        src={imgUrl || "https://placehold.co/375x789"}
        alt="background"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-[#FFE9EF] rounded-t-[20px] px-4 pt-6 pb-2">
        <h3 className="text-[24px] font-['Aclonica'] text-black text-center mb-4" style={{ fontFamily: "Aclonica, sans-serif" }}>
          headbeauty AI
        </h3>
        <div className="flex justify-center flex-nowrap gap-2 px-2 pb-4 min-h-[120px]">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => handleCategoryClick(cat.route)}
              className="relative bg-[#FFE9EF] rounded-[10px] p-2 shadow-md flex-1 flex flex-col items-center cursor-pointer active:scale-95 transition-transform h-28"
              style={{
                boxShadow:
                  "2px 2px 7px rgba(0,0,0,0.10), 9px 10px 13px rgba(0,0,0,0.09), 20px 22px 18px rgba(0,0,0,0.05), 36px 38px 21px rgba(0,0,0,0.01), 57px 60px 23px rgba(0,0,0,0.00)",
                border: "0.5px solid rgba(0,0,0,0.00)",
              }}
            >
              <img src={cat.image} alt={cat.label} className="w-12 h-12 object-cover rounded" />
              <span className="text-[10px] tracking-[-0.5px] font-['Sofia_Sans'] text-black text-center leading-tight mt-4 whitespace-normal break-words px-1">
                {cat.label}
              </span>
            </div>
          ))}
        </div>

        <button onClick={() => navigate("/")} className="absolute top-6 right-4 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]">
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={homeIconSrc} alt="home" className="w-6 h-6 relative z-10" />
        </button>
        <button onClick={() => navigate(-1)} className="absolute top-6 left-4 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]">
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIconSrc} alt="back" className="w-6 h-6 relative z-10" />
        </button>
      </div>
    </div>
  );
}