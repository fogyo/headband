interface AppointmentItemProps {
  startTime: string;
  endTime: string;
  service: string;
  location: string;
}

export default function AppointmentItem({
  startTime,
  endTime,
  service,
  location,
}: AppointmentItemProps) {
  return (
    <div className="flex items-start gap-3 py-1">
      {/* Pink vertical bar */}
      <div className="relative flex-shrink-0 flex items-center justify-center w-8">
        {/* Glow effect */}
        <div
          className="absolute rounded-full bg-white opacity-80"
          style={{ width: 13, height: 90, filter: "blur(12px)" }}
        />
        {/* Bar */}
        <div
          className="relative rounded-full"
          style={{
            width: 11,
            height: 85,
            background: "#FFD0DC",
            border: "0.5px solid rgba(0,0,0,0.00)",
            boxShadow:
              "57px 60px 23px 0 rgba(0, 0, 0, 0.00), 36px 38px 21px 0 rgba(0, 0, 0, 0.01), 20px 22px 18px 0 rgba(0, 0, 0, 0.05), 9px 10px 13px 0 rgba(0, 0, 0, 0.09), 2px 2px 7px 0 rgba(0, 0, 0, 0.10)",
          }}
        />
      </div>

      {/* Appointment info */}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-3">
          <span
            className="text-[22px] font-medium text-black leading-tight"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
            {startTime}
          </span>
          <span
            className="text-[22px] font-medium text-black leading-tight"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
            {service}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span
            className="text-[13px] text-black/60 leading-tight"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
            {endTime}
          </span>
          <span
            className="text-[13px] text-black/60 leading-tight"
            style={{ fontFamily: "'Sofia Sans', sans-serif" }}
          >
            {location}
          </span>
        </div>
      </div>
    </div>
  );
}
