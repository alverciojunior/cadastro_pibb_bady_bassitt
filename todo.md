# TODO - Cadastro PIBB Bady Bassitt

## Banco de Dados / Backend
- [x] Schema: tabela families (id_familia, created_at)
- [x] Schema: tabela members (dados completos do membro, fk familia)
- [x] Schema: tabela member_children (filhos vinculados ao membro)
- [x] Schema: tabela member_updates (histórico de atualizações)
- [x] Migração e aplicação do schema no banco
- [x] Rotas tRPC: criar membro, atualizar membro, listar membros, buscar por ID
- [x] Rota tRPC: classificação automática de membros
- [x] Rota tRPC: detecção de duplicidade (CPF/telefone)
- [x] Rota tRPC: KPIs do dashboard
- [x] Rota tRPC: geração de observações pastorais com IA
- [x] Notificação automática para liderança ao novo cadastro/atualização

## Identidade Visual
- [x] Upload da logo da igreja para storage
- [x] Configurar cores e fontes da identidade visual (acolhedor, acessível)
- [x] Atualizar index.css com tema da igreja
- [x] Fontes grandes e acessíveis para idosos

## Formulário Multi-Etapas (Cadastro)
- [x] Etapa 1: Dados pessoais (nome, nascimento, sexo, estado civil, CPF)
- [x] Etapa 2: Contato (telefone, WhatsApp, email, endereço)
- [x] Etapa 3: Dados da Igreja (congregação, ministério, batismo, dízimo, frequência, dom)
- [x] Etapa 4 condicional: Dados do cônjuge (aparece se casado/união estável)
- [x] Etapa 5 condicional: Dados dos filhos (campos dinâmicos por quantidade)
- [x] Barra de progresso visual
- [x] Validação em cada etapa
- [x] Detecção de duplicidade em tempo real
- [x] Tela de confirmação/sucesso

## Painel Administrativo (Dashboard)
- [x] Layout com sidebar usando DashboardLayout
- [x] KPIs: total membros, frequentantes, famílias, batizados
- [x] KPIs: aniversariantes do mês, crescimento mensal
- [x] Gráfico de barras: membros por congregação/ministério
- [x] Gráfico de pizza: distribuição por categoria (ativo/frequentante/visitante/afastado)
- [x] Gráfico de linha: crescimento mensal
- [x] Gráfico de barras: faixa etária
- [x] Filtros: congregação, ministério, faixa etária, situação
- [x] Lista de membros com busca e filtros
- [x] Página de detalhes do membro
- [x] Edição de dados do membro pelo admin
- [x] Alertas de duplicidade no dashboard

## Funcionalidades Avançadas
- [x] Classificação automática (ativo/frequentante/visitante/afastado)
- [x] Geração de observações pastorais com IA
- [x] Notificação para liderança (novo cadastro / atualização)
- [x] Detecção de duplicidade por CPF e telefone
- [x] Controle de acesso: admin vs membro

## UX / Acessibilidade
- [x] Design mobile-first em todo o formulário
- [x] Fontes grandes (mínimo 16px, preferência 18px+)
- [x] Botões grandes e espaçados
- [x] Navegação intuitiva para idosos
- [x] Feedback visual claro em cada ação

## Melhorias Futuras (backlog)
- [ ] Exportação de relatórios em PDF/Excel
- [ ] Integração com WhatsApp Business API para mensagens automáticas
- [ ] Importação em massa via planilha
- [ ] Histórico de alterações por membro
- [ ] Módulo de frequência em cultos
- [ ] Notificações de aniversariantes automáticas

## WhatsApp e Notificações (Evolution API)
- [x] Tabela `whatsapp_config` para armazenar URL, API key e status da conexão
- [x] Router tRPC: salvar/atualizar configuração do Evolution API
- [x] Router tRPC: enviar mensagem de teste
- [x] Integração: envio automático de mensagem de boas-vindas ao criar membro
- [x] Integração: envio automático de mensagem ao atualizar cadastro
- [x] Heartbeat cron diário: notificação de aniversáriantes para a liderança
- [x] Endpoint /api/scheduled/birthday-notifications para o cron
- [x] Página de configuração WhatsApp no painel administrativo

## Histórico de Mensagens WhatsApp
- [x] Tabela `whatsapp_messages` para registrar todos os disparos
- [x] Registrar envio no histórico em todos os pontos de disparo (boas-vindas, atualização, aniversário, teste)
- [x] Router tRPC: listar histórico com filtros e paginação
- [x] Página de histórico de mensagens no painel administrativo
- [x] Item de menu "Histórico" na seção WhatsApp do sidebar

## Login Administrativo (usuário e senha)
- [x] Tabela `admin_users` com username, senha (hash bcrypt) e nome
- [x] Seed do admin padrão (admin / pibb2024)
- [x] Router tRPC: login com username+senha, retorna token JWT em cookie
- [x] Router tRPC: logout (limpa cookie)
- [x] Router tRPC: me (verifica sessão admin)
- [x] Middleware adminAuth para proteger rotas do painel
- [x] Tela de login (/admin/login) com identidade visual da igreja
- [x] Proteção de todas as rotas do painel (/dashboard, /membros, /whatsapp, etc.)
- [x] Botão "Painel Administrativo" na home redireciona para /admin/login
- [x] Redirecionamento automático após login bem-sucedido
