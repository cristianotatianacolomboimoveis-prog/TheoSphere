# TheoSphere - Portal Teológico & Geográfico (Supabase Auth)

Esta é uma aplicação web completa desenvolvida com **React**, **TypeScript**, **Vite** e **Tailwind CSS (v4)**, integrando a autenticação do **Supabase Auth**. A aplicação oferece suporte completo a login/cadastro por E-mail e Senha, além de autenticação social com Google e Apple.

---

## 🎨 Destaques de Design e Recursos

1. **Estética Holy Land Cinematic**: Uma belíssima imagem de pôr do sol em Jerusalém como plano de fundo (`holy_land_bg.png`), adaptada com overlays semitransparentes para excelente legibilidade.
2. **Glassmorphism Premium**: Container de autenticação centralizado com efeitos modernos de desfoque de fundo (`backdrop-filter`), bordas finas translúcidas e sombras suaves.
3. **Adaptação Nativa ao Sistema**: Suporte automático a temas claro e escuro sincronizados diretamente com as preferências do sistema operacional (`prefers-color-scheme`), utilizando a nova arquitetura do Tailwind CSS v4.
4. **Validações Robustas**: Tratamento proativo de erros em tempo real no cliente (email, senhas fracas, confirmação de senha) antes do envio ao servidor.
5. **Fluxos de Navegação Protegidos**: Roteamento privado nativo por meio do React Router DOM (v7), onde `/dashboard` é inacessível para usuários não logados.

---

## 🚀 Como Iniciar o Projeto Localmente

### 1. Clonar e Instalar as Dependências

Navegue até a pasta do projeto e instale todos os pacotes necessários:

```bash
cd supabase-auth-app
npm install
```

### 2. Configurar as Variáveis de Ambiente

Crie um arquivo `.env` na raiz da pasta `supabase-auth-app` (usando `.env.example` como base) e insira as credenciais do seu projeto Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto-id.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### 3. Executar o Servidor de Desenvolvimento

Inicie o servidor local do Vite:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

### 4. Compilar para Produção

Para validar a tipagem do TypeScript e gerar a pasta de build otimizada (`dist`):

```bash
npm run build
```

---

## ⚙️ Configuração do Supabase (Passo a Passo)

