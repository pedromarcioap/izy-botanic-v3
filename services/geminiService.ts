import type { PlantDiagnosis, PlantRecommendation, ChatMessage, ReanalysisResponse } from '../types';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Using a mock service.");
}

// Este arquivo foi modificado para remover dependências do Google Gemini
// Todas as funções foram redirecionadas para usar o serviço OpenRouter

const mockAnalysis: PlantDiagnosis = {
    speciesName: "Ficus lyrata",
    popularName: "Figueira-folha-de-violino",
    identificationConfidence: 'Alta',
    alternativeSpecies: [
        {
            speciesName: "Ficus elastica",
            popularName: "Falsa-seringueira",
            reason: "Apesar de as folhas serem grandes, o formato lembra um pouco a Ficus elastica, mas a ondulação das bordas confirma a Ficus lyrata."
        }
    ],
    isHealthy: false,
    diagnosis: {
        title: "Sinais de Estresse Hídrico e Deficiência Nutricional",
        description: "As folhas apresentam manchas marrons, bordas secas e um leve amarelamento, o que comumente indica rega irregular e possível falta de nutrientes essenciais.",
    },
    careInstructions: {
        watering: "Regue abundantemente apenas quando os 5 cm superiores do solo estiverem secos. Frequência semanal é uma boa base.",
        sunlight: "Prefere luz indireta brilhante. Evite a luz solar direta, pois pode queimar as folhas. Gire a planta semanalmente para um crescimento uniforme.",
        soil: "Utilize um substrato bem drenado, rico em matéria orgânica.",
        fertilizer: "Fertilize a cada 4-6 semanas (mensalmente) durante a primavera e o verão com um fertilizante líquido balanceado, diluído à metade da força recomendada.",
    },
    careSchedule: {
        wateringFrequency: 7,
        fertilizingFrequency: 30,
        pruningSchedule: "Podar no início da primavera para remover galhos mortos e estimular o crescimento."
    },
    generalTips: [
        "Limpe as folhas regularmente com um pano úmido para remover o pó e ajudar na fotossíntese.",
        "Mantenha longe de correntes de ar frio ou quente.",
        "A umidade elevada é benéfica; considere usar um umidificador ou colocar a planta perto de outras.",
    ],
    pestAndDiseaseAnalysis: {
        title: "Início de Infestação de Ácaros",
        description: "Observam-se finas teias na parte inferior das folhas e pequenos pontos amarelados na superfície, indicativos da presença de ácaros.",
        suggestedTreatment: "Limpe as folhas com uma solução de água e sabão neutro. Aumente a umidade ao redor da planta, pois os ácaros prosperam em ambientes secos. Considere o uso de óleo de neem para infestações mais graves."
    }
};

export const analyzePlantImage = async (base64Image: string): Promise<PlantDiagnosis> => {
    if (!process.env.API_KEY || process.env.API_KEY === "mock-key") {
        return new Promise(resolve => setTimeout(() => resolve(mockAnalysis), 2000));
    }

    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
    const textPart = {
        text: `
        Analise a imagem desta planta com extremo cuidado. A identificação de espécies pode ser difícil.
        
        1.  **Identificação Principal:** Identifique a espécie com base em características visuais claras (formato da folha, venação, cor, etc.). Forneça o nome científico e o nome popular mais comum no Brasil.
        2.  **Nível de Confiança:** Avalie sua confiança na identificação como 'Alta', 'Média' ou 'Baixa'. Seja conservador. Uma identificação 'Alta' deve ser quase inequívoca.
        3.  **Espécies Alternativas:** Se a confiança for 'Média' ou 'Baixa', sugira uma ou duas espécies alternativas que se pareçam com a da foto. Para cada alternativa, explique brevemente por que ela também poderia ser uma correspondência. Se a confiança for 'Alta', omita o campo 'alternativeSpecies'.
        4.  **Avaliação de Saúde:** Avalie a saúde geral da planta.
        5.  **Diagnóstico e Cuidados:** Forneça um diagnóstico detalhado, um cronograma de cuidados ('careSchedule') estruturado com frequências em dias, e dicas gerais. Se houver pragas/doenças, inclua a seção 'pestAndDiseaseAnalysis'.
        
        Responda estritamente no formato JSON definido pelo schema. A língua da resposta deve ser português do Brasil.
        `
    };

    // Redirecionando para o serviço OpenRouter
    console.warn("Gemini service deprecated. Redirecting to OpenRouter service.");
    // Importar dinamicamente para evitar dependência circular
    const { analyzePlantImage: openRouterAnalyze } = await import('./openRouterService');
    return openRouterAnalyze(base64Image);
};

