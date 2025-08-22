import { GoogleGenAI, Type, Content } from "@google/genai";
import type { PlantDiagnosis, PlantRecommendation, ChatMessage } from '../types';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Using a mock service.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "mock-key" });

const pestAndDiseaseSchema = {
    type: Type.OBJECT,
    description: "Análise de pragas e doenças, se detectadas. Omitir se a planta estiver livre de pragas/doenças.",
    properties: {
        title: { type: Type.STRING, description: "Um título curto para o problema (ex: 'Infestação de Cochonilhas')." },
        description: { type: Type.STRING, description: "Uma descrição detalhada da praga ou doença encontrada." },
        suggestedTreatment: { type: Type.STRING, description: "Um plano de tratamento sugerido para resolver o problema." },
    },
    required: ["title", "description", "suggestedTreatment"],
};

const plantAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        speciesName: { type: Type.STRING, description: "O nome científico da planta." },
        popularName: { type: Type.STRING, description: "O nome popular ou comum da planta em português do Brasil." },
        identificationConfidence: { type: Type.STRING, enum: ['Alta', 'Média', 'Baixa'], description: "O nível de confiança na identificação da espécie (Alta, Média, Baixa)." },
        alternativeSpecies: {
            type: Type.ARRAY,
            description: "Uma ou duas espécies alternativas se a confiança não for 'Alta'. Omitir se a confiança for 'Alta'.",
            items: {
                type: Type.OBJECT,
                properties: {
                    speciesName: { type: Type.STRING, description: "Nome científico da espécie alternativa." },
                    popularName: { type: Type.STRING, description: "Nome popular da espécie alternativa." },
                    reason: { type: Type.STRING, description: "Motivo pelo qual esta pode ser a planta (ex: 'Folhas muito similares, mas a floração é diferente')." }
                },
                required: ["speciesName", "popularName", "reason"]
            }
        },
        isHealthy: { type: Type.BOOLEAN, description: "Um booleano simples indicando se a planta está geralmente saudável." },
        diagnosis: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Um título curto para o diagnóstico (ex: 'Sinais de Excesso de Água')." },
                description: { type: Type.STRING, description: "Uma descrição detalhada dos problemas de saúde encontrados." }
            },
             required: ["title", "description"]
        },
        careInstructions: {
            type: Type.OBJECT,
            properties: {
                watering: { type: Type.STRING, description: "Instruções específicas de rega." },
                sunlight: { type: Type.STRING, description: "Requisitos de luz solar (ex: 'luz solar direta', 'sombra parcial')." },
                soil: { type: Type.STRING, description: "Tipo de solo recomendado." },
                fertilizer: { type: Type.STRING, description: "Recomendações de fertilização." }
            },
            required: ["watering", "sunlight", "soil", "fertilizer"]
        },
        careSchedule: {
            type: Type.OBJECT,
            description: "Um cronograma de cuidados estruturado para alertas.",
            properties: {
                wateringFrequency: { type: Type.INTEGER, description: "Frequência de rega em número de dias (ex: 7)." },
                fertilizingFrequency: { type: Type.INTEGER, description: "Frequência de fertilização em dias (ex: 30). Use 0 se não for aplicável." },
                pruningSchedule: { type: Type.STRING, description: "Instruções textuais sobre a poda (ex: 'Podar no início da primavera')."}
            },
            required: ["wateringFrequency", "fertilizingFrequency", "pruningSchedule"]
        },
        generalTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Uma lista de dicas gerais para o bem-estar da planta."
        },
        pestAndDiseaseAnalysis: pestAndDiseaseSchema,
    },
    required: ["speciesName", "popularName", "identificationConfidence", "isHealthy", "diagnosis", "careInstructions", "careSchedule", "generalTips"]
};

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

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: { responseMimeType: 'application/json', responseSchema: plantAnalysisSchema }
        });
        return JSON.parse(response.text) as PlantDiagnosis;
    } catch (error) {
        console.error("Error analyzing plant image with Gemini API:", error);
        return mockAnalysis;
    }
};

const recommendationSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            popularName: { type: Type.STRING, description: "Nome popular da planta recomendada." },
            speciesName: { type: Type.STRING, description: "Nome científico da planta recomendada." },
            reason: { type: Type.STRING, description: "Breve motivo pelo qual esta planta é uma boa recomendação." }
        },
        required: ["popularName", "speciesName", "reason"]
    }
};

const mockRecommendations: PlantRecommendation[] = [
    { popularName: "Zamioculca", speciesName: "Zamioculcas zamiifolia", reason: "É extremamente tolerante a baixas condições de luz e rega, similar à Espada-de-São-Jorge." },
    { popularName: "Jiboia", speciesName: "Epipremnum aureum", reason: "Versátil e de crescimento rápido, adapta-se bem a ambientes internos e purifica o ar." },
    { popularName: "Costela-de-adão", speciesName: "Monstera deliciosa", reason: "Possui uma folhagem exuberante e imponente, e aprecia condições de luz indireta como a Figueira-folha-de-violino." }
];

export const getPlantRecommendations = async (plantNames: string[]): Promise<PlantRecommendation[]> => {
     if (!process.env.API_KEY || process.env.API_KEY === "mock-key") {
        return new Promise(resolve => setTimeout(() => resolve(mockRecommendations), 1500));
    }

    const textPart = {
        text: `
        Com base na seguinte lista de plantas que um usuário já possui: [${plantNames.join(', ')}].
        Recomende 3 outras plantas que provavelmente prosperariam em condições de cuidado semelhantes.
        Para cada recomendação, forneça o nome popular, nome científico e um breve motivo (1-2 frases).
        Responda estritamente no formato JSON definido pelo schema. A língua da resposta deve ser português do Brasil.
        `
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart] },
            config: { responseMimeType: 'application/json', responseSchema: recommendationSchema }
        });
        return JSON.parse(response.text) as PlantRecommendation[];
    } catch (error) {
        console.error("Error getting recommendations with Gemini API:", error);
        return mockRecommendations;
    }
};

export const getExpertAnswer = async (newMessage: string, history: ChatMessage[]): Promise<string> => {
    if (!process.env.API_KEY || process.env.API_KEY === "mock-key") {
        return new Promise(resolve => setTimeout(() => resolve("Claro! Para podar roseiras, o ideal é fazer isso no final do inverno, antes que os novos brotos comecem a surgir. Isso incentiva um crescimento mais forte na primavera. Remova todos os galhos mortos, doentes ou fracos. Em seguida, encurte os galhos restantes, deixando de 3 a 5 gemas em cada um. Faça cortes em um ângulo de 45 graus, a cerca de 1 cm acima de uma gema que aponte para fora da planta. Isso ajuda a água a escorrer e direciona o novo crescimento para fora, melhorando a circulação de ar. O que mais você gostaria de saber?"), 2000));
    }

    const systemInstruction = "Você é 'Izy', um botânico especialista em jardinagem, amigável e experiente. Seu objetivo é fornecer conselhos claros, úteis e encorajadores aos usuários sobre suas plantas. Responda às perguntas deles de forma precisa e em tom de conversa. Use o português do Brasil.";

    const geminiHistory: Content[] = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    const contents: Content[] = [...geminiHistory, { role: 'user', parts: [{ text: newMessage }] }];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error getting expert answer from Gemini API:", error);
        return "Desculpe, estou com um pouco de dificuldade para me conectar com meus conhecimentos botânicos agora. Poderia tentar fazer sua pergunta novamente em alguns instantes?";
    }
};