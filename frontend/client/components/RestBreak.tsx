interface RestBreakProps {
  label: string;
}

export default function RestBreak({ label }: RestBreakProps) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="relative flex-shrink-0 flex items-center justify-center w-8">
        <div
          className="absolute rounded-full bg-white opacity-80"
          style={{ width: 13, height: 90, filter: "blur(12px)" }}
        />
        {/* Bar */}
        <div
          className="relative rounded-full"
          style={{
            width: 11,
            height: 50,
            background: "#FFE9EF",
            border: "0.5px solid rgba(0,0,0,0.00)",
            boxShadow:
              "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)",
          }}
        />
      </div>

      <span
        className="text-[13px] italic text-black/50"
        style={{ fontFamily: "'Sofia Sans', sans-serif" }}
      >
        {label}
      </span>
    </div>
  );
}
