import "./global.css";
import { createContext, useContext, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";


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
import HeadbeautyIndexPage from "./pages/headbeauty/IndexHeadbeauty"
import AICategoryPage from "./pages/headbeauty/HeadbeautyCategory";
import AIHairCatsPage from "./pages/headbeauty/HairHeadbeautyCategory";
import AIHairPage from "./pages/headbeauty/HairHeadbeauty";

const queryClient = new QueryClient();


interface TelegramAuthContextType {
  initDataRaw: string | null;
}

const TelegramAuthContext = createContext<TelegramAuthContextType>({
  initDataRaw: null,
});

export const useTelegramAuth = () => useContext(TelegramAuthContext);

// ---------- Провайдер ----------
function TelegramAuthProvider({ children }: { children: React.ReactNode }) {
  const [initDataRaw, setInitDataRaw] = useState<string | null>(null);

  useEffect(() => {
    if (window.Telegram?.WebApp?.initData) {
      setInitDataRaw(window.Telegram.WebApp.initData);
    } else {

    }
  }, []);

  return (
    <TelegramAuthContext.Provider value={{ initDataRaw }}>
      {children}
    </TelegramAuthContext.Provider>
  );
}

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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TelegramAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);


createRoot(document.getElementById("root")!).render(<App />);