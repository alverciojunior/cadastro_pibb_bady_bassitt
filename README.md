# Sistema de Gestão de Membros — PIB Bady Bassitt

Aplicação para organização de famílias, membros e visitantes da **Primeira Igreja Batista de Bady Bassitt — SP**. O sistema oferece cadastro público, acompanhamento administrativo, comunicação e relatórios para apoio à liderança e à equipe de acolhimento.

## Funcionalidades

- Cadastro completo de famílias, incluindo dados de cônjuge e filhos.
- Cadastro simplificado de visitantes em `/cadastrovisitante`.
- Classificação de famílias como ativas, frequentantes, visitantes ou afastadas.
- Painel administrativo com busca, edição, histórico de alterações e controle de duplicidades.
- Dashboard de análise com indicadores de crescimento e distribuição por ministério.
- Controle de frequência em cultos e eventos.
- Importação e exportação de registros em CSV.
- Integração para mensagens de WhatsApp e notificações de aniversariantes.

## Tecnologias

| Camada | Tecnologias principais |
|---|---|
| Interface | React, TypeScript, Vite, Tailwind CSS e componentes shadcn/ui |
| Formulários | React Hook Form e Zod |
| Gráficos | Recharts |
| Backend | Node.js, Express e tRPC |
| Banco de dados | MySQL/TiDB com Drizzle ORM |
| Testes | Vitest |

## Rotas principais

| Rota | Finalidade |
|---|---|
| `/` | Página inicial com acessos de cadastro |
| `/cadastro` | Cadastro completo de família/membro |
| `/cadastrovisitante` | Cadastro rápido de visitante com nome e telefone |
| `/admin/login` | Acesso ao painel administrativo |
| `/dashboard` | Painel de indicadores |
| `/analytics` | Análises de famílias e ministérios |

## Desenvolvimento local

Instale as dependências e inicie o ambiente de desenvolvimento:

```bash
pnpm install
pnpm dev
```

Para validar a aplicação antes de publicar:

```bash
pnpm check
pnpm test
```

## Estrutura do projeto

```text
client/src/       Interface React, componentes e páginas
server/           Procedimentos tRPC e regras de negócio
drizzle/          Schema e configuração do banco de dados
shared/           Tipos e constantes compartilhados
```

## Manutenção

As credenciais administrativas, as configurações de comunicação e os dados de membros devem ser gerenciados somente por pessoas autorizadas pela liderança e pelo Departamento de Tecnologia da PIB Bady.

---

**PIB Bady Bassitt — Departamento de Tecnologia**
