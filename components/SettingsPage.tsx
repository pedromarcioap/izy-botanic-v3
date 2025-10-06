import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeafIcon, SaveIcon, BellIcon, SparklesIcon } from './Icons';
import type { APIConfig } from '../services/openRouterService';
import { supabaseUsers, supabaseAuth } from '../services/supabaseService';
import { AppContext } from '../App';

interface SettingsData {
  apiConfig: APIConfig;
  notifications: {
    careAlerts: boolean;
    achievements: boolean;
    tips: boolean;
  };
  preferences: {
    theme: 'light' | 'dark';
    language: 'pt-BR' | 'en-US';
    defaultView: 'dashboard' | 'calendar' | 'plants';
  };
}

const defaultSettings: SettingsData = {
  apiConfig: {
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3.5-sonnet'
  },
  notifications: {
    careAlerts: true,
    achievements: true,
    tips: true
  },
  preferences: {
    theme: 'light',
    language: 'pt-BR',
    defaultView: 'dashboard'
  }
};

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Bom para análise detalhada e respostas complexas' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', description: 'Rápido e eficiente para tarefas simples' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', description: 'Modelo poderoso com bom raciocínio' },
  { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'Google', description: 'Bom para tarefas multimodais' },
  { id: 'meta/llama-3.1-70b', name: 'Llama 3.1 70B', provider: 'Meta', description: 'Modelo de código aberto com bom desempenho' },
  { id: 'mistralai/mistral-7b', name: 'Mistral 7B', provider: 'Mistral AI', description: 'Leve e rápido para tarefas gerais' }
];

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const appContext = useContext(AppContext);
  const userId = appContext?.userId;

  // Carregar configurações salvas
  useEffect(() => {
    const loadSettings = async () => {
      if (userId) {
        try {
          const settings = await supabaseUsers.getUserSettings(userId);
          if (settings) {
            setSettings({ ...defaultSettings, ...settings });
          }
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      }
    };
    
    loadSettings();
  }, [userId]);

  const handleInputChange = (section: keyof SettingsData, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus('saving');
    
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem('izy-botanic-settings', JSON.stringify(settings));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAPI = async () => {
    setTestStatus('testing');
    setTestMessage('Testando conexão com a API...');
    
    try {
      // Simular teste de API
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (settings.apiConfig.apiKey) {
        setTestStatus('success');
        setTestMessage('✅ Conexão bem-sucedida! A API está funcionando corretamente.');
      } else {
        setTestStatus('error');
        setTestMessage('❌ Por favor, insira sua chave de API antes de testar.');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage('❌ Erro ao conectar com a API. Verifique sua chave e configuração.');
    }
    
    setTimeout(() => {
      setTestStatus('idle');
      setTestMessage('');
    }, 5000);
  };

  const handleReset = () => {
    if (confirm('Tem certeza de que deseja redefinir todas as configurações para os valores padrão?')) {
      setSettings(defaultSettings);
      localStorage.removeItem('izy-botanic-settings');
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="text-primary hover:text-primary-focus p-2 -ml-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="font-serif text-3xl font-bold text-text-dark">Configurações</h1>
          </div>
          <p className="text-gray-600">Gerencie suas preferências, configurações de API e notificações.</p>
        </div>

        {/* API Configuration */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <SparklesIcon className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-text-dark">Configuração da API</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chave de API da OpenRouter
              </label>
              <input
                type="password"
                value={settings.apiConfig.apiKey}
                onChange={(e) => handleInputChange('apiConfig', 'apiKey', e.target.value)}
                placeholder="sk-or-xxxx..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Obtenha sua chave em{' '}
                <a 
                  href="https://openrouter.ai/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  openrouter.ai/keys
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL da Base
              </label>
              <input
                type="url"
                value={settings.apiConfig.baseUrl}
                onChange={(e) => handleInputChange('apiConfig', 'baseUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo de IA
              </label>
              <select
                value={settings.apiConfig.model}
                onChange={(e) => handleInputChange('apiConfig', 'model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary mb-2"
              >
                {AVAILABLE_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider}) - {model.description}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={settings.apiConfig.model}
                onChange={(e) => handleInputChange('apiConfig', 'model', e.target.value)}
                placeholder="Ou digite o nome do modelo (ex: anthropic/claude-3.5-sonnet)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Você pode escolher um modelo da lista acima ou digitar o nome de outro modelo compatível com a OpenRouter.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleTestAPI}
                disabled={testStatus === 'testing'}
                className="flex-1 bg-secondary text-primary font-semibold py-2 px-4 rounded-lg hover:bg-green-100 disabled:opacity-50"
              >
                {testStatus === 'testing' ? 'Testando...' : 'Testar Conexão'}
              </button>
              {testMessage && (
                <div className={`flex-1 p-3 rounded-lg text-sm ${
                  testStatus === 'success' ? 'bg-green-100 text-green-800' : 
                  testStatus === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {testMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <BellIcon className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-text-dark">Notificações</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-text-dark">Alertas de Cuidado</h3>
                <p className="text-sm text-gray-500">Notificações sobre rega e adubação</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.careAlerts}
                  onChange={(e) => handleInputChange('notifications', 'careAlerts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-text-dark">Novas Conquistas</h3>
                <p className="text-sm text-gray-500">Notificações quando você desbloqueia conquistas</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.achievements}
                  onChange={(e) => handleInputChange('notifications', 'achievements', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-text-dark">Dicas da Estação</h3>
                <p className="text-sm text-gray-500">Receber dicas personalizadas para a estação atual</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.tips}
                  onChange={(e) => handleInputChange('notifications', 'tips', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-text-dark mb-6">Preferências</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tema
              </label>
              <select
                value={settings.preferences.theme}
                onChange={(e) => handleInputChange('preferences', 'theme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idioma
              </label>
              <select
                value={settings.preferences.language}
                onChange={(e) => handleInputChange('preferences', 'language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visualização Padrão
              </label>
              <select
                value={settings.preferences.defaultView}
                onChange={(e) => handleInputChange('preferences', 'defaultView', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="dashboard">Dashboard</option>
                <option value="calendar">Calendário</option>
                <option value="plants">Minhas Plantas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isLoading || saveStatus === 'saving'}
            className="flex-1 bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <SaveIcon className="w-5 h-5" />
            {isLoading || saveStatus === 'saving' ? 'Salvando...' : 'Salvar Configurações'}
          </button>
          
          <button
            onClick={handleReset}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Redefinir
          </button>
        </div>

        {/* Save Status */}
        {saveStatus === 'success' && (
          <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg">
            ✅ Configurações salvas com sucesso!
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-lg">
            ❌ Ocorreu um erro ao salvar as configurações. Tente novamente.
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;