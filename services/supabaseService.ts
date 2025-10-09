import { createClient } from '@supabase/supabase-js';
import type { Plant, HistoryEntry, UserProfile, UserAppData, ChatMessage, PlantRecommendation, PlantDiagnosis, CustomCareTask, ActiveCarePlan } from '../types';

// Configuração do Supabase
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Tabelas do Supabase
const TABLES = {
  USERS: 'users',
  PLANTS: 'plants',
  HISTORY: 'history',
  CHAT: 'chat_messages',
  ACHIEVEMENTS: 'achievements',
  USER_PLANTS: 'user_plants'
};

// Funções de Autenticação
export const supabaseAuth = {
  signUp: async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    });
    
    if (error) throw error;
    
    // Criar perfil no banco de dados
    if (data.user) {
      await supabase
        .from(TABLES.USERS)
        .insert({
          id: data.user.id,
          email: data.user.email!,
          name,
          growth_points: 0,
          level: 1
        });
    }
    
    return data;
  },
  
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  },
  
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },
  
  onAuthStateChange: (callback: (user: any) => void) => {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }
};

// Funções de Usuário
export const supabaseUsers = {
  getProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  updateProfile: async (userId: string, updates: Partial<UserProfile>) => {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  addGrowthPoints: async (userId: string, points: number) => {
    const { data: profile, error } = await supabaseUsers.getProfile(userId);
    
    if (error) throw error;
    
    const newPoints = (profile.growth_points || 0) + points;
    const newLevel = Math.floor(newPoints / 100) + 1;
    
    return await supabaseUsers.updateProfile(userId, {
      growthPoints: newPoints,
      level: newLevel
    });
  },
  
  getUserSettings: async (userId: string) => {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('settings')
      .eq('id', userId)
      .single();
    
    if (error) {
        throw error;
    }
    return data?.settings || null;
  },
  
  saveUserSettings: async (userId: string, settings: any) => {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update({ settings })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Funções de Plantas
export const supabasePlants = {
  getUserPlants: async (userId: string) => {
    const { data, error } = await supabase
      .from(TABLES.USER_PLANTS)
      .select(`
        *,
        plant (*)
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  },
  
  addPlant: async (userId: string, plant: Omit<Plant, 'id'>) => {
    // Inserir a planta
    const { data: plantData, error: plantError } = await supabase
      .from(TABLES.PLANTS)
      .insert([plant])
      .select()
      .single();
    
    if (plantError) throw plantError;
    
    // Associar ao usuário
    const { error: userPlantError } = await supabase
      .from(TABLES.USER_PLANTS)
      .insert({
        user_id: userId,
        plant_id: plantData.id
      });
    
    if (userPlantError) throw userPlantError;
    
    return plantData;
  },
  
  updatePlant: async (plantId: string, updates: Partial<Plant>) => {
    const { data, error } = await supabase
      .from(TABLES.PLANTS)
      .update(updates)
      .eq('id', plantId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  deletePlant: async (plantId: string) => {
    // Remover associações do usuário
    await supabase
      .from(TABLES.USER_PLANTS)
      .delete()
      .eq('plant_id', plantId);
    
    // Remover a planta
    const { error } = await supabase
      .from(TABLES.PLANTS)
      .delete()
      .eq('id', plantId);
    
    if (error) throw error;
  },
  
  addHistoryEntry: async (plantId: string, entry: Omit<HistoryEntry, 'id'>) => {
    const { data, error } = await supabase
      .from(TABLES.HISTORY)
      .insert([{
        ...entry,
        plant_id: plantId
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  getPlantHistory: async (plantId: string) => {
    const { data, error } = await supabase
      .from(TABLES.HISTORY)
      .select('*')
      .eq('plant_id', plantId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};

// Funções de Chat
export const supabaseChat = {
  getChatHistory: async (userId: string) => {
    const { data, error } = await supabase
      .from(TABLES.CHAT)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },
  
  addChatMessage: async (userId: string, message: Omit<ChatMessage, 'id'>) => {
    const { data, error } = await supabase
      .from(TABLES.CHAT)
      .insert([{
        ...message,
        user_id: userId
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Funções de Conquistas
export const supabaseAchievements = {
  getUserAchievements: async (userId: string) => {
    const { data, error } = await supabase
      .from(TABLES.ACHIEVEMENTS)
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  },
  
  unlockAchievement: async (userId: string, achievementId: string) => {
    const { data, error } = await supabase
      .from(TABLES.ACHIEVEMENTS)
      .insert([{
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Função principal para obter dados do usuário
export const getUserAppData = async (userId: string): Promise<UserAppData> => {
  try {
    // Obter perfil do usuário
    const profile = await supabaseUsers.getProfile(userId);
    
    // Obter plantas do usuário
    const userPlantsData = await supabasePlants.getUserPlants(userId);
    const plants = userPlantsData.map(up => up.plant);
    
    // Obter histórico de chat
    const chatHistory = await supabaseChat.getChatHistory(userId);
    
    // Obter conquistas
    const achievements = await supabaseAchievements.getUserAchievements(userId);
    const unlockedAchievements = new Set(achievements.map(a => a.achievement_id));
    
    return {
      plants,
      unlockedAchievements: new Set<string>(Array.from(unlockedAchievements).map((a: any) => a.achievement_id)),
      chatHistory,
      userProfile: {
        name: profile.name,
        growthPoints: profile.growth_points || 0,
        level: profile.level || 1
      }
    };
  } catch (error) {
    console.error('Error fetching user app data:', error);
    throw error;
  }
};

// Função para salvar dados do usuário
export const saveUserAppData = async (userId: string, data: UserAppData) => {
  try {
    // Atualizar perfil
    if (data.userProfile) {
      await supabaseUsers.updateProfile(userId, {
        growthPoints: data.userProfile.growthPoints,
        level: data.userProfile.level
      });
    }
    
    // Aqui você pode adicionar lógica para salvar outras entidades
    // como plantas, histórico de chat, etc.
    
    return true;
  } catch (error) {
    console.error('Error saving user app data:', error);
    throw error;
  }
};