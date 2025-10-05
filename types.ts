import type React from 'react';

export interface PestAndDiseaseAnalysis {
  title: string;
  description: string;
  suggestedTreatment: string;
}

export interface CareSchedule {
    wateringFrequency: number; // Frequência de rega em dias.
    fertilizingFrequency: number; // Frequência de fertilização em dias. 0 se não aplicável.
    pruningSchedule: string; // Instruções textuais sobre a poda.
}

export interface PlantDiagnosis {
  speciesName: string;
  popularName: string;
  identificationConfidence: 'Alta' | 'Média' | 'Baixa';
  alternativeSpecies?: {
      speciesName: string;
      popularName:string;
      reason: string;
  }[];
  isHealthy: boolean;
  diagnosis: {
    title: string;
    description:string;
  };
  careInstructions: {
    watering: string;
    sunlight: string;
    soil: string;
    fertilizer: string;
  };
  careSchedule: CareSchedule;
  generalTips: string[];
  pestAndDiseaseAnalysis?: PestAndDiseaseAnalysis;
}

export interface ReanalysisResponse {
    isSuggestionAccepted: boolean;
    reasoning: string;
    newAnalysis?: PlantDiagnosis;
}

export interface HistoryEntry {
    id: string;
    date: string; // ISO string
    note: string;
    image?: string; // Optional base64 image
}

export type PredefinedTaskType = 'prune' | 'mist' | 'pest_check' | 'repot' | 'rotate' | 'clean_leaves' | 'other';

export interface CustomCareTask {
    id: string;
    type: PredefinedTaskType;
    customName?: string; // Used when type is 'other'
    frequencyDays: number;
    lastCompleted: string; // ISO date string
}

export interface ActiveCarePlan {
    planId: string;
    name: string;
    startDate: string; // ISO date string
    taskIds: string[];
}

export interface Plant {
  id: string;
  image: string; // base64 image data
  location: 'indoor' | 'outdoor';
  analysis: PlantDiagnosis;
  history: HistoryEntry[];
  lastCare: {
      watering: string; // ISO date string
      fertilizing: string; // ISO date string
  };
  customTasks: CustomCareTask[];
  activeCarePlan?: ActiveCarePlan;
}

export interface PlantRecommendation {
    popularName: string;
    speciesName: string;
    reason: string;
}

export interface Achievement {
    id: 'FIRST_PLANT' | 'GARDEN_STARTER' | 'FIRST_DIARY_NOTE' | 'PLANT_SAVIOR' | 'GREEN_THUMB';
    title: string;
    description: string;
    icon: React.FC<{className?: string}>;
}

export interface CareAlert {
    plantId: string;
    plantName: string;
    plantImage: string;
    task: 'watering' | 'fertilizing' | 'custom';
    dueDate: Date;
    // For custom tasks
    customTaskName?: string;
    customTaskId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface UserProfile {
    name: string;
}

export interface UserAppData {
    plants: Plant[];
    unlockedAchievements: Set<string>;
    chatHistory: ChatMessage[];
    userProfile: UserProfile | null;
}

export interface AppContextType {
  isAuthenticated: boolean;
  currentUser: string | null; // email
  appData: UserAppData;
  alerts: CareAlert[];
  isExpertLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  addPlant: (plant: Plant) => void;
  deletePlant: (plantId: string) => void;
  getPlantById: (id: string) => Plant | undefined;
  addHistoryEntry: (plantId: string, note: string, image?: string) => void;
  getRecommendations: () => Promise<PlantRecommendation[]>;
  completeCareTask: (plantId: string, taskType: 'watering' | 'fertilizing' | 'custom', customTaskId?: string) => void;
  updatePlantCareSchedule: (plantId: string, newSchedule: Partial<CareSchedule>) => void;
  addCustomTask: (plantId: string, taskData: Omit<CustomCareTask, 'id' | 'lastCompleted'>) => void;
  updateCustomTask: (plantId: string, taskId: string, updates: Partial<Omit<CustomCareTask, 'id'>>) => void;
  removeCustomTask: (plantId: string, taskId: string) => void;
  sendChatMessage: (message: string) => Promise<void>;
  activateCarePlan: (plantId: string, planId: keyof typeof import('../App').CARE_PLANS_CONFIG) => void;
  cancelCarePlan: (plantId: string) => void;
  updatePlantIdentification: (plantId: string, userSuggestion: string) => Promise<{ success: boolean; message: string; }>;
}