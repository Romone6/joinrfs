import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AdminShell } from "./components/admin/AdminShell";
import FollowUpsPage from "./pages/admin/FollowUps";
import LeadsPage from "./pages/admin/Leads";
import LeadDetailPage from "./pages/admin/LeadDetail";
import AnalyticsPage from "./pages/admin/Analytics";
import SettingsPage from "./pages/admin/Settings";
import HealthPage from "./pages/admin/Health";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<AdminShell><FollowUpsPage /></AdminShell>} />
          <Route path="/admin/follow-ups" element={<AdminShell><FollowUpsPage /></AdminShell>} />
          <Route path="/admin/leads" element={<AdminShell><LeadsPage /></AdminShell>} />
          <Route path="/admin/leads/:id" element={<AdminShell><LeadDetailPage /></AdminShell>} />
          <Route path="/admin/analytics" element={<AdminShell><AnalyticsPage /></AdminShell>} />
          <Route path="/admin/settings" element={<AdminShell><SettingsPage /></AdminShell>} />
          <Route path="/admin/health" element={<AdminShell><HealthPage /></AdminShell>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
