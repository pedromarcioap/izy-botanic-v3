import type { PlantDiagnosis, PlantRecommendation, ChatMessage, ReanalysisResponse } from '../types';

// Interface para configuração da API
export interface APIConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

// Configuração padrão
const DEFAULT_CONFIG: APIConfig = {
  apiKey: '',
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'anthropic/claude-3.5-sonnet'
};

// Mock data para desenvolvimento sem API
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

const mockReanalysis: ReanalysisResponse = {
  isSuggestionAccepted: true,
  reasoning: "A sugestão do usuário está correta. As folhas grandes, escuras e brilhantes são características da Ficus elastica, não da Ficus lyrata originalmente identificada.",
  newAnalysis: {
    ...mockAnalysis,
    speciesName: "Ficus elastica",
    popularName: "Falsa-seringueira",
    careInstructions: {
      ...mockAnalysis.careInstructions,
      watering: "Regue quando o topo do solo estiver seco. É mais tolerante à seca do que a Ficus lyrata."
    }
  }
};

const mockRecommendations: PlantRecommendation[] = [
  { popularName: "Zamioculca", speciesName: "Zamioculcas zamiifolia", reason: "É extremamente tolerante a baixas condições de luz e rega, similar à Espada-de-São-Jorge." },
  { popularName: "Jiboia", speciesName: "Epipremnum aureum", reason: "Versátil e de crescimento rápido, adapta-se bem a ambientes internos e purifica o ar." },
  { popularName: "Costela-de-adão", speciesName: "Monstera deliciosa", reason: "Possui uma folhagem exuberante e imponente, e aprecia condições de luz indireta como a Figueira-folha-de-violino." }
];

