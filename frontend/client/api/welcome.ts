// client/api/welcome.ts

import { useAuthFetch } from "./helpers";

export function useWelcomeApi() {
  const authFetch = useAuthFetch();

  return {
    fetchTodayAppointments: (masterId: string) => {
      const url = `/api/master/welcome?master_id=${masterId}`;
      return authFetch(url);
    },
  };
}