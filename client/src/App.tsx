import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AdminGuard from "./components/AdminGuard";
import Home from "./pages/Home";
import CadastroForm from "./pages/CadastroForm";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import Membros from "./pages/Membros";
import MembroDetalhe from "./pages/MembroDetalhe";
import MembroEditar from "./pages/MembroEditar";
import MembroHistorico from "./pages/MembroHistorico";
import WhatsappConfig from "./pages/WhatsappConfig";
import WhatsappHistorico from "./pages/WhatsappHistorico";
import AdminUsuarios from "./pages/AdminUsuarios";
import Frequencia from "./pages/Frequencia";
import Exportacao from "./pages/Exportacao";
import Importacao from "./pages/Importacao";
import DadosInvalidos from "./pages/DadosInvalidos";
import { AnalyticsDashboard } from "./pages/AnalyticsDashboard";
import CadastroVisitante from "./pages/CadastroVisitante";
import EmailAlertsConfig from "./pages/EmailAlertsConfig";

// Wrapper para rotas protegidas pelo AdminGuard
function ProtectedDashboard() {
  return <AdminGuard><Dashboard /></AdminGuard>;
}
function ProtectedMembros() {
  return <AdminGuard><Membros /></AdminGuard>;
}
function ProtectedMembroDetalhe() {
  return <AdminGuard><MembroDetalhe /></AdminGuard>;
}
function ProtectedMembroEditar() {
  return <AdminGuard><MembroEditar /></AdminGuard>;
}
function ProtectedWhatsappConfig() {
  return <AdminGuard><WhatsappConfig /></AdminGuard>;
}
function ProtectedWhatsappHistorico() {
  return <AdminGuard><WhatsappHistorico /></AdminGuard>;
}
function ProtectedAdminUsuarios() {
  return <AdminGuard><AdminUsuarios /></AdminGuard>;
}
function ProtectedMembroHistorico() {
  return <AdminGuard><MembroHistorico /></AdminGuard>;
}
function ProtectedFrequencia() {
  return <AdminGuard><Frequencia /></AdminGuard>;
}
function ProtectedExportacao() {
  return <AdminGuard><Exportacao /></AdminGuard>;
}
function ProtectedImportacao() {
  return <AdminGuard><Importacao /></AdminGuard>;
}
function ProtectedDadosInvalidos() {
  return <AdminGuard><DadosInvalidos /></AdminGuard>;
}
function ProtectedAnalyticsDashboard() {
  return <AdminGuard><AnalyticsDashboard /></AdminGuard>;
}
function ProtectedEmailAlertsConfig() {
  return <AdminGuard><EmailAlertsConfig /></AdminGuard>;
}

function Router() {
  return (
    <Switch>
      {/* Rotas públicas */}
      <Route path="/" component={Home} />
      <Route path="/cadastro" component={CadastroForm} />
      <Route path="/cadastrovisitante" component={CadastroVisitante} />
      <Route path="/admin/login" component={AdminLogin} />

      {/* Rotas protegidas — exigem login de administrador */}
      <Route path="/dashboard" component={ProtectedDashboard} />
      <Route path="/membros" component={ProtectedMembros} />
      <Route path="/membros/:id/editar" component={ProtectedMembroEditar} />
      <Route path="/membros/:id/historico" component={ProtectedMembroHistorico} />
      <Route path="/membros/:id" component={ProtectedMembroDetalhe} />
      <Route path="/frequencia" component={ProtectedFrequencia} />
      <Route path="/exportacao" component={ProtectedExportacao} />
      <Route path="/importacao" component={ProtectedImportacao} />
      <Route path="/dados-invalidos" component={ProtectedDadosInvalidos} />
      <Route path="/whatsapp" component={ProtectedWhatsappConfig} />
      <Route path="/whatsapp/historico" component={ProtectedWhatsappHistorico} />
      <Route path="/admin/usuarios" component={ProtectedAdminUsuarios} />
      <Route path="/analytics" component={ProtectedAnalyticsDashboard} />
      <Route path="/alertas-email" component={ProtectedEmailAlertsConfig} />

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
