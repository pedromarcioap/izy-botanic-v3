# Izy Botanic - Assistente Pessoal de Cuidados com Plantas

Bem-vindo ao Izy Botanic, seu assistente inteligente para jardinagem. Esta aplicação foi projetada para ajudar entusiastas de plantas, desde iniciantes a experientes, a cuidar de seu jardim com a ajuda da inteligência artificial.

## 🌿 Funcionalidades Principais

Izy Botanic oferece um conjunto completo de ferramentas para gerenciar e entender as necessidades de suas plantas:

- **Autenticação de Usuários**: Sistema de cadastro e login para gerenciar múltiplos usuários de forma independente.
- **Dashboard Central**: Uma visão geral do seu jardim, com um resumo de alertas de cuidados, dicas sazonais e um menu de acesso rápido às principais funcionalidades.
- **Análise de Plantas com IA**:
    - **Identificação de Espécies**: Envie uma foto da sua planta, e a IA (Google Gemini) a identificará, fornecendo o nome popular e científico.
    - **Diagnóstico de Saúde**: A IA analisa a saúde da planta, identificando problemas como estresse hídrico, deficiências nutricionais ou pragas.
    - **Plano de Cuidados Personalizado**: Receba instruções detalhadas sobre rega, luz solar, tipo de solo e fertilização, além de um cronograma de cuidados para criar alertas.
- **Meu Jardim**:
    - **Visualização de Plantas**: Todas as suas plantas adicionadas são exibidas em um formato de galeria.
    - **Página de Detalhes da Planta**: Uma visão completa de cada planta, incluindo seu diagnóstico, cronograma de cuidados, tarefas personalizadas e um diário de anotações.
- **Calendário de Cuidados**: Uma agenda para os próximos 7 dias que mostra todas as tarefas de cuidado pendentes (rega, adubação e tarefas personalizadas), permitindo que você marque-as como concluídas.
- **Especialista AI (Chatbot)**: Converse com a Izy, uma especialista em botânica com IA, para tirar dúvidas sobre jardinagem, como "qual a melhor época para podar minhas rosas?".
- **Recomendações Inteligentes**: Com base nas plantas que você já possui, a IA sugere novas espécies que se adaptariam bem ao seu jardim.
- **Sistema de Conquistas**: Desbloqueie conquistas ao atingir marcos, como adicionar sua primeira planta ou manter um jardim saudável.
- **Gerenciamento de Tarefas**:
    - **Tarefas Principais**: Edite a frequência de rega e adubação.
    - **Tarefas Adicionais**: Crie, edite e remova tarefas personalizadas (ex: poda, verificação de pragas, limpeza de folhas) com frequências específicas.

## 🏗️ Arquitetura e Tecnologias

Izy Botanic é uma **Aplicação de Página Única (SPA)** construída inteiramente no lado do cliente (client-side).

- **Framework**: **React 19** com **TypeScript**.
- **Gerenciamento de Estado**: **React Context API** é utilizado para gerenciar o estado global da aplicação de forma centralizada (`AppContext`).
- **Roteamento**: **React Router** (`HashRouter`) gerencia a navegação entre as diferentes páginas.
- **Persistência de Dados**: **`localStorage`** é usado para armazenar todos os dados do usuário, incluindo perfis, plantas, histórico e configurações. **Esta abordagem não é segura para produção** e serve apenas para fins de demonstração.
- **Inteligência Artificial**: **Google Gemini (gemini-2.5-flash)** através do SDK `@google/genai`. A IA é usada para:
    1.  `analyzePlantImage`: Analisar uma imagem e retornar um JSON estruturado com o diagnóstico.
    2.  `getPlantRecommendations`: Sugerir novas plantas com base no jardim atual.
    3.  `getExpertAnswer`: Potencializar o chatbot especialista.
- **Estilização**: **TailwindCSS** (inferido pela sintaxe das classes nos componentes) para uma UI moderna e responsiva.
- **Build Tool**: **Vite** para desenvolvimento e build rápidos.

## 🚀 Como Executar Localmente

Para executar o Izy Botanic em seu ambiente local, siga estes passos:

**Pré-requisitos:**
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) (geralmente instalado com o Node.js)

**1. Clone o Repositório**
```bash
git clone <URL_DO_REPOSITORIO>
cd <NOME_DO_DIRETORIO>
```

**2. Instale as Dependências**
```bash
npm install
```

**3. Configure a API Key do Google Gemini**

A aplicação depende da API do Google Gemini para suas funcionalidades de IA.

- Obtenha uma API Key no [Google AI Studio](https://aistudio.google.com/app/apikey).
- Crie um arquivo `.env` na raiz do projeto.
- Adicione sua chave ao arquivo da seguinte forma:

```
VITE_API_KEY="SUA_API_KEY_AQUI"
```

> **Nota**: O prefixo `VITE_` é obrigatório para que o Vite exponha a variável de ambiente para o código do cliente.

**4. Inicie o Servidor de Desenvolvimento**
```bash
npm run dev
```
A aplicação estará disponível em `http://localhost:5173` (ou outra porta, se a 5173 estiver em uso).

## 🔐 Segurança e Considerações

- **Persistência de Dados via `localStorage`**:
    - **Inseguro**: `localStorage` é acessível via JavaScript, o que o torna vulnerável a ataques de Cross-Site Scripting (XSS). Em um ambiente de produção, informações sensíveis como senhas (mesmo hasheadas) e dados do usuário nunca devem ser armazenadas dessa forma.
    - **Solução Recomendada**: Para uma aplicação real, seria necessário um **backend dedicado** com um banco de dados seguro (ex: PostgreSQL, MongoDB). A autenticação seria gerenciada por tokens (ex: JWT) armazenados de forma segura (ex: cookies `HttpOnly`).

- **Gerenciamento de Senhas**:
    - A aplicação utiliza `crypto.subtle.digest('SHA-256', ...)` para fazer o hash da senha no cliente. Embora seja melhor que armazenar em texto plano, **isso ainda é inseguro**. O hash deve ser computado no backend, e um algoritmo mais robusto como **bcrypt** deve ser usado.

## 🔌 Utilização da API (Google Gemini)

A interação com a API do Google Gemini é central para a aplicação e está encapsulada no arquivo `services/geminiService.ts`.

- **Modo Mock (API Key Ausente)**: Se a variável de ambiente `VITE_API_KEY` não for fornecida, o serviço opera em um **modo de mock**. Em vez de fazer chamadas reais à API, ele retorna dados estáticos (`mockAnalysis`, `mockRecommendations`, etc.) após um breve `setTimeout`. Isso permite o desenvolvimento e teste da UI sem consumir cotas da API.

- **Schemas de Resposta**: Para garantir que a IA retorne dados consistentes e previsíveis, a aplicação define esquemas JSON rigorosos (`plantAnalysisSchema`, `recommendationSchema`) que são enviados junto com as requisições. O Gemini é instruído a formatar sua resposta estritamente de acordo com esses esquemas.

- **Funções Principais**:
    - `analyzePlantImage`: Envia a imagem da planta (em formato base64) e um prompt detalhado solicitando a análise.
    - `getPlantRecommendations`: Envia uma lista de nomes de plantas do usuário e pede por três novas recomendações.
    - `getExpertAnswer`: Mantém o histórico da conversa para fornecer respostas contextuais no chat com o especialista.