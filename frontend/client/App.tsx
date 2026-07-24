import "./global.css";
import { createContext, useContext, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { toast } from "sonner";

// Импорты всех страниц (оставьте как есть)
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
import AdminVerifyPage from "./pages/admin/AdminVerifyPage";
import AdminIndex from "./pages/admin/AdminIndex";
import AdminStatsPage from "./pages/admin/AdminStatsPage";
import AdminGuidesPage from "./pages/admin/AdminGuidesPage";

// ---------- Провайдер ----------
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

  const isDev = import.meta.env.MODE === 'development' && import.meta.env.VITE_DEV_MOCK === 'true';

  // Верификация через /security
  // 1. Измени сигнатуру функции verify, чтобы она принимала данные
  const verify = async (rawInitData?: string) => {
  // Используем переданный аргумент или (на всякий случай) состояние
  const dataToSend = rawInitData || initDataRaw; 

  if (!dataToSend) {
    if (isDev) {
      setIsVerified(true);
      toast.info("Режим разработки: авторизация пропущена");
      setIsLoading(false);
      return;
    } else {
      setError("Нет данных для верификации (initData)");
      setIsLoading(false);
      return;
    }
  }

  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/security/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Отправляем то, что пришло в аргументе
      body: JSON.stringify({ initData: dataToSend }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status === "success") {
      setIsVerified(true);
      toast.success("Авторизация подтверждена");
    } else {
      setError("Ошибка верификации на сервере");
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

// 2. В useEffect передавай initData напрямую
useEffect(() => {
  // ФУНКЦИЯ ПАРСИНГА ИЗ URL (Работает 100% везде)
  const getInitDataFromUrl = (): string | null => {
    // Telegram передает данные в window.location.hash (после #)
    const hash = window.location.hash.substring(1); 
    if (hash) {
      const params = new URLSearchParams(hash);
      const tgData = params.get('tgWebAppData');
      if (tgData) {
        // URLSearchParams автоматически делает decodeURIComponent
        return tgData; 
      }
    }
    // На всякий случай проверяем обычные query-параметры (?...)
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('tgWebAppData');
  };

  const tryInit = () => {
    try {
      // 1. СНАЧАЛА пробуем достать данные из URL
      const initDataFromUrl = getInitDataFromUrl();
      
      // 2. Пробуем использовать Telegram SDK
      const tg = window.Telegram?.WebApp;
      
      let initData = initDataFromUrl;
      let userId: number | null = null;

      if (tg) {
        tg.ready(); // Говорим Telegram, что мы готовы
        tg.expand(); // Разворачиваем окно на весь экран (опционально)
        
        // Если в URL ничего не было, берем из SDK
        if (!initData && tg.initData) {
          initData = tg.initData;
        }
        
        userId = tg.initDataUnsafe?.user?.id || null;
      }

      // Если мы в режиме разработки (нет ни URL, ни SDK)
      if (isDev && !initData) {
        setChatId(123456789);
        setInitDataRaw("mock_init_data");
        verify("mock_init_data");
        return true;
      }

      // Если есть initData (из URL или SDK)
      if (initData) {
        setInitDataRaw(initData);
        
        // Если нет userId из SDK, его можно вытащить из самой строки initData
        // (но для верификации на бэкенде userId в стейте не обязателен)
        if (userId) {
          setChatId(userId);
        }
        
        verify(initData); // Передаем строку напрямую, обходя stale closure
        return true;
      }

      return false; // Telegram SDK не загрузился, и в URL данных нет

    } catch (err) {
      console.error("Ошибка tryInit:", err);
      return false;
    }
  };

  // Пробуем один раз сразу
  if (!tryInit()) {
    // Если не получилось, даем скрипту Telegram еще немного времени загрузиться
    const interval = setInterval(() => {
      if (tryInit()) clearInterval(interval);
    }, 300);

    // Но если через 5 секунд всё ещё пусто, выдаем ошибку
    setTimeout(() => {
      clearInterval(interval);
      setIsLoading(false);
      setError("Telegram WebApp не инициализирован. Проверьте подключение к сети или CSP заголовки сервера.");
    }, 5000);

    return () => clearInterval(interval);
  }
}, []);

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

// ---------- Приложение (маршруты без изменений) ----------
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
            <Route path="/admin-verify" element={<AdminVerifyPage />} />
            <Route path="/admin" element={<AdminIndex />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/admin/stats" element={<AdminStatsPage />} />
            <Route path="/admin/guides" element={<AdminGuidesPage />} />
          </Routes>
        </TelegramAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);