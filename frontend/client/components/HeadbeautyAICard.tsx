import headbeautyAiImg from "@/assets/PinkScissors.png";

export default function HeadbeautyAICard() {
  return (
    <div
      className="relative rounded-[10px] overflow-hidden bg-[#FFE9EF] p-6 flex items-start justify-between"
      style={{
        boxShadow:
          "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)",
        border: "0.5px solid rgba(0,0,0,0.00)",
        background: "#FFE9EF",
      }}
    >
  

      {/* Content */}
      <div className="relative z-10 flex-1 pr-4">
        <h3
          className="text-[24px] tracking-[-1.2px] text-black leading-tight mb-2"
          style={{ fontFamily: "Aclonica, sans-serif" }}
        >
          headbeauty AI
        </h3>
        <p
          className="text-[11px] tracking-[-0.55px] text-black leading-normal"
          style={{ fontFamily: "'Sofia Sans', sans-serif", maxWidth: 188 }}
        >
          Хотите примерить новые образы? Наш ИИ-ассистент поможет подобрать
          причёску и покажет, как вам пойдут разные стили
        </p>
      </div>

      {/* Новое изображение */}
      <div className="relative z-10 flex-shrink-0">
        <img
          src={headbeautyAiImg}        // <-- теперь локальный импорт
          alt="headbeauty AI"
          className="w-[120px] h-auto object-contain"
          style={{ mixBlendMode: "multiply" }} // можно убрать, если не нужно
        />
      </div>
    </div>
  );
}
