import { Link } from "react-router-dom";
import GuidesCard from "@/components/GuidesCard";
import ScheduleCard from "@/components/ScheduleCard";
import ProfileCard from "@/components/ProfileCard";

export default function InfoSection() {
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-3">
      <Link to="/guides" className="row-span-2">
        <GuidesCard className="row-span-2" />
      </Link>
      <Link to="/schedule">
        <ScheduleCard />
      </Link>
      <Link to="/profile">
        <ProfileCard />
      </Link>
    </div>
  );
}
