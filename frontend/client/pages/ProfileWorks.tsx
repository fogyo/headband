import { Link } from "react-router-dom";
import backIcon from "@/assets/back_icon.svg";
import folderIcon from "@/assets/folder_background.svg";

interface WorkFolder {
  id: number;
  hashtag: string;
}

const folders: WorkFolder[] = [
  { id: 1, hashtag: "#ФЭЙД" },
  { id: 2, hashtag: "#КАСКАД" },
  { id: 3, hashtag: "#МОДЕЛЬНАЯ" },
  { id: 4, hashtag: "#ПОМПАДУР" },
];

export default function ProfileWorksPage() {
  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        <Link
          to="/profile"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIcon} alt="back" className="w-6 h-6 relative z-10" />
        </Link>

        <div className="pt-8 pb-2">
          <h1 className="text-[40px] leading-tight tracking-[3.2px] text-transparent" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}>
            profile
          </h1>
          <p className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]" style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "0.4px #000" }}>
            version for masters
          </p>
        </div>

        <section className="mt-8">
        <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black"> Мои работы</h2>
        <div className="h-px bg-black w-32 mb-6" />

        <div className="grid grid-cols-2 gap-8">
        {folders.map((folder) => (
          <Link
        to={`/profile/portfolio/${folder.hashtag.replace('#', '')}`}
        key={folder.id}
        className="flex flex-col items-center"
      >
          <div key={folder.id} className="flex flex-col items-center">
            <div className="relative w-44 h-28">
              {/* Иконка папки теперь заполняет всё пространство */}
              <img
                src={folderIcon}
                alt="folder"
                className="absolute inset-0 w-full h-full object-cover"  // <-- заменил contain на cover
              />
              {/* Розовый квадрат поверх иконки */}
              <div
                className="absolute top-6 inset-0 h-[90px] bg-[#FFE9EF] rounded-[20px]"
                style={{
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  border: "0.5px solid rgba(0,0,0,0.05)",
                }}
              />
              {/* Хештег в правом нижнем углу */}
              <span className="absolute bottom-2 right-2 text-[14px] font-extrabold font-['Sofia_Sans'] text-black">
                {folder.hashtag}
              </span>
            </div>
          </div>
          </Link>
        ))}
      </div>
      </section>
      </div>
    </div>
  );
}