import profileIconUrl from "@/assets/profile_theme.svg";

interface ProfileCardProps {
  className?: string;
}

export default function ProfileCard({ className = "" }: ProfileCardProps) {
  return (
    <div
      className={`relative w-[170px] h-[120px] rounded-[20px] bg-[#FFB6CA] p-4 flex flex-col overflow-hidden ${className}`}
      style={{
        boxShadow: `
          2px 2px 7px 0 rgba(0,0,0,0.10),
          9px 10px 13px 0 rgba(0,0,0,0.09),
          20px 22px 18px 0 rgba(0,0,0,0.05),
          36px 38px 21px 0 rgba(0,0,0,0.01),
          57px 60px 23px 0 rgba(0,0,0,0.00)
        `,
        border: "0.5px solid rgba(0,0,0,0.05)",
      }}
    >

       {/* Заголовок */}
      <h3
        className="relative z-10 text-[20px] font-normal text-black"
        style={{ fontFamily: "'Sofia Sans', sans-serif" }}
      >
        Профиль
      </h3>

      {/* Иконка в правом нижнем углу */}
      <div className="absolute right-0 top-0 w-50 h-40 pointer-events-none z-10">
        <img
          src={profileIconUrl}
          className="w-full h-full opacity-100"
          alt=""
        />
      </div>
    </div>
  );
}