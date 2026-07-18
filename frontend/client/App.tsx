import "./global.css";
import { createContext, useContext, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { toast } from "sonner";

// Импорты страниц (оставляем без изменений)
import Index from "./pages/Index";
import Schedule from "./pages/master/Schedule";
import NotFound from "./pages/NotFound";
import GuidesPage from "./pages/master/Guides";
import GuideDetailPage from "./pages/master/GuideDetail";
import ProfilePage from "./pages/master/Profile";
import ProfilePersonalInfoPage from "./pages/master/ProfilePersonalInfo";
import ProfileSchedulePage from "./pages/master/ProfileSchedule";
import ProfilePriceListPage from "./pages/master/ProfilePriceList";
import ProfileIncomePage from "./pages/master/ProfileIncome";
import ProfileGuidesPage from "./pages/master/ProfileGuides";
import GuideManagePage from "./pages/master/GuideManage";
import ProfileWorksPage from "./pages/master/ProfileWorks";
import ProfileWorksDetailPage from "./pages/master/ProfileWorksDetail";
import ProfileNotificationsPage from "./pages/master/ProfileNotifications";
import UserIndexPage from "./pages/client/UserIndex";
import CategoryMastersPage from "./pages/client/CategoryMastersPage";
import MasterPriceListPage from "./pages/client/MasterPriceListPage";
import BookAppointmentPage from "./pages/client/BookAppointmentsPage";
import HeadbeautyIndexPage from "./pages/headbeauty/IndexHeadbeauty";
import AICategoryPage from "./pages/headbeauty/HeadbeautyCategory";
import AIHairCatsPage from "./pages/headbeauty/HairHeadbeautyCategory";
import AIHairPage from "./pages/headbeauty/HaircutHeadbeauty";
import AIBeardPage from "./pages/headbeauty/BeardHeadbeauty";
import AIColorPage from "./pages/headbeauty/ColorHeadbeauty";
import AIPermPage from "./pages/headbeauty/PermHeadbeauty";
import AIPreviewPage from "./pages/headbeauty/PreviewHeadbeauty";
import AIHistoryPage from "./pages/headbeauty/HeadbeautyHistory";

const queryClient = new QueryClient();

interface TelegramAuthContextType {
  initDataRaw: string | null;
  chatId: number | null;
  isVerified: boolean;
  isLoading: boolean;
  error: string | null;
  verify: () => Promise<void>;
}

const TelegramAuthContext = createContext<TelegramAuthContextType>({
  initDataRaw: null,
  chatId: null,
  isVerified: false,
  isLoading: true,
  error: null,
  verify: async () => {},
});

export const useTelegramAuth = () => useContext(TelegramAuthContext);

function TelegramAuthProvider({ children }: { children: React.ReactNode }) {
  const [initDataRaw, setInitDataRaw] = useState<string | null>(null);
  const [chatId, setChatId] = useState<number | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Функция попытки получить данные из Telegram WebApp
  const tryInitTelegram = () => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      // Инициализация WebApp, если она ещё не выполнена
      if (typeof tg.ready === "function") tg.ready();

      const initData = tg.initData;
      const user = tg.initDataUnsafe?.user;
      if (user?.id) {
        setChatId(user.id);
        if (initData) {
          setInitDataRaw(initData);
          return true;
        } else {
          // initData может быть пустым, если бот не передал данные
          // но id пользователя есть – можно попытаться верифицировать без initData? 
          // Лучше запросить верификацию отдельно, но пока пропустим.
          setError("initData отсутствует, проверка невозможна");
          return false;
        }
      } else {
        setError("Не удалось получить ID пользователя");
        return false;
      }
    }
    return false;
  };

  // Функция верификации (без изменений)
  const verify = async () => {
    if (!initDataRaw) {
      setError("Нет данных для верификации");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/security/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: initDataRaw }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status === "success") {
        setIsVerified(true);
        toast.success("Авторизация подтверждена");
      } else {
        setError("Ошибка верификации");
        setIsVerified(false);
      }
    } catch (err: any) {
      console.error(err);
      setError("Не удалось верифицировать пользователя");
      toast.error("Ошибка авторизации");
    } finally {
      setIsLoading(false);
    }
  };

  // Основной эффект – ожидание появления window.Telegram
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10; // ~5 секунд
    let interval: NodeJS.Timeout | null = null;

    const checkTelegram = () => {
      attempts++;
      const success = tryInitTelegram();
      if (success) {
        // Данные получены – запускаем верификацию
        if (initDataRaw) verify();
        else {
          // Если initData нет, но chatId есть – считаем верифицированным? 
          // Для продакшена лучше не делать, но для разработки можно.
          // Пока оставим как есть.
          setIsLoading(false);
        }
        if (interval) clearInterval(interval);
        return;
      }

      if (attempts >= maxAttempts) {
        // Не удалось получить Telegram WebApp
        setError("Telegram WebApp не инициализирован");
        setIsLoading(false);
        if (interval) clearInterval(interval);
      }
    };

    // Пробуем сразу
    checkTelegram();

    // Если не получилось – запускаем интервал
    if (!window.Telegram?.WebApp) {
      interval = setInterval(checkTelegram, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Автоматическая верификация при получении initData
  useEffect(() => {
    if (initDataRaw && !isVerified && !isLoading) {
      verify();
    }
  }, [initDataRaw]);

  return (
    <TelegramAuthContext.Provider
      value={{
        initDataRaw,
        chatId,
        isVerified,
        isLoading,
        error,
        verify,
      }}
    >
      {children}
    </TelegramAuthContext.Provider>
  );
}

// ---------- Приложение ----------
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TelegramAuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/guides" element={<GuidesPage />} />
            <Route path="/guide/:id" element={<GuideDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/personal-info" element={<ProfilePersonalInfoPage />} />
            <Route path="/profile/schedule" element={<ProfileSchedulePage />} />
            <Route path="/profile/price-list" element={<ProfilePriceListPage />} />
            <Route path="/profile/income" element={<ProfileIncomePage />} />
            <Route path="/profile/guides" element={<ProfileGuidesPage />} />
            <Route path="/profile/guides/new" element={<GuideManagePage />} />
            <Route path="/profile/guides/:id/edit" element={<GuideManagePage />} />
            <Route path="/profile/portfolio" element={<ProfileWorksPage />} />
            <Route path="/profile/portfolio/:hashtag" element={<ProfileWorksDetailPage />} />
            <Route path="/profile/notifications" element={<ProfileNotificationsPage />} />
            <Route path="/category/:category" element={<CategoryMastersPage />} />
            <Route path="/user" element={<UserIndexPage />} />
            <Route path="/booking/:masterId" element={<MasterPriceListPage />} />
            <Route path="/booking/:masterId/:serviceId" element={<BookAppointmentPage />} />
            <Route path="/headbeauty" element={<HeadbeautyIndexPage />} />
            <Route path="/headbeauty-category/:gender" element={<AICategoryPage />} />
            <Route path="/headbeauty-hair-category/:gender" element={<AIHairCatsPage />} />
            <Route path="/headbeauty-hair/:gender" element={<AIHairPage />} />
            <Route path="/headbeauty-beard/:gender" element={<AIBeardPage />} />
            <Route path="/headbeauty-coloring/:gender" element={<AIColorPage />} />
            <Route path="/headbeauty-perm/:gender" element={<AIPermPage />} />
            <Route path="/headbeauty-preview" element={<AIPreviewPage />} />
            <Route path="/headbeauty-history" element={<AIHistoryPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TelegramAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);