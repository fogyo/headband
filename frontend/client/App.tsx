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

  // Функция инициализации WebApp и извлечения данных
  const initializeWebApp = (): { initData: string; userId: number } | null => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return null;

    // Сообщаем Telegram, что приложение готово
    if (typeof tg.ready === 'function') tg.ready();
    if (typeof tg.expand === 'function') tg.expand();

    const initData = tg.initData || '';
    const user = tg.initDataUnsafe?.user;
    if (!user?.id) {
      // Если пользователь не получен, пробуем взять из initData (но обычно там нет)
      console.warn('Не удалось получить user.id из WebApp');
      return null;
    }

    return { initData, userId: user.id };
  };

  // Функция верификации (принимает initData)
  const verify = async (initData: string) => {
    if (!initData) {
      // Если initData пустая, мы не можем верифицировать, но можем считать пользователя гостем
      // В этом случае вы можете либо выставить ошибку, либо пропустить верификацию
      setError('initData отсутствует, верификация пропущена');
      setIsVerified(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/security/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status === 'success') {
        setIsVerified(true);
        toast.success('Авторизация подтверждена');
      } else {
        setError('Ошибка верификации');
        setIsVerified(false);
      }
    } catch (err: any) {
      console.error(err);
      setError('Не удалось верифицировать пользователя');
      toast.error('Ошибка авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  // Основной эффект: ожидание появления WebApp и запуск верификации
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10; // ~5 секунд (500ms * 10)
    let interval: NodeJS.Timeout | null = null;

    const attemptInit = () => {
      attempts++;
      const result = initializeWebApp();
      if (result) {
        // Успешно получили данные
        setChatId(result.userId);
        setInitDataRaw(result.initData);
        // Останавливаем поиск
        if (interval) clearInterval(interval);
        // Верификация запустится автоматически через useEffect ниже
        return;
      }

      // Если превысили лимит попыток
      if (attempts >= maxAttempts) {
        setError('Telegram WebApp не инициализирован');
        setIsLoading(false);
        if (interval) clearInterval(interval);
      }
    };

    // Первая попытка сразу
    attemptInit();

    // Если не получилось, запускаем интервал
    if (!window.Telegram?.WebApp) {
      interval = setInterval(attemptInit, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Отдельный эффект для запуска верификации, когда появился initDataRaw
  useEffect(() => {
    if (initDataRaw !== null && !isVerified && !isLoading) {
      verify(initDataRaw);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initDataRaw]); // Зависимость только от initDataRaw

  // Можно также добавить эффект, который сбрасывает isLoading, если верификация не требуется
  // Например, если initData пустая, мы уже выставили isLoading=false в verify

  return (
    <TelegramAuthContext.Provider
      value={{
        initDataRaw,
        chatId,
        isVerified,
        isLoading,
        error,
        verify: () => verify(initDataRaw || ''),
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