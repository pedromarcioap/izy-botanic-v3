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
  if (!config.apiKey) {
    throw new Error("API key is required for image analysis.");
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
};

// Função para reanalisar imagem com sugestão do usuário
export const reanalyzePlantImage = async (base64Image: string, userSuggestion: string, config: APIConfig = DEFAULT_CONFIG): Promise<ReanalysisResponse> => {
  if (!config.apiKey) {
    throw new Error("API key is required for image re-analysis.");
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
};

// Função para obter recomendações de plantas
export const getPlantRecommendations = async (plantNames: string[], config: APIConfig = DEFAULT_CONFIG): Promise<PlantRecommendation[]> => {
  if (!config.apiKey) {
    throw new Error("API key is required for recommendations.");
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
};

// Função para obter resposta de especialista
export const getExpertAnswer = async (newMessage: string, history: ChatMessage[], config: APIConfig = DEFAULT_CONFIG): Promise<string> => {
  if (!config.apiKey) {
    throw new Error("API key is required for expert answer.");
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

  const response = await makeAPIRequest('/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: 1000
    })
  }, config);

  return response.choices[0].message.content;
};