// Função auxiliar para fazer requisições à API
async function makeAPIRequest(endpoint: string, options: RequestInit, config: APIConfig) {
  if (!config.apiKey) {
    throw new Error('API key is required');
  }

  const url = `${config.baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
    'HTTP-Referer': 'https://izy-botanic.com',
    'X-Title': 'Izy Botanic'
  };

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Função para analisar imagem de planta
export const analyzePlantImage = async (base64Image: string, config: APIConfig = DEFAULT_CONFIG): Promise<PlantDiagnosis> => {
  // Se não tiver API key, retorna mock
  if (!config.apiKey) {
    return new Promise(resolve => setTimeout(() => resolve(mockAnalysis), 2000));
  }

  const prompt = `
  Analise a imagem desta planta com extremo cuidado. A identificação de espécies pode ser difícil.
  
  1.  **Identificação Principal:** Identifique a espécie com base em características visuais claras (formato da folha, venação, cor, etc.). Forneça o nome científico e o nome popular mais comum no Brasil.
  2.  **Nível de Confiança:** Avalie sua confiança na identificação como 'Alta', 'Média' ou 'Baixa'. Seja conservador. Uma identificação 'Alta' deve ser quase inequívoca.
  3.  **Espécies Alternativas:** Se a confiança for 'Média' ou 'Baixa', sugira uma ou duas espécies alternativas que se pareçam com a da foto. Para cada alternativa, explique brevemente por que ela também poderia ser uma correspondência. Se a confiança for 'Alta', omita o campo 'alternativeSpecies'.
  4.  **Avaliação de Saúde:** Avalie a saúde geral da planta.
  5.  **Diagnóstico e Cuidados:** Forneça um diagnóstico detalhado, um cronograma de cuidados ('careSchedule') estruturado com frequências em dias, e dicas gerais. Se houver pragas/doenças, inclua a seção 'pestAndDiseaseAnalysis'.
  
  Responda estritamente no formato JSON definido abaixo. A língua da resposta deve ser português do Brasil.

  PlantDiagnosis:
  {
    "speciesName": "string",
    "popularName": "string", 
    "identificationConfidence": "Alta" | "Média" | "Baixa",
    "alternativeSpecies": [
      {
        "speciesName": "string",
        "popularName": "string",
        "reason": "string"
      }
    ],
    "isHealthy": boolean,
    "diagnosis": {
      "title": "string",
      "description": "string"
    },
    "careInstructions": {
      "watering": "string",
      "sunlight": "string", 
      "soil": "string",
      "fertilizer": "string"
    },
    "careSchedule": {
      "wateringFrequency": number,
      "fertilizingFrequency": number,
      "pruningSchedule": "string"
    },
    "generalTips": ["string"],
    "pestAndDiseaseAnalysis": {
      "title": "string",
      "description": "string", 
      "suggestedTreatment": "string"
    }
  }
  `;

  try {
    const response = await makeAPIRequest('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2000
      })
    }, config);

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error analyzing plant image with OpenRouter API:", error);
    return mockAnalysis;
  }
};

// Função para reanalisar imagem com sugestão do usuário
export const reanalyzePlantImage = async (base64Image: string, userSuggestion: string, config: APIConfig = DEFAULT_CONFIG): Promise<ReanalysisResponse> => {
  // Se não tiver API key, retorna mock
  if (!config.apiKey) {
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

  const prompt = `
  O usuário acredita que a planta na imagem é uma '${userSuggestion}'.
  
  1.  **Reavalie a Imagem:** Compare cuidadosamente as características visuais da planta (formato da folha, venação, caule, cor) com as características conhecidas da espécie '${userSuggestion}'.
  2.  **Tome uma Decisão:**
      *   **Se você concorda** que a sugestão do usuário é uma identificação plausível ou correta, defina 'isSuggestionAccepted' como true. Forneça um 'reasoning' explicando por que você concorda. Em seguida, gere um objeto 'newAnalysis' completo e detalhado para a espécie '${userSuggestion}', seguindo o schema de análise de planta.
      *   **Se você discorda**, defina 'isSuggestionAccepted' como false. Forneça um 'reasoning' claro explicando as discrepâncias visuais entre a planta na imagem e a espécie '${userSuggestion}'. Omita o campo 'newAnalysis'.
  
  Responda estritamente no formato JSON definido abaixo. A língua da resposta deve ser português do Brasil.

  ReanalysisResponse:
  {
    "isSuggestionAccepted": boolean,
    "reasoning": "string",
    "newAnalysis": {
      "speciesName": "string",
      "popularName": "string", 
      "identificationConfidence": "Alta" | "Média" | "Baixa",
      "alternativeSpecies": [
        {
          "speciesName": "string",
          "popularName": "string",
          "reason": "string"
        }
      ],
      "isHealthy": boolean,
      "diagnosis": {
        "title": "string",
        "description": "string"
      },
      "careInstructions": {
        "watering": "string",
        "sunlight": "string", 
        "soil": "string",
        "fertilizer": "string"
      },
      "careSchedule": {
        "wateringFrequency": number,
        "fertilizingFrequency": number,
        "pruningSchedule": "string"
      },
      "generalTips": ["string"],
      "pestAndDiseaseAnalysis": {
        "title": "string",
        "description": "string", 
        "suggestedTreatment": "string"
      }
    }
  }
  `;

  try {
    const response = await makeAPIRequest('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2000
      })
    }, config);

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error re-analyzing plant image with OpenRouter API:", error);
    return {
      isSuggestionAccepted: false,
      reasoning: "Ocorreu um erro ao tentar reanalisar a imagem. Por favor, tente novamente mais tarde."
    };
  }
};

// Função para obter recomendações de plantas
export const getPlantRecommendations = async (plantNames: string[], config: APIConfig = DEFAULT_CONFIG): Promise<PlantRecommendation[]> => {
  // Se não tiver API key, retorna mock
  if (!config.apiKey) {
    return new Promise(resolve => setTimeout(() => resolve(mockRecommendations), 1500));
  }

  const prompt = `
  Com base na seguinte lista de plantas que um usuário já possui: [${plantNames.join(', ')}].
  Recomende 3 outras plantas que provavelmente prosperariam em condições de cuidado semelhantes.
  Para cada recomendação, forneça o nome popular, nome científico e um breve motivo (1-2 frases).
  Responda estritamente no formato JSON definido abaixo. A língua da resposta deve ser português do Brasil.

  PlantRecommendation[]:
  [
    {
      "popularName": "string",
      "speciesName": "string",
      "reason": "string"
    }
  ]
  `;

  try {
    const response = await makeAPIRequest('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1000
      })
    }, config);

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error getting recommendations with OpenRouter API:", error);
    return mockRecommendations;
  }
};

// Função para obter resposta de especialista
export const getExpertAnswer = async (newMessage: string, history: ChatMessage[], config: APIConfig = DEFAULT_CONFIG): Promise<string> => {
  // Se não tiver API key, retorna mock
  if (!config.apiKey) {
    return new Promise(resolve => setTimeout(() => resolve("Claro! Para podar roseiras, o ideal é fazer isso no final do inverno, antes que os novos brotos comecem a surgir. Isso incentiva um crescimento mais forte na primavera. Remova todos os galhos mortos, doentes ou fracos. Em seguida, encurte os galhos restantes, deixando de 3 a 5 gemas em cada um. Faça cortes em um ângulo de 45 graus, a cerca de 1 cm acima de uma gema que aponte para fora da planta. Isso ajuda a água a escorrer e direciona o novo crescimento para fora, melhorando a circulação de ar. O que mais você gostaria de saber?"), 2000));
  }

  const systemInstruction = "Você é 'Izy', um botânico especialista em jardinagem, amigável e experiente. Seu objetivo é fornecer conselhos claros, úteis e encorajadores aos usuários sobre suas plantas. Responda às perguntas deles de forma precisa e em tom de conversa. Use o português do Brasil.";

  const messages = [
    {
      role: 'system',
      content: systemInstruction
    },
    ...history.map(msg => ({
      role: msg.role,
      content: msg.text
    })),
    {
      role: 'user',
      content: newMessage
    }
  ];

  try {
    const response = await makeAPIRequest('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: 1000
      })
    }, config);

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error getting expert answer from OpenRouter API:", error);
    return "Desculpe, estou com um pouco de dificuldade para me conectar com meus conhecimentos botânicos agora. Poderia tentar fazer sua pergunta novamente em alguns instantes?";
  }
};