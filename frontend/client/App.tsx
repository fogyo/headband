import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Schedule from "./pages/Schedule";
import NotFound from "./pages/NotFound";
import GuidesPage from "./pages/Guides";
import GuideDetailPage from "./pages/GuideDetail";
import ProfilePage from "./pages/Profile";
import ProfilePersonalInfoPage from "./pages/ProfilePersonalInfo";
import ProfileSchedulePage from "./pages/ProfileSchedule";
import ProfilePriceListPage from "./pages/ProfilePriceList";
import ProfileIncomePage from "./pages/ProfileIncome";
import ProfileGuidesPage from "./pages/ProfileGuides";
import GuideManagePage from "./pages/GuideManage";
import ProfileWorksPage from "./pages/ProfileWorks";
import ProfileWorksDetailPage from "./pages/ProfileWorksDetail";
import ProfileNotificationsPage from "./pages/ProfileNotifications";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
