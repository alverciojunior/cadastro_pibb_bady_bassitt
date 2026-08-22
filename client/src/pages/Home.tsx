import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ClipboardList, Users, Heart, BookOpen, Shield, ArrowRight } from "lucide-react";

const LOGO_URL = "/manus-storage/pibb_logo_977c9cca.png";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Header */}
      <header className="church-gradient text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={LOGO_URL}
              alt="PIB Bady Bassitt"
              className="h-16 w-auto object-contain"
            />
            <div>
              <h1 className="text-lg font-serif font-bold leading-tight">
                Primeira Igreja Batista
              </h1>
              <p className="text-blue-200 text-sm">Bady Bassitt - SP</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin/login">
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
              >
                <Shield size={16} />
                <span className="hidden sm:inline">Painel de Gestão</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary-foreground px-4 py-2 rounded-full text-sm font-medium mb-6 border border-secondary/30">
            <Heart size={14} className="text-secondary" />
            Sistema de Gestão de Membros
          </div>

          <h2 className="text-4xl sm:text-5xl font-serif font-bold text-primary mb-5 leading-tight">
            Bem-vindo(a) à<br />
            <span className="gold-accent">PIB Bady Bassitt</span>
          </h2>

          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Atualize seu cadastro na nossa igreja de forma simples e rápida.
            Seu registro nos ajuda a cuidar melhor de você e de sua família.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cadastro">
              <Button
                size="lg"
                className="h-16 px-8 text-lg font-semibold bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-3 w-full sm:w-auto shadow-lg"
              >
                <ClipboardList size={22} />
                Registrar um Membro
                <ArrowRight size={18} />
              </Button>
            </Link>

            <Link href="/cadastrovisitante">
              <Button
                size="lg"
                variant="outline"
                className="h-16 px-8 text-lg font-semibold gap-3 w-full sm:w-auto border-primary/25 bg-white text-primary hover:bg-primary/5"
              >
                <Heart size={22} />
                Registrar um Visitante
              </Button>
            </Link>

          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-serif font-bold text-center text-primary mb-8">
            Por que atualizar seu cadastro?
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Heart className="text-red-500" size={28} />,
                title: "Cuidado Pastoral",
                desc: "Ajuda o pastor e a liderança a cuidar melhor de você e de sua família.",
              },
              {
                icon: <Users className="text-blue-600" size={28} />,
                title: "Comunidade Unida",
                desc: "Fortalece os laços entre os membros e permite uma comunicação mais eficiente.",
              },
              {
                icon: <BookOpen className="text-green-600" size={28} />,
                title: "Ministérios",
                desc: "Facilita a organização dos ministérios e o envolvimento de cada membro.",
              },
              {
                icon: <ClipboardList className="text-purple-600" size={28} />,
                title: "Simples e Rápido",
                desc: "Formulário fácil de preencher, especialmente pelo celular.",
              },
              {
                icon: <Shield className="text-amber-600" size={28} />,
                title: "Seguro e Privado",
                desc: "Seus dados são protegidos e acessados apenas pela liderança da igreja.",
              },
              {
                icon: <Heart className="text-pink-500" size={28} />,
                title: "Família Completa",
                desc: "Cadastre cônjuge e filhos no mesmo formulário, com um código familiar único.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-border/60 bg-white hover:shadow-md transition-shadow duration-200"
              >
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h4 className="font-semibold text-base mb-2">{f.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="church-gradient text-white py-12 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <h3 className="text-2xl font-serif font-bold mb-3">
            Pronto para se cadastrar?
          </h3>
          <p className="text-blue-200 mb-6">
            Leva apenas alguns minutos. Clique no botão abaixo e preencha o formulário.
          </p>
          <Link href="/cadastro">
            <Button
              size="lg"
              className="h-14 px-8 text-lg font-semibold bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2"
            >
              <ClipboardList size={20} />
              Iniciar Cadastro
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 px-4 text-center text-sm">
        <p>© 2026 Primeira Igreja Batista de Bady Bassitt - SP</p>
        <p className="mt-1">Sistema de Gestão de Membros - Departamento de Tecnologia PIB Bady</p>
      </footer>
    </div>
  );
}
