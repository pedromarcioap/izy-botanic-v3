import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import type { Plant, HistoryEntry, PlantDiagnosis, PlantRecommendation, Achievement, CareAlert, CareSchedule, CustomCareTask, ChatMessage, PredefinedTaskType, UserProfile, UserAppData, ActiveCarePlan } from './types';
import { analyzePlantImage, getPlantRecommendations, getExpertAnswer, reanalyzePlantImage, APIConfig } from './services/openRouterService';
import { LeafIcon, LogoutIcon, ArrowLeftIcon, PlusIcon, SunIcon, WaterDropIcon, SproutIcon, CheckCircleIcon, BugIcon, CalendarIcon, PencilIcon, TrophyIcon, SparklesIcon, CameraIcon, RocketIcon, BellIcon, ScissorsIcon, EditIcon, TrashIcon, UsersIcon, RotateIcon, CleanLeafIcon, SprayIcon, RepotIcon } from './components/Icons';
import SettingsPage from './components/SettingsPage';

// --- HELPERS ---
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getDaysDifference = (date1: Date, date2: Date): number => {
    const diffTime = date2.getTime() - date1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

const formatDueDate = (dueDate: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0,0,0,0);

    const diff = getDaysDifference(today, due);

    if (diff === 0) return "Vence hoje";
    if (diff < 0) return `Venceu há ${-diff} dia(s)`;
    if (diff === 1) return "Vence amanhã";
    return `Vence em ${diff} dias`;
};

// A simple, reliable, non-bitwise hashing function to ensure consistency across all environments.
const hashPassword = (password: string): string => {
    let hash = 0;
    if (password.length === 0) return `izy_hash_v3_${hash}`;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = (hash * 31 + char) % 1000000007;
    }
    return `izy_hash_v3_${hash}`;
};


// --- CONFIG ---

const POINTS_CONFIG = {
    COMPLETE_TASK: 10,
    ADD_PLANT: 50,
    ADD_HISTORY: 15,
    ACTIVATE_PLAN: 25,
};

const POINTS_PER_LEVEL = 100;
const LEVELS = [
    "Jardineiro Novato", // Nível 1
    "Cultivador Dedicado", // Nível 2
    "Polegar Verde", // Nível 3
    "Amigo das Plantas", // Nível 4
    "Sussurrador de Folhas", // Nível 5
    "Guardião da Flora", // Nível 6
    "Mestre Botânico" // Nível 7+
];

const getLevelName = (level: number) => LEVELS[Math.min(level - 1, LEVELS.length - 1)];

const PREDEFINED_TASKS_CONFIG: Record<PredefinedTaskType, { label: string, icon: React.FC<{className?: string}>, color: string }> = {
    'prune': { label: 'Poda', icon: ScissorsIcon, color: 'text-orange-600' },
    'mist': { label: 'Borrifar Folhas', icon: SprayIcon, color: 'text-cyan-600' },
    'pest_check': { label: 'Verificar Pragas', icon: BugIcon, color: 'text-red-600' },
    'repot': { label: 'Transplante', icon: RepotIcon, color: 'text-amber-700' },
    'rotate': { label: 'Girar Vaso', icon: RotateIcon, color: 'text-indigo-600' },
    'clean_leaves': { label: 'Limpar Folhas', icon: CleanLeafIcon, color: 'text-teal-600' },
    'other': { label: 'Outra Tarefa', icon: RocketIcon, color: 'text-purple-700' }
};

const getCustomTaskDisplay = (task: CustomCareTask) => {
    const config = PREDEFINED_TASKS_CONFIG[task.type];
    return {
        ...config,
        name: task.type === 'other' ? task.customName || 'Tarefa Personalizada' : config.label,
    };
};


const ACHIEVEMENTS_LIST: Achievement[] = [
    { id: 'FIRST_PLANT', title: 'Primeiro Broto', description: 'Adicionou sua primeira planta ao jardim.', icon: SproutIcon },
    { id: 'GARDEN_STARTER', title: 'Jardim em Formação', description: 'Cultive 5 plantas diferentes.', icon: LeafIcon },
    { id: 'FIRST_DIARY_NOTE', title: 'Botânico Anotado', description: 'Fez sua primeira anotação no diário.', icon: PencilIcon },
    { id: 'PLANT_SAVIOR', title: 'Herói das Plantas', description: 'Cuidou de uma planta que precisava de atenção.', icon: CheckCircleIcon },
    { id: 'GREEN_THUMB', title: 'Dedo Verde', description: 'Mantenha 5 plantas saudáveis simultaneamente.', icon: TrophyIcon },
];

const SEASONAL_TIPS = {
    'Verão': 'Atenção redobrada com a rega! O calor aumenta a evaporação. Proteja as plantas do sol forte do meio-dia.',
    'Outono': 'Época ideal para podas de limpeza e para preparar as plantas para o frio. Reduza a fertilização.',
    'Inverno': 'A maioria das plantas entra em dormência. Reduza significativamente a rega para evitar o apodrecimento das raízes.',
    'Primavera': 'A estação do crescimento! Aumente a rega e retome a fertilização para dar energia às novas brotações.'
};
const getSeason = (date: Date): keyof typeof SEASONAL_TIPS => {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'Outono';
    if (month >= 5 && month <= 7) return 'Inverno';
    if (month >= 8 && month <= 10) return 'Primavera';
    return 'Verão';
}

// CARE PLANS CONFIGURATION
export const CARE_PLANS_CONFIG = {
  NEW_PLANT_ACCLIMATIZATION: {
    id: 'NEW_PLANT_ACCLIMATIZATION',
    name: 'Plano de Aclimatação',
    description: 'Um guia de 14 dias para ajudar sua nova planta a se adaptar ao seu novo lar sem estresse.',
    durationDays: 14,
    icon: SproutIcon,
    isAvailable: (plant: Plant) => true,
    steps: [
      { day: 1, task: { type: 'pest_check' as PredefinedTaskType, customName: 'Inspecionar por pragas da loja' } },
      { day: 3, task: { type: 'other' as PredefinedTaskType, customName: 'Verificar umidade do solo (não regar)' } },
      { day: 7, task: { type: 'rotate' as PredefinedTaskType } },
      { day: 10, task: { type: 'other' as PredefinedTaskType, customName: 'Verificar sinais de estresse (folhas amarelas)' } },
      { day: 14, task: { type: 'clean_leaves' as PredefinedTaskType, customName: 'Limpar folhas para remover poeira' } },
    ]
  },
  RECOVERY_PLAN: {
    id: 'RECOVERY_PLAN',
    name: 'Plano de Recuperação',
    description: 'Um programa intensivo de 21 dias para ajudar sua planta a se recuperar de estresse ou doenças.',
    durationDays: 21,
    icon: CheckCircleIcon,
    isAvailable: (plant: Plant) => !plant.analysis.isHealthy,
    steps: [
      { day: 1, task: { type: 'pest_check' as PredefinedTaskType, customName: 'Aplicar tratamento inicial (se necessário)' } },
      { day: 4, task: { type: 'other' as PredefinedTaskType, customName: 'Verificar umidade e remover folhas mortas' } },
      { day: 8, task: { type: 'prune' as PredefinedTaskType, customName: 'Podar galhos danificados' } },
      { day: 14, task: { type: 'other' as PredefinedTaskType, customName: 'Adubar com fertilizante diluído' } },
      { day: 21, task: { type: 'other' as PredefinedTaskType, customName: 'Avaliar progresso e sinais de melhora' } },
    ]
  }
};

const getInitialAppData = (): Omit<UserAppData, 'userProfile'> => ({
    plants: [],
    unlockedAchievements: new Set(),
    chatHistory: [
        { id: 'init', role: 'model', text: 'Olá! Eu sou Izy, sua especialista em botânica. Como posso ajudar seu jardim hoje?' }
    ],
});

// A pure function to calculate the new state of achievements.
const getUpdatedAchievements = (
    currentAchievements: Set<string>,
    updatedPlants: Plant[],
    flags: { newHistoryNote?: boolean } = {}
): Set<string> => {
    const newAchievements = new Set(currentAchievements);

    const checkAndAdd = (id: Achievement['id'], condition: boolean) => {
        if (!newAchievements.has(id) && condition) {
            newAchievements.add(id);
        }
    };

    checkAndAdd('FIRST_PLANT', updatedPlants.length >= 1);
    checkAndAdd('GARDEN_STARTER', updatedPlants.length >= 5);
    checkAndAdd('FIRST_DIARY_NOTE', !!flags.newHistoryNote);
    checkAndAdd('GREEN_THUMB', updatedPlants.filter(p => p.analysis.isHealthy).length >= 5);

    return newAchievements;
};

