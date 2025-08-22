# 🌿 Izy Botanic: Sua Assistente Pessoal para Cuidado de Plantas

![Izy Botanic Dashboard](https://i.imgur.com/example-image.png) <!--- Placeholder para uma captura de tela do painel do aplicativo -->

**Izy Botanic** é uma aplicação web inteligente, potencializada por IA, projetada para ajudar amantes de plantas de todos os níveis a cuidar de suas companheiras verdes. Utilizando o poder da API Gemini do Google, a Izy oferece identificação instantânea de plantas, diagnósticos de saúde, cronogramas de cuidado personalizados e conselhos de especialistas, tudo dentro de uma interface bonita e intuitiva.

O projeto é construído com uma filosofia **serverless e focada na privacidade**. Todos os seus dados, desde as plantas até o histórico de conversas, são armazenados de forma segura no `localStorage` do seu navegador, garantindo que você tenha controle total e acesso offline.

---

## ✨ Funcionalidades em Detalhe

### 📸 Análise de Plantas com IA Vision
-   **Identificação Instantânea:** Tire uma foto da sua planta e faça o upload. A IA Vision do `gemini-2.5-flash` analisa as características visuais (formato da folha, venação, cor) para identificar a espécie.
-   **Nível de Confiança e Alternativas:** A IA fornece um nível de confiança ('Alta', 'Média', 'Baixa') na identificação. Se a confiança não for alta, sugere espécies alternativas com explicações, ajudando a garantir a identificação correta.
-   **Diagnóstico de Saúde:** A análise vai além da identificação, avaliando se a planta parece saudável e detectando sinais visuais de problemas como pragas, doenças ou estresse nutricional.

### 🩺 Suíte de Saúde Completa
-   **Diagnóstico Detalhado:** Receba um relatório abrangente sobre a condição da sua planta, incluindo um título de diagnóstico (ex: "Sinais de Excesso de Água") e uma descrição detalhada.
-   **Análise de Pragas e Doenças:** Se um problema for detectado, a IA fornece uma análise específica, incluindo o nome do problema, descrição e um plano de tratamento sugerido.
-   **Plano de Cuidados Essenciais:** Com base na espécie identificada, a IA gera instruções claras e concisas para rega, luz solar, tipo de solo e fertilização.

### 📅 Hub de Cuidados Dinâmico
-   **Cronogramas Personalizados:** Receba automaticamente cronogramas de rega e adubação com base nas necessidades específicas da sua planta.
-   **Alertas e Calendário:** O aplicativo gera alertas para tarefas pendentes e exibe um calendário de 7 dias com todas as atividades de cuidado, garantindo que você nunca perca uma tarefa importante.
-   **Tarefas Personalizadas:** Vá além do básico. Adicione, edite e acompanhe tarefas personalizadas como `Poda`, `Borrifar Folhas`, `Transplante` ou `Verificar Pragas`, com ícones e frequências customizáveis.

### 💬 Converse com uma Especialista IA
-   **Conselhos Sob Demanda:** Tem uma pergunta específica? Converse com a "Izy", nossa botânica IA amigável, configurada com uma instrução de sistema para ser uma especialista prestativa.
-   **Contexto de Conversa:** A IA lembra o histórico da sua conversa, permitindo perguntas de acompanhamento e um diálogo natural e coeso.
-   **Respostas Abrangentes:** Pergunte sobre qualquer tópico relacionado a plantas, desde os melhores tipos de solo e fertilizantes até o controle de pragas orgânico e técnicas de poda.

### 🌱 Recomendações Inteligentes
-   **Expanda seu Jardim com Confiança:** Com base na lista de plantas que você já possui, a IA da Izy sugere novas plantas que provavelmente prosperariam em condições de cuidado semelhantes.
-   **Justificativas Claras:** Cada recomendação vem com um motivo, explicando por que a nova planta seria uma boa adição à sua coleção.

### 📔 Diário Digital da Planta
-   **Acompanhe o Progresso:** Mantenha um diário detalhado para cada planta. Adicione notas escritas e fotos para registrar seu crescimento, floração e saúde ao longo do tempo.
-   **Histórico Visual:** O diário cria uma linha do tempo visual e textual, ajudando você a entender melhor a evolução de cada planta.

### 🏆 Gamificação e Conquistas
-   **Mantenha-se Motivado:** Desbloqueie conquistas por marcos importantes, como adicionar sua primeira planta, cuidar de uma planta doente até sua recuperação ou manter um jardim com 5 plantas saudáveis.

---

## 🛠️ Tecnologias e Dependências

Este projeto utiliza uma abordagem moderna e sem etapa de compilação (`buildless`), carregando dependências diretamente no navegador através de `importmap`.

-   **Frontend:** [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
-   **Motor de IA:** [Google Gemini API](https://ai.google.dev/) (modelo `gemini-2.5-flash`)
-   **Gerenciamento de Dependências (via `importmap` a partir do CDN esm.sh):**
    -   `react` & `react-dom`
    -   `react-router-dom`
    -   `@google/genai`
-   **Roteamento:** [React Router](https://reactrouter.com/)
-   **Ícones:** Um conjunto de ícones SVG personalizados e otimizados.

---

## 🚀 Como Começar (Desenvolvimento Local)

Siga estas instruções para obter uma cópia local funcionando para desenvolvimento e testes.

### Pré-requisitos

-   Um navegador web moderno (Chrome, Firefox, Safari, Edge).
-   Uma chave de API do Google Gemini. Você pode obter uma no [Google AI Studio](https://aistudio.google.com/app/apikey).
-   Git instalado na sua máquina.
-   (Opcional, mas recomendado) Python 3 ou Node.js para executar um servidor local.

### Instalação e Configuração

1.  **Clone o Repositório:**
    ```bash
    git clone https://github.com/pedromarcioap/izy-botanic.git
    cd izy-botanic
    ```

2.  **Configure as Variáveis de Ambiente:**
    O aplicativo requer uma chave de API do Google Gemini para funcionar. A aplicação espera que esta chave esteja disponível em `process.env.API_KEY`.

    Para desenvolvimento local, você pode simular isso editando o arquivo `index.html`. Encontre a seção `<head>` e adicione a seguinte tag de script **antes** do script `importmap`:

    ```html
    <script>
      // AVISO: Apenas para desenvolvimento local. Não envie sua chave de API para o repositório.
      window.process = {
        env: {
          API_KEY: 'SUA_CHAVE_DE_API_GEMINI_AQUI'
        }
      };
    </script>
    ```
    Substitua `SUA_CHAVE_DE_API_GEMINI_AQUI` pela sua chave real.

3.  **Execute a Aplicação:**
    Como esta é uma aplicação puramente do lado do cliente e sem etapa de compilação, você pode simplesmente abrir o arquivo `index.html` no seu navegador. No entanto, para a melhor experiência e para evitar possíveis problemas de CORS com arquivos locais, é recomendado usar um servidor local simples.

    **Comandos para iniciar um servidor local:**

    -   Se você tem Python 3 instalado (geralmente vem com Linux e macOS):
        ```bash
        python3 -m http.server
        ```
    -   Se você tem Node.js instalado, pode usar o pacote `live-server`:
        ```bash
        npx live-server
        ```

    Após iniciar o servidor, navegue para `http://localhost:8000` (ou o endereço fornecido pelo seu servidor) no seu navegador.

---

## 🤝 Contribuindo

Contribuições são o que tornam a comunidade de código aberto um lugar incrível para aprender, inspirar e criar. Qualquer contribuição que você fizer será **muito bem-vinda**.

1.  **Faça um Fork do Projeto:** Clique no botão 'Fork' no canto superior direito desta página.
2.  **Crie sua Branch de Funcionalidade:**
    ```bash
    git checkout -b feature/NovaFuncionalidadeIncrivel
    ```
3.  **Faça o Commit de suas Mudanças:**
    ```bash
    git commit -m 'Adiciona NovaFuncionalidadeIncrivel'
    ```
4.  **Faça o Push para a Branch:**
    ```bash
    git push origin feature/NovaFuncionalidadeIncrivel
    ```
5.  **Abra um Pull Request:** Vá para a aba "Pull requests" do repositório original e abra um novo pull request. Por favor, forneça uma descrição clara das mudanças.

Nós valorizamos código limpo, legível e bem documentado. Por favor, garanta que suas contribuições sigam o estilo de código existente.

---

## 📜 Licença

Distribuído sob a Licença MIT. Veja `LICENSE` para mais informações.

---

## 💬 Contato

Seu Nome / Link do Projeto – [@seu_twitter](https://twitter.com/seu_twitter) – email@exemplo.com

Link do Projeto: [https://github.com/your-username/izy-botanic](https://github.com/your-username/izy-botanic)
