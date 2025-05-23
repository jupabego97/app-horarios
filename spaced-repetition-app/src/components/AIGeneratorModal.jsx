import React, { useState, useEffect } from 'react';
import { X, Bot, Sparkles, Lightbulb, AlertCircle } from 'lucide-react';
import aiService from '../services/aiService';

function AIGeneratorModal({ isOpen, onClose, onGenerate }) {
  // Form states
  const [deckName, setDeckName] = useState('');
  const [topic, setTopic] = useState('');
  const [numberOfCards, setNumberOfCards] = useState(10);
  const [difficulty, setDifficulty] = useState('intermedio');
  const [language, setLanguage] = useState('español');
  
  // Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [error, setError] = useState(''); // For generation errors
  const [suggestions, setSuggestions] = useState([]);

  // API Key Management State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isKeyConfigured, setIsKeyConfigured] = useState(false);
  const [apiKeyMessage, setApiKeyMessage] = useState({ text: '', type: 'idle' }); // type: 'success', 'error', 'info', 'idle'
  const [showKeyInput, setShowKeyInput] = useState(false);


  useEffect(() => {
    if (isOpen) {
      // Reset generation states
      setError('');
      setDeckName('');
      setTopic('');
      setNumberOfCards(10);
      setDifficulty('intermedio');
      setLanguage('español');
      setSuggestions([]);
      setIsGenerating(false);
      setGenerationProgress('');

      // API Key related setup
      const configured = aiService.isConfigured();
      setIsKeyConfigured(configured);
      const storedKey = localStorage.getItem('gemini_api_key');
      setApiKeyInput(storedKey || ''); // Show stored key or empty
      
      if (configured) {
        setApiKeyMessage({ text: 'API Key está configurada.', type: 'info' });
        setShowKeyInput(false); // Hide input if already configured by default
      } else {
        setApiKeyMessage({ text: 'API Key no configurada. Por favor, ingrésala.', type: 'error' });
        setShowKeyInput(true); // Show input if not configured
      }
    }
  }, [isOpen]);
  
  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) {
      setApiKeyMessage({ text: 'El API Key no puede estar vacío.', type: 'error' });
      return;
    }
    try {
      aiService.saveApiKey(apiKeyInput); // This also calls setApiKey internally
      const isValid = await aiService.testApiKey(apiKeyInput);
      if (isValid) {
        setApiKeyMessage({ text: 'API Key guardada y verificada.', type: 'success' });
        setIsKeyConfigured(true);
        setShowKeyInput(false);
      } else {
        setApiKeyMessage({ text: 'API Key guardada, pero parece inválida. Revísala.', type: 'error' });
        setIsKeyConfigured(true); // Saved, but potentially invalid
      }
    } catch (err) {
      setApiKeyMessage({ text: `Error guardando API Key: ${err.message}`, type: 'error' });
      setIsKeyConfigured(false);
    }
  };

  const handleClearKey = () => {
    aiService.clearApiKey();
    setApiKeyInput('');
    setIsKeyConfigured(false);
    setApiKeyMessage({ text: 'API Key eliminada.', type: 'info' });
    setShowKeyInput(true); // Show input after clearing
  };

  const handleTestKey = async () => {
    if (!apiKeyInput.trim()) {
      setApiKeyMessage({ text: 'Ingresa una API Key para probar.', type: 'error' });
      return;
    }
    try {
      const isValid = await aiService.testApiKey(apiKeyInput);
      if (isValid) {
        setApiKeyMessage({ text: 'API Key es válida.', type: 'success' });
      } else {
        setApiKeyMessage({ text: 'API Key es inválida o hubo un problema al verificar.', type: 'error' });
      }
    } catch (err) {
      setApiKeyMessage({ text: `Error probando API Key: ${err.message}`, type: 'error' });
    }
  };


  const generateSuggestions = async () => {
    if (!topic.trim() || !isKeyConfigured) return; // Use new isKeyConfigured state
    
    try {
      const newSuggestions = await aiService.generateTopicSuggestions(topic);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error generando sugerencias:', error);
    }
  };

  const handleGenerate = async () => {
    if (!deckName.trim() || !topic.trim()) {
      setError('Por favor completa el nombre del mazo y el tema.');
      return;
    }
    if (!isKeyConfigured) {
      setError('La API Key de Gemini no está configurada.');
      setApiKeyMessage({ text: 'La API Key de Gemini no está configurada.', type: 'error' });
      setShowKeyInput(true);
      return;
    }


    if (numberOfCards < 1 || numberOfCards > 50) {
      setError('El número de tarjetas debe estar entre 1 y 50.');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      setGenerationProgress('Conectando con Gemini AI...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setGenerationProgress(`Generando ${numberOfCards} tarjetas sobre "${topic}"...`);
      
      const cards = await aiService.generateCards(topic, numberOfCards, difficulty, language);
      
      setGenerationProgress('¡Tarjetas generadas! Creando mazo...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Llamar al callback con los datos generados
      onGenerate({
        deckName,
        cards,
        topic,
        difficulty,
        language
      });

      // Resetear y cerrar
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Generar con IA</h3>
          </div>
          {!isGenerating && (
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Generating State */}
        {isGenerating ? (
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 w-16 h-16 rounded-full mx-auto animate-ping opacity-20"></div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Generando tu mazo...
              </h3>
              <p className="text-gray-600 mb-4">{generationProgress}</p>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300 animate-pulse" style={{ width: '60%' }}></div>
              </div>
              
              <p className="text-sm text-gray-500">
                Esto puede tomar unos segundos...
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>
        ) : (
          /* Configuration Form */
          <div className="space-y-6"> {/* Increased spacing for API key section */}
            
            {/* API Key Management Section */}
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="text-md font-semibold text-gray-800 mb-3">Configuración de API Key Gemini</h4>
              
              <div className={`text-sm mb-2 ${
                apiKeyMessage.type === 'success' ? 'text-green-600' : 
                apiKeyMessage.type === 'error' ? 'text-red-600' : 
                'text-gray-600'
              }`}>
                {apiKeyMessage.text}
              </div>

              {showKeyInput || !isKeyConfigured ? (
                <div className="space-y-3">
                  <input
                    type="password" // Changed to password for discretion
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ingresa tu API Key de Gemini"
                  />
                  <div className="flex space-x-2">
                    <button onClick={handleSaveKey} className="btn-secondary text-sm py-2 px-3 flex-1">Guardar Key</button>
                    <button onClick={handleTestKey} className="btn-outline text-sm py-2 px-3 flex-1">Probar Key</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                   <p className="text-sm text-green-700 font-medium">API Key configurada y lista.</p>
                   <button onClick={() => setShowKeyInput(true)} className="text-sm text-blue-600 hover:underline">Cambiar Key</button>
                </div>
              )}
              {isKeyConfigured && showKeyInput && ( // Show clear button only if a key is configured and input is visible
                 <button onClick={handleClearKey} className="btn-danger-outline text-sm py-2 px-3 mt-2 w-full">Eliminar Key Guardada</button>
              )}
            </div>
            
            {/* Generation Form Section - Conditionally disable if key not configured */}
            <fieldset disabled={!isKeyConfigured} className="space-y-4">
              <div className={`text-center mb-6 transition-opacity duration-300 ${!isKeyConfigured ? 'opacity-50' : 'opacity-100'}`}>
                <div className="bg-gradient-to-r from-green-400 to-blue-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-6 h-6 text-white" />
                </div>
                <p className="text-gray-600">
                  Configura tu mazo y deja que la IA genere las tarjetas
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Mazo
                </label>
                <input
                  type="text"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent read-only:opacity-70"
                  placeholder="Ej: Historia de España"
                  readOnly={!isKeyConfigured}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tema de Estudio
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    setSuggestions([]);
                  }}
                  onBlur={generateSuggestions}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent read-only:opacity-70"
                  placeholder="Ej: Guerra Civil Española"
                  readOnly={!isKeyConfigured}
                />
                
                {suggestions.length > 0 && isKeyConfigured && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-2">Sugerencias de IA:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setTopic(suggestion)}
                          className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full hover:bg-purple-200 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Tarjetas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={numberOfCards}
                    onChange={(e) => setNumberOfCards(parseInt(e.target.value) || 10)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent read-only:opacity-70"
                    readOnly={!isKeyConfigured}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dificultad
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent read-only:opacity-70"
                    disabled={!isKeyConfigured}
                  >
                    <option value="básico">Básico</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idioma
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent read-only:opacity-70"
                  disabled={!isKeyConfigured}
                >
                  <option value="español">Español</option>
                  <option value="inglés">Inglés</option>
                  <option value="francés">Francés</option>
                  <option value="alemán">Alemán</option>
                  <option value="italiano">Italiano</option>
                  <option value="portugués">Portugués</option>
                </select>
              </div>
            </fieldset>


            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!isKeyConfigured || !deckName.trim() || !topic.trim()}
              className="btn-primary w-full disabled:opacity-60"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generar Mazo con IA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIGeneratorModal; 