// --- CONTEXT ---
const AppContext = React.createContext<import('./types').AppContextType | null>(null);

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('izyBotanic-currentUser'));
    const [currentUser, setCurrentUser] = useState<string | null>(() => localStorage.getItem('izyBotanic-currentUser'));
    
    const [appData, setAppData] = useState<UserAppData>(() => {
        const user = localStorage.getItem('izyBotanic-currentUser');
        if (user) {
            const savedData = localStorage.getItem(`izyBotanic-appData-${user}`);
            const users = JSON.parse(localStorage.getItem('izyBotanic-users') || '{}');
            const userData = users[user];
            const userProfile: UserProfile | null = userData ? { name: userData.name, growthPoints: userData.growthPoints || 0, level: userData.level || 1 } : null;

            if (savedData) {
                const parsedData = JSON.parse(savedData);
                return {
                    ...parsedData,
                    unlockedAchievements: new Set(parsedData.unlockedAchievements || []),
                    userProfile,
                };
            }
             return { ...getInitialAppData(), userProfile };
        }
        return { ...getInitialAppData(), userProfile: null };
    });

    // Carregar configurações da API
    const [apiConfig, setApiConfig] = useState<APIConfig>(() => {
        const savedSettings = localStorage.getItem('izy-botanic-settings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                return parsed.apiConfig || {
                    apiKey: '',
                    baseUrl: 'https://openrouter.ai/api/v1',
                    model: 'anthropic/claude-3.5-sonnet'
                };
            } catch (error) {
                console.error('Error loading API config:', error);
            }
        }
        return {
            apiKey: '',
            baseUrl: 'https://openrouter.ai/api/v1',
            model: 'anthropic/claude-3.5-sonnet'
        };
    });
    
    const [isExpertLoading, setIsExpertLoading] = useState(false);
    
    const userProfile = useMemo(() => appData.userProfile, [appData.userProfile]);
    
    // Persist user data on change
    useEffect(() => {
        if (currentUser && appData) {
            const dataToSave = {
                ...appData,
                unlockedAchievements: Array.from(appData.unlockedAchievements),
                userProfile: undefined, // Don't save profile in app data blob
            };
            localStorage.setItem(`izyBotanic-appData-${currentUser}`, JSON.stringify(dataToSave));
            
            // Save user profile data separately in the users blob
            const users = JSON.parse(localStorage.getItem('izyBotanic-users') || '{}');
            if (users[currentUser] && appData.userProfile) {
                users[currentUser] = { ...users[currentUser], ...appData.userProfile };
                localStorage.setItem('izyBotanic-users', JSON.stringify(users));
            }
        }
    }, [appData, currentUser]);
    
    const addGrowthPoints = useCallback((points: number) => {
        setAppData(prev => {
            if (!prev.userProfile) return prev;
            const newPoints = prev.userProfile.growthPoints + points;
            const newLevel = Math.floor(newPoints / POINTS_PER_LEVEL) + 1;
            const updatedProfile = { ...prev.userProfile, growthPoints: newPoints, level: newLevel };
            return { ...prev, userProfile: updatedProfile };
        });
    }, []);

    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        const users = JSON.parse(localStorage.getItem('izyBotanic-users') || '{}');
        const user = users[email];
        
        if (user && user.password === hashPassword(password)) {
            const savedData = localStorage.getItem(`izyBotanic-appData-${email}`);
            const userProfile = { name: user.name, growthPoints: user.growthPoints || 0, level: user.level || 1 };
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                setAppData({
                    ...parsedData,
                    unlockedAchievements: new Set(parsedData.unlockedAchievements || []),
                    userProfile,
                });
            } else {
                setAppData({ ...getInitialAppData(), userProfile });
            }
            
            localStorage.setItem('izyBotanic-currentUser', email);
            setCurrentUser(email);
            setIsAuthenticated(true);
            return true;
        }
        throw new Error("Credenciais inválidas.");
    }, []);

    const signup = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
        const users = JSON.parse(localStorage.getItem('izyBotanic-users') || '{}');
        if (users[email]) {
            throw new Error("Usuário já existe.");
        }
        
        const userProfile = { name, growthPoints: 0, level: 1 };
        users[email] = { ...userProfile, password: hashPassword(password) };
        localStorage.setItem('izyBotanic-users', JSON.stringify(users));

        setAppData({ ...getInitialAppData(), userProfile });
        localStorage.setItem('izyBotanic-currentUser', email);
        setCurrentUser(email);
        setIsAuthenticated(true);
        return true;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('izyBotanic-currentUser');
        setCurrentUser(null);
        setIsAuthenticated(false);
        setAppData({ ...getInitialAppData(), userProfile: null });
    }, []);

    const addPlant = useCallback((plant: Plant) => {
        setAppData(prev => {
            const newPlants = [...prev.plants, plant];
            const newAchievements = getUpdatedAchievements(prev.unlockedAchievements, newPlants);
            return { ...prev, plants: newPlants, unlockedAchievements: newAchievements };
        });
        addGrowthPoints(POINTS_CONFIG.ADD_PLANT);
    }, [addGrowthPoints]);

    const deletePlant = useCallback((plantId: string) => {
        setAppData(prev => ({
            ...prev,
            plants: prev.plants.filter(p => p.id !== plantId)
        }));
    }, []);

    const getPlantById = useCallback((id: string) => appData.plants.find(p => p.id === id), [appData.plants]);

    const addHistoryEntry = useCallback((plantId: string, note: string, image?: string) => {
        setAppData(prev => {
            const newPlants = prev.plants.map(plant => {
                if (plant.id === plantId) {
                    const newHistoryEntry: HistoryEntry = {
                        id: `${new Date().toISOString()}-${Math.random()}`,
                        date: new Date().toISOString(),
                        note,
                        image,
                    };
                    return { ...plant, history: [newHistoryEntry, ...(plant.history || [])] };
                }
                return plant;
            });
            const newAchievements = getUpdatedAchievements(prev.unlockedAchievements, newPlants, { newHistoryNote: true });
            return { ...prev, plants: newPlants, unlockedAchievements: newAchievements };
        });
        addGrowthPoints(POINTS_CONFIG.ADD_HISTORY);
    }, [addGrowthPoints]);

    const getRecommendations = useCallback(async (): Promise<PlantRecommendation[]> => {
        const plantNames = appData.plants.map(p => p.analysis.popularName);
        return await getPlantRecommendations(plantNames, apiConfig);
    }, [appData.plants, apiConfig]);

    const completeCareTask = useCallback((plantId: string, taskType: 'watering' | 'fertilizing' | 'custom', customTaskId?: string) => {
        setAppData(prev => {
            const plantToUpdate = prev.plants.find(p => p.id === plantId);
            const wasUnhealthy = plantToUpdate && !plantToUpdate.analysis.isHealthy;

            const newPlants = prev.plants.map(p => {
                if (p.id === plantId) {
                    if (taskType === 'custom' && customTaskId) {
                        return { ...p, customTasks: p.customTasks.map(t => t.id === customTaskId ? { ...t, lastCompleted: new Date().toISOString() } : t) };
                    }
                    if (taskType === 'watering' || taskType === 'fertilizing') {
                        return { ...p, lastCare: { ...p.lastCare, [taskType]: new Date().toISOString() } };
                    }
                }
                return p;
            });

            let newAchievements = prev.unlockedAchievements;
            if (wasUnhealthy && !newAchievements.has('PLANT_SAVIOR')) {
                newAchievements = new Set(prev.unlockedAchievements);
                newAchievements.add('PLANT_SAVIOR');
            }

            return {
                ...prev,
                plants: newPlants,
                unlockedAchievements: newAchievements,
            };
        });
        addGrowthPoints(POINTS_CONFIG.COMPLETE_TASK);
    }, [addGrowthPoints]);

    const updatePlantCareSchedule = useCallback((plantId: string, newSchedule: Partial<CareSchedule>) => {
        setAppData(prev => ({
            ...prev,
            plants: prev.plants.map(p => p.id === plantId ? { ...p, analysis: { ...p.analysis, careSchedule: { ...p.analysis.careSchedule, ...newSchedule } } } : p)
        }));
    }, []);

    const addCustomTask = useCallback((plantId: string, taskData: Omit<CustomCareTask, 'id' | 'lastCompleted'>) => {
        setAppData(prev => ({
            ...prev,
            plants: prev.plants.map(p => {
                if (p.id === plantId) {
                    const newTask: CustomCareTask = { ...taskData, id: new Date().toISOString(), lastCompleted: new Date().toISOString() };
                    return { ...p, customTasks: [...(p.customTasks || []), newTask] };
                }
                return p;
            })
        }));
    }, []);

    const updateCustomTask = useCallback((plantId: string, taskId: string, updates: Partial<Omit<CustomCareTask, 'id'>>) => {
        setAppData(prev => ({
            ...prev,
            plants: prev.plants.map(p => p.id === plantId ? { ...p, customTasks: p.customTasks.map(t => t.id === taskId ? { ...t, ...updates } : t) } : p)
        }));
    }, []);

    const removeCustomTask = useCallback((plantId: string, taskId: string) => {
        setAppData(prev => ({
            ...prev,
            plants: prev.plants.map(p => p.id === plantId ? { ...p, customTasks: p.customTasks.filter(t => t.id !== taskId) } : p)
        }));
    }, []);

    const sendChatMessage = useCallback(async (message: string) => {
        setIsExpertLoading(true);
        const userMessage: ChatMessage = { id: new Date().toISOString(), role: 'user', text: message };
        
        const currentHistory = [...appData.chatHistory, userMessage];
        setAppData(prev => ({...prev, chatHistory: currentHistory }));

        try {
            const responseText = await getExpertAnswer(message, currentHistory.slice(0, -1), apiConfig);
            const modelMessage: ChatMessage = { id: new Date().toISOString() + '-ai', role: 'model', text: responseText };
            setAppData(prev => ({ ...prev, chatHistory: [...prev.chatHistory, modelMessage] }));
        } catch (error) {
            console.error(error);
            const errorMessage: ChatMessage = { id: new Date().toISOString() + '-err', role: 'model', text: 'Desculpe, ocorreu um erro. Tente novamente.' };
            setAppData(prev => ({ ...prev, chatHistory: [...prev.chatHistory, errorMessage] }));
        } finally {
            setIsExpertLoading(false);
        }
    }, [appData.chatHistory, apiConfig]);
    
    const activateCarePlan = useCallback((plantId: string, planId: keyof typeof CARE_PLANS_CONFIG) => {
        setAppData(prev => {
            const planConfig = CARE_PLANS_CONFIG[planId];
            if (!planConfig) return prev;

            const startDate = new Date();
            const newTasks: CustomCareTask[] = [];
            const newTaskIds: string[] = [];

            planConfig.steps.forEach(step => {
                const taskId = `${planId}-${step.day}-${new Date().getTime()}`;
                const lastCompletedDate = addDays(startDate, step.day - planConfig.durationDays);

                newTasks.push({
                    id: taskId,
                    type: step.task.type,
                    customName: step.task.customName,
                    frequencyDays: planConfig.durationDays,
                    lastCompleted: lastCompletedDate.toISOString(),
                });
                newTaskIds.push(taskId);
            });

            const newActivePlan: ActiveCarePlan = {
                planId: planConfig.id,
                name: planConfig.name,
                startDate: startDate.toISOString(),
                taskIds: newTaskIds
            };
            
            return {
                ...prev,
                plants: prev.plants.map(p => {
                    if (p.id === plantId) {
                        return {
                            ...p,
                            customTasks: [...p.customTasks, ...newTasks],
                            activeCarePlan: newActivePlan,
                        };
                    }
                    return p;
                })
            };
        });
        addGrowthPoints(POINTS_CONFIG.ACTIVATE_PLAN);
    }, [addGrowthPoints]);

    const cancelCarePlan = useCallback((plantId: string) => {
        setAppData(prev => ({
            ...prev,
            plants: prev.plants.map(p => {
                if (p.id === plantId && p.activeCarePlan) {
                    const taskIdsToRemove = new Set(p.activeCarePlan.taskIds);
                    return {
                        ...p,
                        customTasks: p.customTasks.filter(task => !taskIdsToRemove.has(task.id)),
                        activeCarePlan: undefined,
                    };
                }
                return p;
            })
        }));
    }, []);

    const updatePlantIdentification = useCallback(async (plantId: string, userSuggestion: string): Promise<{ success: boolean; message: string; }> => {
        const plant = getPlantById(plantId);
        if (!plant) {
            return { success: false, message: "Planta não encontrada." };
        }

        try {
            const result = await reanalyzePlantImage(plant.image, userSuggestion, apiConfig);

            if (result.isSuggestionAccepted && result.newAnalysis) {
                setAppData(prev => ({
                    ...prev,
                    plants: prev.plants.map(p => p.id === plantId ? { ...p, analysis: result.newAnalysis! } : p)
                }));
                addHistoryEntry(plantId, `Identificação atualizada para ${result.newAnalysis.popularName}. ${result.reasoning}`);
                return { success: true, message: 'Identificação atualizada com sucesso!' };
            } else {
                return { success: false, message: `A IA não pôde confirmar a sugestão. Motivo: ${result.reasoning}` };
            }
        } catch (error) {
            console.error("Error updating plant identification:", error);
            return { success: false, message: "Ocorreu um erro durante a reanálise. Tente novamente." };
        }
    }, [getPlantById, addHistoryEntry, apiConfig]);


    const alerts = useMemo((): CareAlert[] => {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const allAlerts: CareAlert[] = [];

        appData.plants.forEach(plant => {
            const { wateringFrequency, fertilizingFrequency } = plant.analysis.careSchedule;
            if (wateringFrequency > 0) {
                const lastWatering = new Date(plant.lastCare.watering);
                const nextWatering = addDays(lastWatering, wateringFrequency);
                if (nextWatering <= startOfToday) {
                    allAlerts.push({ plantId: plant.id, plantName: plant.analysis.popularName, plantImage: plant.image, task: 'watering', dueDate: nextWatering });
                }
            }
            if (fertilizingFrequency > 0) {
                const lastFertilizing = new Date(plant.lastCare.fertilizing);
                const nextFertilizing = addDays(lastFertilizing, fertilizingFrequency);
                 if (nextFertilizing <= startOfToday) {
                    allAlerts.push({ plantId: plant.id, plantName: plant.analysis.popularName, plantImage: plant.image, task: 'fertilizing', dueDate: nextFertilizing });
                }
            }
            (plant.customTasks || []).forEach(customTask => {
                if (customTask.frequencyDays > 0) {
                    const lastCompleted = new Date(customTask.lastCompleted);
                    const nextDueDate = addDays(lastCompleted, customTask.frequencyDays);
                    if (nextDueDate <= startOfToday) {
                        allAlerts.push({
                            plantId: plant.id,
                            plantName: plant.analysis.popularName,
                            plantImage: plant.image,
                            task: 'custom',
                            dueDate: nextDueDate,
                            customTaskId: customTask.id,
                            customTaskName: getCustomTaskDisplay(customTask).name,
                        });
                    }
                }
            });
        });

        return allAlerts.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    }, [appData.plants]);

    const value = useMemo(() => ({
        isAuthenticated, currentUser, appData, alerts, isExpertLoading, userProfile,
        login, signup, logout, addPlant, deletePlant, getPlantById, addHistoryEntry, getRecommendations,
        completeCareTask, updatePlantCareSchedule, addCustomTask, updateCustomTask,
        removeCustomTask, sendChatMessage, activateCarePlan, cancelCarePlan, updatePlantIdentification,
        apiConfig
    }), [
        isAuthenticated, currentUser, appData, alerts, isExpertLoading, userProfile,
        login, signup, logout, addPlant, deletePlant, getPlantById, addHistoryEntry, getRecommendations,
        completeCareTask, updatePlantCareSchedule, addCustomTask, updateCustomTask,
        removeCustomTask, sendChatMessage, activateCarePlan, cancelCarePlan, updatePlantIdentification,
        apiConfig
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

const useApp = () => {
  const context = React.useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

// --- UI Components ---
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...props }) => (
  <button
    {...props}
    className={`w-full bg-primary text-text-light font-bold py-3 px-4 rounded-lg shadow-md hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-focus transition duration-300 ease-in-out disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const Spinner: React.FC = () => <div className="border-4 border-secondary border-t-primary rounded-full w-12 h-12 animate-spin"></div>;

// --- Pages / Components ---

const AuthPage = () => {
  const { login, signup } = useApp();
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
        if (isLoginView) {
            await login(email.trim(), password);
        } else {
            await signup(name.trim(), email.trim(), password);
        }
    } catch (err: any) {
        setError(err.message || 'Ocorreu um erro.');
    } finally {
        setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-100 to-secondary p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
            <LeafIcon className="w-16 h-16 mx-auto text-primary" />
            <h1 className="font-serif text-4xl font-bold text-primary mt-4">Izy Botanic</h1>
            <p className="text-text-dark mt-2">Seu assistente pessoal para o cuidado de plantas.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-text-dark text-center mb-6">{isLoginView ? 'Bem-vindo de volta!' : 'Crie sua conta'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLoginView && (
                     <input className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-text-dark leading-tight focus:outline-none focus:shadow-outline" id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" required />
                )}
                <input className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-text-dark leading-tight focus:outline-none focus:shadow-outline" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
                <input className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-text-dark leading-tight focus:outline-none focus:shadow-outline" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="******************" required />
                
                 {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <Button type="submit" className="mt-4" disabled={isLoading}>
                    {isLoading ? (isLoginView ? 'Entrando...' : 'Cadastrando...') : (isLoginView ? 'Entrar' : 'Cadastrar')}
                </Button>
                 <p className="text-center text-text-dark text-sm pt-4">
                    {isLoginView ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                    <button type="button" onClick={() => { setIsLoginView(!isLoginView); setError('')} } className="font-bold text-primary hover:text-primary-focus ml-1">{isLoginView ? 'Cadastre-se' : 'Faça login'}</button>
                </p>
            </form>
        </div>
      </div>
    </div>
  );
};


const Header = () => {
  const { logout, alerts, userProfile } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { path: '/calendar', label: 'Calendário', icon: CalendarIcon },
    { path: '/expert-ai', label: 'Especialista AI', icon: SparklesIcon },
    { path: '/achievements', label: 'Conquistas', icon: TrophyIcon },
    { path: '/settings', label: 'Configurações', icon: LeafIcon }
  ];

  return (
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-20">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-4">
                  {location.pathname !== '/dashboard' ? (
                      <button onClick={() => navigate(-1)} className="text-primary hover:text-primary-focus p-2 -ml-2"><ArrowLeftIcon className="w-6 h-6" /></button>
                  ) : (
                       <Link to="/dashboard" className="relative">
                          <LeafIcon className="w-8 h-8 text-primary"/>
                          {alerts.length > 0 && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"></span>}
                       </Link>
                  )}
                  <Link to="/dashboard"><h1 className="font-serif text-2xl font-bold text-primary hidden sm:block">Izy Botanic</h1></Link>
              </div>
              <nav className="hidden md:flex items-center gap-4">
                {navLinks.map(link => <Link key={link.path} to={link.path} className={`flex items-center gap-2 font-semibold text-text-dark/80 hover:text-primary transition-colors ${location.pathname.startsWith(link.path) ? 'text-primary' : ''}`}><link.icon className="w-5 h-5"/>{link.label}</Link>)}
              </nav>
              <div className="flex items-center gap-3">
                    {userProfile?.name && (
                       <Link to="/profile" className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm uppercase hover:ring-2 hover:ring-primary-focus transition-all">
                            {userProfile.name[0]}
                        </Link>
                    )}
                    <button onClick={logout} className="text-text-dark/80 hover:text-primary transition-colors p-2 -mr-2" aria-label="Sair">
                        <LogoutIcon className="w-6 h-6" />
                    </button>
                </div>
          </div>
      </header>
  );
};

const GardenStats: React.FC<{plants: Plant[], weeklyTasks: number}> = ({ plants, weeklyTasks }) => {
    const totalPlants = plants.length;
    const healthyPlants = plants.filter(p => p.analysis.isHealthy).length;

    const stats = [
        { label: "Total de Plantas", value: totalPlants, icon: LeafIcon },
        { label: "Plantas Saudáveis", value: healthyPlants, icon: CheckCircleIcon },
        { label: "Tarefas da Semana", value: weeklyTasks, icon: CalendarIcon }
    ];

    return (
        <div className="mb-8 bg-white p-4 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold font-serif text-text-dark mb-3">Visão Geral</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
                {stats.map(stat => (
                    <div key={stat.label} className="bg-secondary p-3 rounded-lg">
                        <stat.icon className="w-7 h-7 mx-auto text-primary mb-1"/>
                        <p className="text-2xl font-bold text-primary">{stat.value}</p>
                        <p className="text-xs text-text-dark font-semibold">{stat.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};


const DashboardPage = () => {
    const { appData, alerts, completeCareTask } = useApp();
    const { plants, userProfile } = appData;
    const navigate = useNavigate();
    const currentSeason = getSeason(new Date());
    const seasonTip = SEASONAL_TIPS[currentSeason];
    const [searchQuery, setSearchQuery] = useState('');

    const filteredPlants = useMemo(() => 
        plants.filter(plant => 
            plant.analysis.popularName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            plant.analysis.speciesName.toLowerCase().includes(searchQuery.toLowerCase())
        ), [plants, searchQuery]);

    const weeklyTasksCount = useMemo(() => {
        const today = new Date();
        const nextWeek = addDays(today, 7);
        let count = 0;
        plants.forEach(p => {
            if (p.analysis.careSchedule.wateringFrequency > 0 && addDays(new Date(p.lastCare.watering), p.analysis.careSchedule.wateringFrequency) < nextWeek) count++;
            if (p.analysis.careSchedule.fertilizingFrequency > 0 && addDays(new Date(p.lastCare.fertilizing), p.analysis.careSchedule.fertilizingFrequency) < nextWeek) count++;
            p.customTasks?.forEach(ct => {
                if(addDays(new Date(ct.lastCompleted), ct.frequencyDays) < nextWeek) count++;
            });
        });
        return count;
    }, [plants]);

    return (
        <div className="container mx-auto p-4 md:p-6">
             <div className="mb-8">
                <h1 className="text-3xl font-bold font-serif text-text-dark">Olá, <span className="text-primary">{userProfile?.name}!</span></h1>
                <p className="text-gray-600">Aqui está o resumo do seu jardim hoje.</p>
            </div>

            <GardenStats plants={plants} weeklyTasks={weeklyTasksCount} />
            
            {alerts.length > 0 && (
                <div className="mb-8">
                     <h2 className="text-2xl font-bold font-serif text-text-dark mb-4 flex items-center gap-3"><BellIcon className="w-6 h-6 text-accent"/>Alertas de Cuidado</h2>
                     <div className="bg-white p-4 rounded-2xl shadow-lg">
                        <div className="space-y-4">
                            {alerts.map(alert => (
                                <div key={`${alert.plantId}-${alert.task}-${alert.customTaskId || ''}`} className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                                    <img src={`data:image/jpeg;base64,${alert.plantImage}`} alt={alert.plantName} className="w-12 h-12 object-cover rounded-full" />
                                    <div className="flex-grow">
                                        <p className="font-bold text-text-dark">{alert.plantName}</p>
                                        <p className="text-sm capitalize text-primary font-semibold">
                                            {alert.task === 'custom' ? alert.customTaskName : (alert.task === 'watering' ? 'Regar' : 'Adubar')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-red-600">{formatDueDate(alert.dueDate)}</p>
                                        <button onClick={() => completeCareTask(alert.plantId, alert.task, alert.customTaskId)} className="text-xs bg-primary text-white px-2 py-1 rounded-md mt-1 hover:bg-primary-focus">Concluir</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-4 rounded-2xl shadow-lg">
                     <h3 className="text-xl font-bold font-serif text-text-dark mb-3">Menu Rápido</h3>
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div onClick={() => navigate('/analyze')} className="text-center p-3 bg-secondary rounded-lg cursor-pointer hover:bg-green-100"><CameraIcon className="w-7 h-7 mx-auto text-primary mb-1"/><span className="text-xs font-semibold text-text-dark">Analisar</span></div>
                        <div onClick={() => navigate('/calendar')} className="text-center p-3 bg-secondary rounded-lg cursor-pointer hover:bg-green-100"><CalendarIcon className="w-7 h-7 mx-auto text-primary mb-1"/><span className="text-xs font-semibold text-text-dark">Calendário</span></div>
                        <div onClick={() => navigate('/expert-ai')} className="text-center p-3 bg-secondary rounded-lg cursor-pointer hover:bg-green-100"><SparklesIcon className="w-7 h-7 mx-auto text-primary mb-1"/><span className="text-xs font-semibold text-text-dark">Especialista AI</span></div>
                        <div onClick={() => navigate('/achievements')} className="text-center p-3 bg-secondary rounded-lg cursor-pointer hover:bg-green-100"><TrophyIcon className="w-7 h-7 mx-auto text-primary mb-1"/><span className="text-xs font-semibold text-text-dark">Conquistas</span></div>
                     </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold font-serif text-text-dark mb-3">Dicas da Estação ({currentSeason})</h3>
                    <p className="text-sm text-gray-600">{seasonTip}</p>
                </div>
            </div>

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold font-serif text-text-dark">Meu Jardim</h2>
                 <input 
                    type="text" 
                    placeholder="Buscar planta..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="shadow-sm appearance-none border rounded-lg py-2 px-3 text-text-dark leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredPlants.map(plant => (
                    <div key={plant.id} onClick={() => navigate(`/plant/${plant.id}`)} className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-transform duration-300">
                        <img src={`data:image/jpeg;base64,${plant.image}`} alt={plant.analysis.popularName} className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity" />
                        <div className="p-4">
                            <h3 className="text-xl font-bold font-serif text-text-dark truncate">{plant.analysis.popularName}</h3>
                            <p className="text-sm text-gray-500 truncate italic">{plant.analysis.speciesName}</p>
                            <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${plant.analysis.isHealthy ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                <span className={`w-2 h-2 rounded-full ${plant.analysis.isHealthy ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                {plant.analysis.isHealthy ? 'Saudável' : 'Requer Atenção'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {plants.length > 0 && filteredPlants.length === 0 && (
                <div className="text-center mt-16 col-span-full">
                    <h2 className="text-xl font-bold text-text-dark">Nenhuma planta encontrada.</h2>
                    <p className="text-gray-500 mt-2">Tente um termo de busca diferente.</p>
                </div>
            )}
            {plants.length === 0 && (
                <div className="text-center mt-16 col-span-full">
                    <h2 className="text-2xl font-bold text-text-dark">Seu jardim está vazio.</h2>
                    <p className="text-gray-500 mt-2">Clique em "Analisar" para começar a cuidar das suas plantas.</p>
                    <Button onClick={() => navigate('/analyze')} className="mt-4 max-w-xs mx-auto">Analisar Primeira Planta</Button>
                </div>
            )}
        </div>
    );
};


const CameraCapture: React.FC<{ onCapture: (base64: string) => void; onClose: () => void; }> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let streamInstance: MediaStream | null = null;
        const enableStream = async () => {
            try {
                streamInstance = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                setStream(streamInstance);
                if (videoRef.current) {
                    videoRef.current.srcObject = streamInstance;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setError("Não foi possível acessar a câmera. Verifique as permissões do seu navegador.");
            }
        };
        enableStream();

        return () => {
            if (streamInstance) {
                streamInstance.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            onCapture(dataUrl);
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
            {error && <p className="text-white text-center p-4 bg-red-500 rounded-md">{error}</p>}
            <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${error ? 'hidden' : ''}`} />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/50 flex justify-center items-center gap-8">
                <button onClick={onClose} className="text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button onClick={handleCapture} disabled={!!error} className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 disabled:opacity-50"></button>
                <div className="w-[88px]"></div>
            </div>
        </div>
    );
};


const AnalyzePage = () => {
    const [image, setImage] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<PlantDiagnosis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addPlant } = useApp();
    const navigate = useNavigate();
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                setImage(result);
                setImageBase64(result.split(',')[1]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!imageBase64) return setError("Por favor, selecione uma imagem.");
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        try {
            const result = await analyzePlantImage(imageBase64);
            setAnalysisResult(result);
        } catch (err) {
            setError("Falha ao analisar a imagem. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSavePlant = (location: 'indoor' | 'outdoor') => {
        if (analysisResult && imageBase64) {
            const now = new Date().toISOString();
            addPlant({
                id: new Date().toISOString(),
                image: imageBase64,
                analysis: analysisResult,
                location: location,
                history: [],
                lastCare: {
                    watering: now,
                    fertilizing: now,
                },
                customTasks: [],
            });
            navigate('/dashboard');
        }
    };

    const handleCameraCapture = (dataUrl: string) => {
        setImage(dataUrl);
        setImageBase64(dataUrl.split(',')[1]);
        setIsCameraOpen(false);
    };

    return (
        <>
            {isCameraOpen && <CameraCapture onCapture={handleCameraCapture} onClose={() => setIsCameraOpen(false)} />}
            <div className="container mx-auto p-4 md:p-6">
                {!analysisResult && (
                    <div className="max-w-2xl mx-auto text-center">
                        <h2 className="text-3xl font-bold font-serif text-text-dark mb-4">Analisar a Saúde da Planta</h2>
                        <p className="text-gray-600 mb-8">Envie uma foto nítida da sua planta para que nossa IA possa identificá-la e fornecer um diagnóstico completo.</p>
                        <div className="bg-white p-8 rounded-2xl shadow-lg">
                            <div className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-6 bg-gray-50">
                                {image ? (
                                    <img src={image} alt="Pré-visualização" className="max-h-full max-w-full object-contain rounded-md" />
                                ) : (
                                    <div className="text-center text-gray-500">
                                        <CameraIcon className="w-10 h-10 mx-auto mb-2" />
                                        <span>Use a câmera ou envie um arquivo</span>
                                    </div>
                                )}
                            </div>
                            <input id="plant-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                             <div className="flex gap-4 mb-4">
                                <label htmlFor="plant-upload" className="flex-1 cursor-pointer text-center bg-secondary text-primary font-semibold py-3 px-4 rounded-lg hover:bg-green-100 flex items-center justify-center gap-2">
                                    <PlusIcon className="w-5 h-5" /><span>Enviar Arquivo</span>
                                </label>
                                <button onClick={() => setIsCameraOpen(true)} className="flex-1 text-center bg-secondary text-primary font-semibold py-3 px-4 rounded-lg hover:bg-green-100 flex items-center justify-center gap-2">
                                    <CameraIcon className="w-5 h-5"/><span>Tirar Foto</span>
                                </button>
                            </div>
                            {error && <p className="text-red-500 mb-4">{error}</p>}
                            <Button onClick={handleAnalyze} disabled={!image || isLoading}>{isLoading ? 'Analisando...' : 'Analisar Planta'}</Button>
                        </div>
                    </div>
                )}

                {isLoading && <div className="flex flex-col items-center justify-center mt-12"><Spinner /><p className="mt-4 text-text-dark font-semibold">Nossos botânicos de IA estão examinando sua planta...</p></div>}
                
                {analysisResult && !isLoading && (
                     <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-8">
                            <h2 className="font-serif text-5xl font-bold text-primary">{analysisResult.popularName}</h2>
                            <p className="text-lg text-gray-500 italic">{analysisResult.speciesName}</p>
                             <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                                analysisResult.identificationConfidence === 'Alta' ? 'bg-green-100 text-green-800' :
                                analysisResult.identificationConfidence === 'Média' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                                Confiança da IA: <strong>{analysisResult.identificationConfidence}</strong>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 space-y-6">
                                 <img src={image!} alt="Planta analisada" className="rounded-2xl shadow-lg w-full object-cover aspect-square" />
                                 <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
                                    <h3 className="text-lg font-bold text-primary mb-4">Adicionar ao Meu Jardim</h3>
                                    <div className="space-y-3">
                                        <Button onClick={() => handleSavePlant('indoor')} className="bg-accent hover:bg-amber-600">Planta Interna</Button>
                                        <Button onClick={() => handleSavePlant('outdoor')} className="bg-accent hover:bg-amber-600">Planta Externa</Button>
                                    </div>
                                </div>
                            </div>
                             <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white p-6 rounded-2xl shadow-lg">
                                    <h3 className="font-bold text-xl text-text-dark mb-3">Diagnóstico Geral</h3>
                                    <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary">
                                         <div className={`w-3 h-3 rounded-full ${analysisResult.isHealthy ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                                         <p className="font-bold text-lg text-text-dark">{analysisResult.diagnosis.title}</p>
                                    </div>
                                    <p className="text-text-dark mt-3">{analysisResult.diagnosis.description}</p>
                                </div>
                                 {analysisResult.alternativeSpecies && analysisResult.alternativeSpecies.length > 0 && (
                                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                                        <h3 className="font-bold text-xl text-text-dark mb-4">Outras Possibilidades</h3>
                                        <p className="text-sm text-gray-600 mb-4">Se a identificação acima não parecer correta, considere estas alternativas:</p>
                                        <div className="space-y-4">
                                            {analysisResult.alternativeSpecies.map((alt, index) => (
                                                <div key={index} className="bg-secondary p-4 rounded-lg">
                                                    <h4 className="font-bold text-primary">{alt.popularName}</h4>
                                                    <p className="text-sm italic text-gray-500">{alt.speciesName}</p>
                                                    <p className="text-sm text-text-dark mt-2">{alt.reason}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="bg-white p-6 rounded-2xl shadow-lg">
                                    <h3 className="font-bold text-xl text-text-dark mb-4">Plano de Cuidados Essenciais</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                       <div className="bg-blue-50 p-4 rounded-lg"><WaterDropIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" /><h4 className="font-bold text-blue-800">Rega</h4><p className="text-sm text-blue-700">{analysisResult.careInstructions.watering}</p></div>
                                       <div className="bg-yellow-50 p-4 rounded-lg"><SunIcon className="w-8 h-8 text-yellow-500 mx-auto mb-2" /><h4 className="font-bold text-yellow-800">Luz Solar</h4><p className="text-sm text-yellow-700">{analysisResult.careInstructions.sunlight}</p></div>
                                       <div className="bg-green-50 p-4 rounded-lg"><SproutIcon className="w-8 h-8 text-green-600 mx-auto mb-2" /><h4 className="font-bold text-green-800">Solo</h4><p className="text-sm text-green-700">{analysisResult.careInstructions.soil}</p></div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-lg">
                                    <h3 className="font-bold text-xl text-text-dark mb-4">Dicas de Especialista</h3>
                                    <ul className="space-y-3">{analysisResult.generalTips.map((tip, i) => <li key={i} className="flex items-start gap-3"><CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0 mt-1" /><span>{tip}</span></li>)}</ul>
                                </div>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

const EditCareScheduleModal: React.FC<{ plant: Plant; onClose: () => void; onSave: (newSchedule: Partial<CareSchedule>) => void; }> = ({ plant, onClose, onSave }) => {
    const [watering, setWatering] = useState(plant.analysis.careSchedule.wateringFrequency);
    const [fertilizing, setFertilizing] = useState(plant.analysis.careSchedule.fertilizingFrequency);

    const handleSave = () => {
        onSave({
            wateringFrequency: Number(watering),
            fertilizingFrequency: Number(fertilizing),
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-xl text-text-dark mb-4">Editar Cronograma Principal</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="watering" className="block text-sm font-medium text-gray-700">Frequência de Rega (dias)</label>
                        <input
                            type="number"
                            id="watering"
                            value={watering}
                            onChange={e => setWatering(Number(e.target.value))}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div>
                        <label htmlFor="fertilizing" className="block text-sm font-medium text-gray-700">Frequência de Adubação (dias)</label>
                        <input
                            type="number"
                            id="fertilizing"
                            value={fertilizing}
                            onChange={e => setFertilizing(Number(e.target.value))}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary"
                            placeholder="0 se não aplicável"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-focus transition-colors">Salvar</button>
                </div>
            </div>
        </div>
    );
};

const CustomCareTaskModal: React.FC<{ task: CustomCareTask | null; plantId: string; onClose: () => void;}> = ({ task, plantId, onClose }) => {
    const { addCustomTask, updateCustomTask } = useApp();
    const [type, setType] = useState<PredefinedTaskType>(task?.type || 'prune');
    const [customName, setCustomName] = useState(task?.customName || '');
    const [frequency, setFrequency] = useState(task?.frequencyDays || 7);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if ((type === 'other' && !customName.trim()) || frequency <= 0) return;

        const taskData = {
            type,
            customName: type === 'other' ? customName.trim() : undefined,
            frequencyDays: frequency
        };

        if (task) {
            updateCustomTask(plantId, task.id, taskData);
        } else {
            addCustomTask(plantId, taskData);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-xl text-text-dark mb-4">{task ? 'Editar Tarefa' : 'Adicionar Tarefa'}</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="taskType" className="block text-sm font-medium text-gray-700">Tipo de Tarefa</label>
                        <select
                            id="taskType"
                            value={type}
                            onChange={(e) => setType(e.target.value as PredefinedTaskType)}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary"
                        >
                            {Object.entries(PREDEFINED_TASKS_CONFIG).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    {type === 'other' && (
                        <div>
                            <label htmlFor="customName" className="block text-sm font-medium text-gray-700">Nome da Tarefa Personalizada</label>
                            <input
                                type="text"
                                id="customName"
                                value={customName}
                                onChange={e => setCustomName(e.target.value)}
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary"
                                placeholder="Ex: Adubar com húmus"
                                required
                            />
                        </div>
                    )}
                    <div>
                        <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">Repetir a cada (dias)</label>
                        <input
                            type="number"
                            id="frequency"
                            value={frequency}
                            onChange={e => setFrequency(Number(e.target.value))}
                            min="1"
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary"
                            required
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">Cancelar</button>
                    <button type="submit" className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-focus transition-colors">Salvar</button>
                </div>
            </form>
        </div>
    );
};

const DeleteConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    plantName: string;
}> = ({ isOpen, onClose, onConfirm, plantName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
                <TrashIcon className="w-12 h-12 mx-auto text-red-500 mb-4" />
                <h3 className="font-bold text-xl text-text-dark mb-2">Excluir Planta</h3>
                <p className="text-gray-600 mb-6">
                    Tem certeza de que deseja remover <strong>{plantName}</strong> do seu jardim? Esta ação não pode ser desfeita.
                </p>
                <div className="flex justify-center gap-4">
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="flex-1 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
};

const EditIdentificationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (suggestion: string) => void;
    isLoading: boolean;
    plantName: string;
}> = ({ isOpen, onClose, onSubmit, isLoading, plantName }) => {
    const [suggestion, setSuggestion] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (suggestion.trim()) {
            onSubmit(suggestion.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <h3 className="font-bold text-xl text-text-dark mb-2">Corrigir Identificação</h3>
                    <p className="text-gray-600 mb-4">
                        Acha que a planta não é um(a) <strong>{plantName}</strong>? Sugira o nome correto e nossa IA fará uma nova verificação.
                    </p>
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={suggestion}
                            onChange={e => setSuggestion(e.target.value)}
                            className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-lg py-3 px-4 focus:ring-primary focus:border-primary"
                            placeholder="Ex: Samambaia Americana"
                            required
                        />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} disabled={isLoading} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50">Cancelar</button>
                        <button type="submit" disabled={isLoading || !suggestion.trim()} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-gray-400 flex items-center justify-center">
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Analisando...
                                </>
                            ) : (
                                'Reanalisar com IA'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const CarePlanComponent: React.FC<{ plant: Plant }> = ({ plant }) => {
    const { activateCarePlan, cancelCarePlan } = useApp();
    const { activeCarePlan } = plant;

    if (activeCarePlan) {
        const planConfig = Object.values(CARE_PLANS_CONFIG).find(p => p.id === activeCarePlan.planId);
        if (!planConfig) return null; // Should not happen

        const today = new Date();
        const startDate = new Date(activeCarePlan.startDate);
        const dayOfPlan = getDaysDifference(startDate, today) + 1;
        const progress = Math.min(100, Math.max(0, (dayOfPlan / planConfig.durationDays) * 100));

        const planTasks = plant.customTasks.filter(task => activeCarePlan.taskIds.includes(task.id));

        return (
             <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h3 className="font-bold text-xl text-primary mb-4">Plano de Cuidado Ativo</h3>
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                        <p className="font-bold text-text-dark">{activeCarePlan.name}</p>
                        <span className="text-sm font-semibold text-gray-600">Dia {dayOfPlan} de {planConfig.durationDays}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2.5">
                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
                <div className="space-y-2 mb-4">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Próximos Passos:</h4>
                    {planTasks.map(task => {
                        const dueDate = addDays(new Date(task.lastCompleted), task.frequencyDays);
                         const isComplete = dueDate < today;
                        const taskDisplay = getCustomTaskDisplay(task);
                        return (
                             <div key={task.id} className={`flex items-center gap-3 text-sm ${isComplete ? 'text-gray-400 line-through' : 'text-text-dark'}`}>
                                <taskDisplay.icon className={`w-4 h-4 flex-shrink-0 ${isComplete ? 'text-gray-400' : taskDisplay.color}`} />
                                <span>{taskDisplay.name}</span>
                                <span className="ml-auto font-medium">{formatDueDate(dueDate)}</span>
                            </div>
                        );
                    })}
                </div>
                <button onClick={() => cancelCarePlan(plant.id)} className="w-full text-center bg-red-100 text-red-700 font-bold py-2 px-4 rounded-lg hover:bg-red-200 transition-colors text-sm">
                    Cancelar Plano
                </button>
            </div>
        );
    }
    
    const availablePlans = Object.values(CARE_PLANS_CONFIG).filter(plan => plan.isAvailable(plant));

    if (availablePlans.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="font-bold text-xl text-primary mb-4">Planos de Cuidado Guiados</h3>
            <div className="space-y-4">
                {availablePlans.map(plan => {
                    const Icon = plan.icon;
                    return (
                        <div key={plan.id} className="bg-secondary p-4 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Icon className="w-8 h-8 text-primary flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-text-dark">{plan.name}</h4>
                                    <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                                </div>
                            </div>
                            <button onClick={() => activateCarePlan(plant.id, plan.id as keyof typeof CARE_PLANS_CONFIG)} className="mt-3 w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-primary-focus text-sm">
                                Iniciar Plano de {plan.durationDays} Dias
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const PlantDetailPage = () => {
    const { getPlantById, addHistoryEntry, updatePlantCareSchedule, removeCustomTask, deletePlant, updatePlantIdentification } = useApp();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const plant = id ? getPlantById(id) : undefined;
    
    const [newNote, setNewNote] = useState("");
    const [newImage, setNewImage] = useState<string | null>(null);
    const [newImageBase64, setNewImageBase64] = useState<string | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCustomTaskModalOpen, setIsCustomTaskModalOpen] = useState(false);
    const [editingCustomTask, setEditingCustomTask] = useState<CustomCareTask | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditIdModalOpen, setIsEditIdModalOpen] = useState(false);
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const [reanalysisMessage, setReanalysisMessage] = useState<string | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                setNewImage(result);
                setNewImageBase64(result.split(',')[1]);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        if ((newNote.trim() || newImageBase64) && id) {
            addHistoryEntry(id, newNote.trim(), newImageBase64);
            setNewNote("");
            setNewImage(null);
            setNewImageBase64(undefined);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
    const handleSaveSchedule = (newSchedule: Partial<CareSchedule>) => {
        if (id) {
            updatePlantCareSchedule(id, newSchedule);
        }
    };

    const handleDeletePlant = () => {
        if (plant) {
            deletePlant(plant.id);
            navigate('/dashboard');
        }
    };

    const handleUpdateIdentification = async (userSuggestion: string) => {
        if (!plant) return;
        setIsReanalyzing(true);
        setReanalysisMessage(null);
        const result = await updatePlantIdentification(plant.id, userSuggestion);
        setIsReanalyzing(false);
        setReanalysisMessage(result.message);
        if (result.success) {
            setIsEditIdModalOpen(false);
            setTimeout(() => setReanalysisMessage(null), 5000);
        }
    };

    if (!plant) return <div className="text-center p-10"><h2 className="text-2xl font-bold">Planta não encontrada</h2></div>;
    const { analysis, history, location, lastCare, customTasks, activeCarePlan } = plant;
    
    const nextWateringDate = addDays(new Date(lastCare.watering), analysis.careSchedule.wateringFrequency);
    const nextFertilizingDate = analysis.careSchedule.fertilizingFrequency > 0 ? addDays(new Date(lastCare.fertilizing), analysis.careSchedule.fertilizingFrequency) : null;
    
    const userCreatedTasks = useMemo(() => {
        const planTaskIds = new Set(activeCarePlan?.taskIds || []);
        return customTasks.filter(task => !planTaskIds.has(task.id));
    }, [customTasks, activeCarePlan]);

    return (
        <>
            <div className="container mx-auto p-4 md:p-6">
                <div className="max-w-6xl mx-auto">
                     <div className="text-center mb-6">
                        <span className="bg-secondary text-accent font-semibold px-3 py-1 rounded-full text-sm capitalize">{location === 'indoor' ? 'Planta Interna' : 'Planta Externa'}</span>
                        <div className="flex items-center justify-center gap-2">
                            <h2 className="font-serif text-5xl font-bold text-primary mt-2">{analysis.popularName}</h2>
                            <button onClick={() => setIsEditIdModalOpen(true)} className="text-gray-400 hover:text-primary mt-4 p-1" aria-label="Corrigir identificação">
                                <PencilIcon className="w-6 h-6"/>
                            </button>
                        </div>
                        <p className="text-lg text-gray-500 italic">{analysis.speciesName}</p>
                        {reanalysisMessage && (
                            <div className={`mt-4 p-3 max-w-2xl mx-auto rounded-lg text-sm font-semibold ${reanalysisMessage.includes('sucesso') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {reanalysisMessage}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <img src={`data:image/jpeg;base64,${plant.image}`} alt={analysis.popularName} className="rounded-2xl shadow-xl w-full h-auto object-cover aspect-square" />
                            
                            <CarePlanComponent plant={plant} />

                            <div className="bg-white p-6 rounded-2xl shadow-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-xl text-primary">Cronograma Principal</h3>
                                    <button onClick={() => setIsEditModalOpen(true)} className="text-gray-500 hover:text-primary p-1" aria-label="Editar cronograma de cuidados"><EditIcon className="w-5 h-5"/></button>
                                </div>
                                 <div className="space-y-4">
                                    <div className="flex items-start gap-3"><WaterDropIcon className="w-5 h-5 text-primary mt-1 flex-shrink-0"/><div className="text-sm"><strong>Próxima Rega:</strong> {formatDueDate(nextWateringDate)}</div></div>
                                    {nextFertilizingDate && <div className="flex items-start gap-3"><SproutIcon className="w-5 h-5 text-primary mt-1 flex-shrink-0"/><div className="text-sm"><strong>Próxima Adubação:</strong> {formatDueDate(nextFertilizingDate)}</div></div>}
                                    <div className="flex items-start gap-3"><ScissorsIcon className="w-5 h-5 text-primary mt-1 flex-shrink-0"/><div className="text-sm"><strong>Poda:</strong> {analysis.careSchedule.pruningSchedule}</div></div>
                                 </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-2xl shadow-lg">
                                <h3 className="font-bold text-xl text-primary mb-4">Suas Tarefas Recorrentes</h3>
                                <div className="space-y-3 mb-4">
                                    {userCreatedTasks.length > 0 ? userCreatedTasks.map(task => {
                                        const { name, icon: Icon, color } = getCustomTaskDisplay(task);
                                        return (
                                            <div key={task.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
                                                    <div>
                                                        <p className="font-semibold text-text-dark">{name}</p>
                                                        <p className="text-xs text-gray-500">A cada {task.frequencyDays} dia(s) - Próxima: {formatDueDate(addDays(new Date(task.lastCompleted), task.frequencyDays))}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => { setEditingCustomTask(task); setIsCustomTaskModalOpen(true); }} className="p-2 text-gray-500 hover:text-primary"><EditIcon className="w-4 h-4"/></button>
                                                    <button onClick={() => removeCustomTask(plant.id, task.id)} className="p-2 text-gray-500 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        )
                                    }) : <p className="text-sm text-gray-500 text-center py-2">Nenhuma tarefa recorrente criada.</p>}
                                </div>
                                <Button className="text-sm py-2 bg-secondary text-primary hover:bg-green-100" onClick={() => { setEditingCustomTask(null); setIsCustomTaskModalOpen(true); }}><PlusIcon className="w-4 h-4 inline-block mr-1"/> Adicionar Tarefa</Button>
                            </div>
                        </div>
                        <div className="lg:col-span-3 space-y-6">
                            {analysis.pestAndDiseaseAnalysis && (
                                 <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-lg shadow-lg">
                                    <div className="flex items-start gap-4"><BugIcon className="w-8 h-8 text-red-600 flex-shrink-0" />
                                        <div><h3 className="font-bold text-xl text-red-800">{analysis.pestAndDiseaseAnalysis.title}</h3><p className="text-red-700 mt-1">{analysis.pestAndDiseaseAnalysis.description}<br/><strong>Tratamento: </strong>{analysis.pestAndDiseaseAnalysis.suggestedTreatment}</p></div>
                                    </div>
                                </div>
                            )}
                             <div className="bg-white p-6 rounded-2xl shadow-lg">
                                <h3 className="font-bold text-xl text-primary mb-4">Diário da Planta</h3>
                                <form onSubmit={handleAddNote} className="space-y-3">
                                    <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Adicionar uma anotação sobre o progresso..." className="flex-grow shadow-inner appearance-none border rounded-lg w-full py-2 px-3 text-text-dark leading-tight focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
                                    {newImage && <img src={newImage} alt="Preview" className="rounded-lg w-full max-h-40 object-cover mt-2"/>}
                                    <div className="flex gap-2">
                                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} id="history-photo-upload" />
                                        <label htmlFor="history-photo-upload" className="flex-1 text-center cursor-pointer bg-secondary text-primary font-semibold py-2 px-3 rounded-lg hover:bg-green-100 flex items-center justify-center gap-2"><CameraIcon className="w-5 h-5" /><span>Foto</span></label>
                                        <button type="submit" className="flex-1 bg-primary text-white p-2 rounded-lg hover:bg-primary-focus disabled:bg-gray-300" disabled={!newNote.trim() && !newImageBase64}><PencilIcon className="w-5 h-5 inline-block mr-2"/>Salvar</button>
                                    </div>
                                </form>
                                <div className="space-y-4 max-h-60 overflow-y-auto pr-2 mt-4">
                                    {history?.length > 0 ? history.map(entry => (
                                        <div key={entry.id} className="text-sm bg-gray-50 p-3 rounded-lg">
                                            {entry.image && <img src={`data:image/jpeg;base64,${entry.image}`} alt="Nota do histórico" className="rounded-md w-full object-cover mb-2 max-h-48" />}
                                            <p className="font-semibold text-text-dark">{entry.note}</p>
                                            <p className="text-xs text-gray-500 mt-1">{new Date(entry.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                    )) : <p className="text-sm text-gray-500 text-center py-4">Nenhuma anotação ainda.</p>}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-lg">
                                <h3 className="font-bold text-xl text-primary mb-3">Diagnóstico Geral</h3>
                                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary"><div className={`w-3 h-3 rounded-full ${analysis.isHealthy ? 'bg-green-500' : 'bg-amber-500'}`}></div><p className="font-bold text-lg text-text-dark">{analysis.diagnosis.title}</p></div>
                                <p className="text-text-dark mt-3">{analysis.diagnosis.description}</p>
                                
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <h4 className="font-bold text-md text-text-dark mb-2">Detalhes da Identificação da IA</h4>
                                    <div className="text-sm space-y-2">
                                        <p><strong>Confiança: </strong>
                                            <span className={`font-semibold ${
                                                analysis.identificationConfidence === 'Alta' ? 'text-green-700' :
                                                analysis.identificationConfidence === 'Média' ? 'text-yellow-700' : 'text-red-700'
                                            }`}>{analysis.identificationConfidence}</span>
                                        </p>
                                        {analysis.alternativeSpecies && analysis.alternativeSpecies.length > 0 && (
                                            <div>
                                                <p className="font-semibold">Outras possibilidades sugeridas:</p>
                                                <ul className="list-disc list-inside text-gray-600 pl-2">
                                                    {analysis.alternativeSpecies.map((alt, i) => (
                                                        <li key={i}>{alt.popularName} <span className="italic">({alt.speciesName})</span></li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-lg">
                                <h3 className="font-bold text-xl text-primary mb-4">Dicas de Especialista</h3>
                                <ul className="space-y-3">{analysis.generalTips.map((tip, i) => <li key={i} className="flex items-start gap-3"><CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0 mt-1" /><span>{tip}</span></li>)}</ul>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t-2 border-dashed border-red-200 text-center">
                        <h3 className="font-bold text-xl text-red-700 mb-2">Zona de Perigo</h3>
                        <p className="text-gray-600 mb-4 max-w-md mx-auto">A remoção de uma planta é permanente e não pode ser desfeita.</p>
                        <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="bg-red-100 text-red-700 font-bold py-2 px-6 rounded-lg hover:bg-red-200 transition-colors inline-flex items-center gap-2"
                        >
                            <TrashIcon className="w-5 h-5" />
                            Excluir esta Planta
                        </button>
                    </div>

                </div>
            </div>
            {isEditModalOpen && plant && (
                <EditCareScheduleModal
                    plant={plant}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSaveSchedule}
                />
            )}
            {isCustomTaskModalOpen && plant && (
                <CustomCareTaskModal
                    task={editingCustomTask}
                    plantId={plant.id}
                    onClose={() => { setIsCustomTaskModalOpen(false); setEditingCustomTask(null); }}
                />
            )}
            {plant && (
                 <DeleteConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleDeletePlant}
                    plantName={plant.analysis.popularName}
                />
            )}
            {plant && (
                 <EditIdentificationModal
                    isOpen={isEditIdModalOpen}
                    onClose={() => { setIsEditIdModalOpen(false); setReanalysisMessage(null); }}
                    onSubmit={handleUpdateIdentification}
                    isLoading={isReanalyzing}
                    plantName={plant.analysis.popularName}
                />
            )}
        </>
    );
};

const CareCalendarPage = () => {
    const { appData, completeCareTask } = useApp();
    const { plants } = appData;
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const tasksByDate = useMemo(() => {
        const tasks: Record<string, ({ plant: Plant; task: 'watering' | 'fertilizing' } | { plant: Plant; task: 'custom'; customTask: CustomCareTask })[]> = {};
        
        plants.forEach(plant => {
            const { wateringFrequency, fertilizingFrequency } = plant.analysis.careSchedule;
            
            // Look back and forward to populate the calendar
            for (let i = -60; i < 60; i++) {
                if (wateringFrequency > 0) {
                    const nextWateringDate = addDays(new Date(plant.lastCare.watering), wateringFrequency * i);
                    const dateKey = nextWateringDate.toISOString().split('T')[0];
                    if (!tasks[dateKey]) tasks[dateKey] = [];
                    tasks[dateKey].push({ plant, task: 'watering' });
                }
                
                if (fertilizingFrequency > 0) {
                    const nextFertilizingDate = addDays(new Date(plant.lastCare.fertilizing), fertilizingFrequency * i);
                    const dateKey = nextFertilizingDate.toISOString().split('T')[0];
                    if (!tasks[dateKey]) tasks[dateKey] = [];
                    tasks[dateKey].push({ plant, task: 'fertilizing' });
                }

                (plant.customTasks || []).forEach(customTask => {
                     if (customTask.frequencyDays > 0) {
                        const nextDueDate = addDays(new Date(customTask.lastCompleted), customTask.frequencyDays * i);
                        const dateKey = nextDueDate.toISOString().split('T')[0];
                        if (!tasks[dateKey]) tasks[dateKey] = [];
                        tasks[dateKey].push({ plant, task: 'custom', customTask });
                     }
                });
            }
        });
        return tasks;
    }, [plants]);

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(endOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const calendarDays: {date: Date, isCurrentMonth: boolean}[] = [];
    let date = new Date(startDate);
    while (date <= endDate) {
        calendarDays.push({date: new Date(date), isCurrentMonth: date.getMonth() === currentDate.getMonth()});
        date.setDate(date.getDate() + 1);
    }

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const selectedDayTasks = tasksByDate[selectedDate.toISOString().split('T')[0]] || [];
    
    return (
        <div className="container mx-auto p-4 md:p-6">
            <h2 className="text-3xl font-bold font-serif text-text-dark mb-6">Calendário de Cuidados</h2>
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-secondary"><ArrowLeftIcon className="w-5 h-5"/></button>
                    <h3 className="text-xl font-bold text-primary capitalize">{currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-secondary"><ArrowLeftIcon className="w-5 h-5 rotate-180"/></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-500 mb-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map(({ date, isCurrentMonth }) => {
                        const dateKey = date.toISOString().split('T')[0];
                        const isSelected = dateKey === selectedDate.toISOString().split('T')[0];
                        const isToday = dateKey === new Date().toISOString().split('T')[0];
                        const dayTasks = tasksByDate[dateKey] || [];

                        return (
                            <div key={dateKey} onClick={() => setSelectedDate(date)} className={`h-16 sm:h-20 rounded-lg p-1.5 sm:p-2 flex flex-col cursor-pointer transition-colors ${isCurrentMonth ? 'hover:bg-secondary' : ''} ${isSelected ? 'bg-primary/20' : ''}`}>
                                <span className={`font-bold ${isCurrentMonth ? 'text-text-dark' : 'text-gray-300'} ${isToday ? 'bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>{date.getDate()}</span>
                                <div className="flex gap-1 mt-auto">
                                    {dayTasks.slice(0, 3).map((t, i) => {
                                        const color = t.task === 'watering' ? 'bg-blue-500' : t.task === 'fertilizing' ? 'bg-green-500' : 'bg-purple-500';
                                        return <div key={i} className={`w-1.5 h-1.5 rounded-full ${color}`}></div>
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className="mt-6">
                 <h3 className="font-bold text-xl text-primary mb-3">
                    Tarefas para {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </h3>
                <div className="space-y-4">
                    {selectedDayTasks.length > 0 ? selectedDayTasks.map((item, idx) => {
                         const taskDisplay = item.task === 'custom'
                            ? getCustomTaskDisplay(item.customTask)
                            : {
                                name: item.task === 'watering' ? 'Regar' : 'Adubar',
                                icon: item.task === 'watering' ? WaterDropIcon : SproutIcon,
                                color: item.task === 'watering' ? 'text-blue-600' : 'text-green-700'
                                };
                        const Icon = taskDisplay.icon;
                        
                        return (
                             <div key={`${item.plant.id}-${item.task}-${idx}`} className="bg-white p-4 rounded-2xl shadow-lg flex items-center gap-4">
                                <img src={`data:image/jpeg;base64,${item.plant.image}`} alt={item.plant.analysis.popularName} className="w-16 h-16 object-cover rounded-lg" />
                                <div className="flex-grow">
                                    <h4 className="font-bold text-lg text-text-dark">{item.plant.analysis.popularName}</h4>
                                    <div className={`capitalize inline-flex items-center gap-2 text-sm font-semibold ${taskDisplay.color}`}>
                                        <Icon className="w-4 h-4" />
                                        {taskDisplay.name}
                                    </div>
                                </div>
                                <Button onClick={() => completeCareTask(item.plant.id, item.task, item.task === 'custom' ? item.customTask.id : undefined)} className="text-sm py-2 w-auto px-4">Concluir</Button>
                            </div>
                        )
                    }) : (
                        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
                            <CheckCircleIcon className="w-12 h-12 mx-auto text-gray-300" />
                            <p className="text-gray-500 mt-2 font-semibold">Nenhuma tarefa para este dia.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const RecommendationsPage = () => {
    const { getRecommendations } = useApp();
    const [recommendations, setRecommendations] = useState<PlantRecommendation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetch = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getRecommendations();
            setRecommendations(result);
        } catch(e) {
            setError("Não foi possível buscar recomendações. Tente mais tarde.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h2 className="text-3xl font-bold font-serif text-text-dark mb-2">Recomendações com IA</h2>
            <p className="text-gray-600 mb-6">Descubra novas plantas com base no seu jardim atual.</p>
            <div className="text-center mb-8">
                <Button onClick={handleFetch} disabled={isLoading} className="max-w-sm mx-auto">{isLoading ? 'Buscando...' : 'Obter Recomendações'}</Button>
            </div>
            {isLoading && <div className="flex justify-center"><Spinner /></div>}
            {error && <p className="text-red-500 text-center">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map((rec, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-lg">
                        <SparklesIcon className="w-8 h-8 text-accent mb-3"/>
                        <h3 className="font-serif font-bold text-2xl text-primary">{rec.popularName}</h3>
                        <p className="text-sm text-gray-500 italic mb-3">{rec.speciesName}</p>
                        <p className="text-text-dark">{rec.reason}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AchievementsPage = () => {
    const { appData } = useApp();
    const { unlockedAchievements } = appData;
    
    return(
        <div className="container mx-auto p-4 md:p-6">
             <h2 className="text-3xl font-bold font-serif text-text-dark mb-6">Minhas Conquistas</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {ACHIEVEMENTS_LIST.map(ach => {
                    const isUnlocked = unlockedAchievements.has(ach.id);
                    const Icon = ach.icon;
                    return (
                        <div key={ach.id} className={`p-6 rounded-2xl shadow-lg flex items-center gap-4 transition-all duration-300 ${isUnlocked ? 'bg-white' : 'bg-gray-100'}`}>
                            <div className={`p-3 rounded-full ${isUnlocked ? 'bg-accent/20' : 'bg-gray-200'}`}>
                                <Icon className={`w-8 h-8 ${isUnlocked ? 'text-accent' : 'text-gray-500'}`}/>
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg ${isUnlocked ? 'text-text-dark' : 'text-gray-600'}`}>{ach.title}</h3>
                                <p className="text-sm text-gray-500">{ach.description}</p>
                            </div>
                        </div>
                    );
                })}
             </div>
        </div>
    );
};

const ProfilePage = () => {
    const { userProfile, appData } = useApp();
    const { plants } = appData;

    if (!userProfile) {
        return <Navigate to="/" />;
    }

    const { name, level, growthPoints } = userProfile;
    const levelName = getLevelName(level);
    const pointsForCurrentLevel = (level - 1) * POINTS_PER_LEVEL;
    const pointsForNextLevel = level * POINTS_PER_LEVEL;
    const progress = Math.max(0, ((growthPoints - pointsForCurrentLevel) / POINTS_PER_LEVEL) * 100);

    const stats = [
        { label: "Plantas no Jardim", value: plants.length, icon: LeafIcon },
        { label: "Nível Atual", value: level, icon: TrophyIcon },
        { label: "Pontos de Crescimento", value: growthPoints, icon: SproutIcon },
    ];

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="max-w-2xl mx-auto">
                 <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
                    <div className="w-24 h-24 rounded-full bg-primary text-white flex items-center justify-center font-bold text-5xl uppercase mx-auto mb-4 ring-4 ring-primary/20">
                        {name[0]}
                    </div>
                    <h2 className="text-3xl font-bold font-serif text-text-dark">{name}</h2>
                    <p className="font-semibold text-accent">{levelName}</p>
                 </div>
                 <div className="bg-white p-6 rounded-2xl shadow-lg mt-6">
                    <h3 className="font-bold text-lg text-text-dark mb-4">Progresso para o Próximo Nível</h3>
                    <div className="w-full bg-secondary rounded-full h-4 mb-2">
                        <div className="bg-gradient-to-r from-primary to-green-400 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                        <span className="text-gray-600">{growthPoints.toLocaleString()} PC</span>
                        <span className="text-primary">{pointsForNextLevel.toLocaleString()} PC</span>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-2xl shadow-lg mt-6">
                    <h3 className="font-bold text-lg text-text-dark mb-4">Estatísticas</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        {stats.map(stat => (
                            <div key={stat.label} className="bg-secondary p-3 rounded-lg">
                                <stat.icon className="w-7 h-7 mx-auto text-primary mb-1"/>
                                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                                <p className="text-xs text-text-dark font-semibold">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>
        </div>
    );
};

const TypingIndicator = () => (
    <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
    </div>
);


const AIExpertPage = () => {
    const { appData, sendChatMessage, isExpertLoading } = useApp();
    const { chatHistory } = appData;
    const [inputMessage, setInputMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isExpertLoading]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputMessage.trim() && !isExpertLoading) {
            sendChatMessage(inputMessage);
            setInputMessage('');
        }
    };
    
    return (
        <div className="flex flex-col h-screen">
            <div className="container mx-auto px-4 md:px-6 pt-4 flex-shrink-0">
                <h2 className="text-3xl font-bold font-serif text-text-dark mb-4">Fale com a Izy</h2>
                <p className="text-gray-600 mb-4 -mt-2">Sua especialista em botânica para tirar qualquer dúvida.</p>
            </div>
            
            <div className="flex-grow overflow-y-auto px-4 md:px-6">
                <div className="container mx-auto space-y-4">
                    {chatHistory.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                               {msg.role === 'model' && <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1"><SparklesIcon className="w-5 h-5 text-white" /></div>}
                                <div className={`max-w-xl p-3 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-secondary text-text-dark'}`}>
                                    <p className="whitespace-pre-wrap text-sm md:text-base">{msg.text}</p>
                                </div>
                           </div>
                        </div>
                    ))}
                    {isExpertLoading && (
                        <div className="flex justify-start">
                             <div className="flex gap-3 items-start">
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1"><SparklesIcon className="w-5 h-5 text-white" /></div>
                                <div className="p-3 rounded-2xl bg-secondary text-text-dark">
                                    <TypingIndicator />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </div>

            <div className="bg-background sticky bottom-0 border-t border-gray-200">
                <div className="container mx-auto px-4 md:px-6">
                    <form onSubmit={handleSend} className="flex gap-2 md:gap-4 py-3">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Por que as folhas da minha planta estão amarelas?"
                            className="flex-grow shadow-inner appearance-none border rounded-lg w-full py-3 px-4 text-text-dark leading-tight focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                            disabled={isExpertLoading}
                        />
                        <Button type="submit" disabled={!inputMessage.trim() || isExpertLoading} className="w-auto px-4 md:px-6">
                            Enviar
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- Layout and Routing ---
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => useApp().isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow">
            {children}
        </main>
    </div>
);

function App() {
  return <AppProvider><HashRouter><AppRoutes /></HashRouter></AppProvider>;
}

const AppRoutes = () => {
    const { isAuthenticated } = useApp();
    return (
        <Routes>
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <AuthPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
            <Route path="/analyze" element={<ProtectedRoute><AppLayout><AnalyzePage /></AppLayout></ProtectedRoute>} />
            <Route path="/plant/:id" element={<ProtectedRoute><AppLayout><PlantDetailPage /></AppLayout></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><AppLayout><CareCalendarPage /></AppLayout></ProtectedRoute>} />
            <Route path="/expert-ai" element={<ProtectedRoute><AppLayout><div className="h-full"><AIExpertPage /></div></AppLayout></ProtectedRoute>} />
            <Route path="/recommendations" element={<ProtectedRoute><AppLayout><RecommendationsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/achievements" element={<ProtectedRoute><AppLayout><AchievementsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

export default App;