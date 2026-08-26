// ARQUIVO: src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
// Importação do Speed Insights para React
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

// Importe suas páginas
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Confirmation from "./pages/Confirmation";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword"; //
import { ThemeProvider } from "./components/theme-provider";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Rota principal (protegida) */}
              <Route 
                path="/" 
                element={session ? <Index /> : <Navigate to="/auth" />} 
              />
              
              {/* Rota de Autenticação */}
              <Route 
                path="/auth" 
                element={!session ? <Auth /> : <Navigate to="/" />} 
              />

              {/* Rota de Confirmação */}
              <Route path="/confirmation" element={<Confirmation />} />

              {/* Rota de Redefinição de Senha */}
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Rota 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <SpeedInsights />
            <Analytics />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
