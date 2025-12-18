import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SelfAssessment from "./pages/SelfAssessment";
import Admin from "./pages/Admin";
import Rubrics from "./pages/Rubrics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/assessment" element={
              <ProtectedRoute>
                <SelfAssessment />
              </ProtectedRoute>
            } />
            <Route path="/manager" element={
              <ProtectedRoute requiredRoles={['manager', 'admin']}>
                <Dashboard /> {/* Placeholder - will create Manager page */}
              </ProtectedRoute>
            } />
            <Route path="/director" element={
              <ProtectedRoute requiredRoles={['director', 'admin']}>
                <Dashboard /> {/* Placeholder - will create Director page */}
              </ProtectedRoute>
            } />
            <Route path="/rubrics" element={
              <ProtectedRoute requiredRoles={['manager', 'director', 'admin']}>
                <Rubrics />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Admin />
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