### 1. Criar o Projeto no Supabase
1. Acesse o [Console do Supabase](https://supabase.com).
2. Clique em **New Project** e selecione a sua organização.
3. Insira o nome do projeto (ex: `TheoSphere Auth`), defina uma senha forte para o banco de dados e selecione a região mais próxima.
4. Aguarde a inicialização do projeto.

### 2. Obter as Chaves de API
1. No painel do seu projeto Supabase, acesse **Project Settings** (ícone de engrenagem) > **API**.
2. Copie a **Project URL** e cole no seu `.env` como `VITE_SUPABASE_URL`.
3. Copie a **anon public key** e cole no seu `.env` como `VITE_SUPABASE_ANON_KEY`.

---

## 📧 Configurando o Provedor E-mail/Senha

1. No painel lateral do Supabase, vá em **Authentication** > **Providers** > **Email**.
2. Garanta que o provedor **Email** está **Enabled**.
3. *(Opcional para testes rápidos)*: Desative a opção **Confirm Email** se desejar que os novos usuários cadastrados façam login imediatamente sem precisar confirmar o e-mail de teste. Caso deixe ativado, use e-mails reais no cadastro para receber o link de verificação.

---

## 🔑 Configurando o Login com Google (OAuth)

### Passo 1: Configurar no Google Cloud Console
1. Acesse o [Google Cloud Console](https://console.cloud.google.com).
2. Crie um novo projeto ou selecione um existente.
3. Vá em **APIs & Services** > **OAuth consent screen**:
   - Escolha **External** e preencha as informações obrigatórias (Nome do App, E-mail de suporte).
   - Prossiga e clique em **Save and Continue**.
4. Vá em **APIs & Services** > **Credentials**:
   - Clique em **Create Credentials** > **OAuth client ID**.
   - Selecione **Web application** como tipo de aplicação.
   - Em **Authorized redirect URIs**, adicione a URL de callback do Supabase:
     ```text
     https://<SEU-PROJECT-REF>.supabase.co/auth/v1/callback
     ```
     *(Você pode encontrar `<SEU-PROJECT-REF>` na URL do seu painel Supabase)*.
5. Clique em **Create** e copie o **Client ID** e o **Client Secret** gerados.

### Passo 2: Habilitar no Supabase
1. No painel do Supabase, acesse **Authentication** > **Providers** > **Google**.
2. Altere o status para **Enabled**.
3. Cole o **Client ID** e o **Client Secret** obtidos no Google Cloud Console.
4. Clique em **Save**.

---

## 🍏 Configurando o Login com Apple (Sign in with Apple)

*Nota: Requer uma conta ativa no Apple Developer Program.*

### Passo 1: Configurar no Apple Developer Portal
1. Acesse o [Apple Developer Portal](https://developer.apple.com).
2. Vá em **Certificates, Identifiers & Profiles** > **Identifiers**:
   - Adicione um novo **App ID** para sua aplicação se ainda não possuir (ex: `com.theosphere.auth`).
   - Habilite o serviço **Sign in with Apple** nas capacidades do App ID.
3. Crie um novo **Services ID** (este identificador representa sua aplicação Web):
   - Preencha o identificador (ex: `com.theosphere.auth.service`).
   - Marque a caixinha **Sign in with Apple** e clique em **Configure**.
   - Em **Primary App ID**, selecione o App ID que você configurou no item anterior.
   - Em **Domains and Subdomains**, coloque o domínio do seu projeto Supabase:
     ```text
     <SEU-PROJECT-REF>.supabase.co
     ```
   - Em **Return URLs**, adicione a URL de callback do Supabase:
     ```text
     https://<SEU-PROJECT-REF>.supabase.co/auth/v1/callback
     ```
   - Salve e registre a configuração.
4. Crie uma Chave Privada (**Keys**):
   - Crie uma nova Key, dê um nome e marque **Sign in with Apple**.
   - Clique em **Configure**, selecione seu Primary App ID e clique em **Save**.
   - Faça o download do arquivo de chave privada (`.p8`). Copie também o **Key ID**.

### Passo 2: Habilitar no Supabase
1. No painel do Supabase, acesse **Authentication** > **Providers** > **Apple**.
2. Altere o status para **Enabled**.
3. Preencha as seguintes credenciais:
   - **Services ID (Client ID)**: O Services ID criado na Apple (ex: `com.theosphere.auth.service`).
   - **Team ID**: O ID da sua equipe de desenvolvedor Apple (visível no canto superior direito do Apple Developer Portal).
   - **Key ID**: O Key ID associado à chave privada gerada na Apple.
   - **Secret Key (Private Key)**: Abra o arquivo `.p8` baixado no bloco de notas e cole todo o conteúdo do certificado aqui.
4. Clique em **Save**.

---

## 📁 Estrutura Essencial do Projeto

```text
supabase-auth-app/
├── public/
│   └── holy_land_bg.png        # Imagem cinematográfica de fundo da Terra Santa
├── src/
│   ├── components/
│   │   └── ProtectedRoute.tsx  # Guarda de rotas privadas e spinner de carregamento
│   ├── context/
│   │   └── AuthContext.tsx     # Contexto global de estado de autenticação (Supabase)
│   ├── lib/
│   │   └── supabaseClient.ts   # Inicialização segura do Supabase JS Client
│   ├── pages/
│   │   ├── AuthPage.tsx        # UI de Login/Cadastro com Glassmorphism e adaptativo claro/escuro
│   │   └── DashboardPage.tsx   # Painel seguro com detalhes do usuário e encerramento de sessão
│   ├── App.tsx                 # Mapeador de rotas com React Router DOM v7
│   ├── index.css               # Folha de estilo global com Tailwind CSS v4
│   └── main.tsx                # Ponto de entrada do React
├── .env.example                # Modelo de arquivo de variáveis de ambiente
├── package.json                # Gerenciamento de scripts e dependências do projeto
└── README.md                   # Este guia detalhado
```

---

## 🔒 Segurança e Melhores Práticas
- **Rota Segura por Definição**: Qualquer acesso manual ou redirecionamento para `/dashboard` sem um token ou sessão ativa no Supabase é interceptado e redirecionado imediatamente para `/`.
- **Prevenção de Injeções/XSS**: Todos os inputs utilizam tratamento nativo controlado via React State, mantendo a integridade sanitária dos dados de entrada.
- **Tratamento Seguro de Chaves**: Nenhuma credencial crítica ou chave privada é exposta ao código do lado do cliente (client-side), mantendo o Client Secret do Google e o Certificado Apple operando exclusivamente sob a proteção do backend seguro do Supabase Auth.
