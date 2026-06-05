import { useTelegramAuth } from "@/App";

export function useAuthFetch() {
  const { initDataRaw } = useTelegramAuth();

  return async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };
    if (initDataRaw) {
      headers["Authorization"] = `tma ${initDataRaw}`;
    }
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers,
    });
    if (!response.ok) {
      throw new Error(`Ошибка ${response.status}`);
    }
    return response.json();
  };
}