const mockReanalysis: ReanalysisResponse = {
    isSuggestionAccepted: true,
    reasoning: "A sugestão do usuário está correta. As folhas grandes, escuras e brilhantes são características da Ficus elastica, não da Ficus lyrata originalmente identificada.",
    newAnalysis: {
        ...mockAnalysis, // Use mock as base
        speciesName: "Ficus elastica",
        popularName: "Falsa-seringueira",
        careInstructions: {
            ...mockAnalysis.careInstructions,
            watering: "Regue quando o topo do solo estiver seco. É mais tolerante à seca do que a Ficus lyrata."
        }
    }
};

export const reanalyzePlantImage = async (base64Image: string, userSuggestion: string): Promise<ReanalysisResponse> => {
    if (!process.env.API_KEY || process.env.API_KEY === "mock-key") {
        // Simulate a delay and potential rejection
        return new Promise(resolve => setTimeout(() => {
            if (userSuggestion.toLowerCase().includes('seringueira')) {
                resolve(mockReanalysis);
            } else {
                resolve({
                    isSuggestionAccepted: false,
                    reasoning: "A sugestão não parece corresponder às características visuais. A planta na imagem tem folhas onduladas, o que não é típico da espécie sugerida."
                });
            }
        }, 2500));
    }
    
    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
    const textPart = {
        text: `
        O usuário acredita que a planta na imagem é uma '${userSuggestion}'.
        
        1.  **Reavalie a Imagem:** Compare cuidadosamente as características visuais da planta (formato da folha, venação, caule, cor) com as características conhecidas da espécie '${userSuggestion}'.
        2.  **Tome uma Decisão:**
            *   **Se você concorda** que a sugestão do usuário é uma identificação plausível ou correta, defina 'isSuggestionAccepted' como true. Forneça um 'reasoning' explicando por que você concorda. Em seguida, gere um objeto 'newAnalysis' completo e detalhado para a espécie '${userSuggestion}', seguindo o schema de análise de planta.
            *   **Se você discorda**, defina 'isSuggestionAccepted' como false. Forneça um 'reasoning' claro explicando as discrepâncias visuais entre a planta na imagem e a espécie '${userSuggestion}'. Omita o campo 'newAnalysis'.
        
        Responda estritamente no formato JSON definido pelo schema. A língua da resposta deve ser português do Brasil.
        `
    };

    // Redirecionando para o serviço OpenRouter
    console.warn("Gemini service deprecated. Redirecting to OpenRouter service.");
    // Importar dinamicamente para evitar dependência circular
    const { reanalyzePlantImage: openRouterReanalyze } = await import('./openRouterService');
    return openRouterReanalyze(base64Image, userSuggestion);
};

const mockRecommendations: PlantRecommendation[] = [
    { popularName: "Zamioculca", speciesName: "Zamioculcas zamiifolia", reason: "É extremamente tolerante a baixas condições de luz e rega, similar à Espada-de-São-Jorge." },
    { popularName: "Jiboia", speciesName: "Epipremnum aureum", reason: "Versátil e de crescimento rápido, adapta-se bem a ambientes internos e purifica o ar." },
    { popularName: "Costela-de-adão", speciesName: "Monstera deliciosa", reason: "Possui uma folhagem exuberante e imponente, e aprecia condições de luz indireta como a Figueira-folha-de-violino." }
];

export const getPlantRecommendations = async (plantNames: string[]): Promise<PlantRecommendation[]> => {
    // Redirecionando para o serviço OpenRouter
    console.warn("Gemini service deprecated. Redirecting to OpenRouter service.");
    // Importar dinamicamente para evitar dependência circular
    const { getPlantRecommendations: openRouterRecommendations } = await import('./openRouterService');
    return openRouterRecommendations(plantNames);
};

export const getExpertAnswer = async (newMessage: string, history: ChatMessage[]): Promise<string> => {
    // Redirecionando para o serviço OpenRouter
    console.warn("Gemini service deprecated. Redirecting to OpenRouter service.");
    // Importar dinamicamente para evitar dependência circular
    const { getExpertAnswer: openRouterExpertAnswer } = await import('./openRouterService');
    return openRouterExpertAnswer(newMessage, history);
};