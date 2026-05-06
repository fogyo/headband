import AppointmentItem from "@/components/AppointmentItem";
import RestBreak from "@/components/RestBreak";
import HeadbeautyAICard from "@/components/HeadbeautyAICard";
import InfoSection from "@/components/InfoSection";

export default function Index() {
  const appointments = [
    {
      startTime: "10:00",
      endTime: "10:40",
      service: "Стрижка",
      location: "Невский пр-кт 12",
    },
    { type: "break" as const, label: "Отдых 2 часа 20 минут" },
    {
      startTime: "13:00",
      endTime: "14:30",
      service: "Покраска",
      location: "Мелирование",
    },
    { type: "break" as const, label: "Отдых 30 минут" },
    {
      startTime: "15:00",
      endTime: "16:10",
      service: "Укладка",
      location: "Невский пр-кт 12",
    },
    {
      startTime: "16:10",
      endTime: "16:50",
      service: "Стрижка",
      location: "Британка",
    },
    { type: "break" as const, label: "Отдых 10 минут" },
    {
      startTime: "17:00",
      endTime: "17:40",
      service: "Стрижка",
      location: "Фэйд",
    },
    {
      startTime: "17:40",
      endTime: "18:50",
      service: "Укладка",
      location: "Невский пр-кт 12",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10">
        {/* Header */}
        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{
              fontFamily: "Poppins, sans-serif",
              WebkitTextStroke: "1px #000",
            }}
          >
            good morning
          </h1>
          <p
            className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]"
            style={{
              fontFamily: "Poppins, sans-serif",
              WebkitTextStroke: "0.4px #000",
            }}
          >
            version for masters
          </p>
        </div>

        {/* Актуальное Section */}
        <section className="mt-6">
          <div className="mb-4">
            <h2
              className="text-[40px] leading-tight tracking-[-2px] text-black"
              style={{ fontFamily: "'Sofia Sans', sans-serif" }}
            >
              Актуальное
            </h2>
            <div className="h-px bg-black w-[210px]" />
          </div>

          <div className="flex flex-col gap-1">
            {appointments.map((item, i) => {
              if ("type" in item) {
                return <RestBreak key={i} label={item.label} />;
              }
              return (
                <AppointmentItem
                  key={i}
                  startTime={item.startTime}
                  endTime={item.endTime}
                  service={item.service}
                  location={item.location}
                />
              );
            })}
          </div>
        </section>

        {/* headbeauty Section */}
        <section className="mt-10">
          <div className="mb-3">
            <h2
              className="text-[40px] leading-tight tracking-[-2px] text-black"
              style={{ fontFamily: "'Sofia Sans', sans-serif" }}
            >
              headbeauty
            </h2>
            <div className="h-px bg-black w-[210px]" />
          </div>
          <HeadbeautyAICard />
        </section>

        {/* Информация Section */}
        <section className="mt-10">
          <div className="mb-4">
            <h2
              className="text-[40px] leading-tight tracking-[-2px] text-black"
              style={{ fontFamily: "'Sofia Sans', sans-serif" }}
            >
              Информация
            </h2>
            <div className="h-px bg-black w-[210px]" />
          </div>
          <InfoSection />
        </section>
      </div>
    </div>
  );
}
