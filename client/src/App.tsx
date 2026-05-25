import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CadastroForm from "./pages/CadastroForm";
import Dashboard from "./pages/Dashboard";
import Membros from "./pages/Membros";
import MembroDetalhe from "./pages/MembroDetalhe";
import MembroEditar from "./pages/MembroEditar";
import WhatsappConfig from "./pages/WhatsappConfig";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/cadastro" component={CadastroForm} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/membros" component={Membros} />
      <Route path="/membros/:id" component={MembroDetalhe} />
      <Route path="/membros/:id/editar" component={MembroEditar} />
      <Route path="/whatsapp" component={WhatsappConfig} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
