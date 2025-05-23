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
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (isOpen) {
      // Reset states
      setError('');
      setDeckName('');
      setTopic('');
      setNumberOfCards(10);
      setSuggestions([]);
      setIsGenerating(false);
      setGenerationProgress('');
    }
  }, [isOpen]);

  const generateSuggestions = async () => {
    if (!topic.trim() || !aiService.isConfigured()) return;
    
    try {
      const newSuggestions = await aiService.generateTopicSuggestions(topic);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error generando sugerencias:', error);
    }
  };

  const handleGenerate = async () => {
    if (!deckName.trim() || !topic.trim()) {
      setError('Por favor completa el nombre del mazo y el tema');
      return;
    }

    if (numberOfCards < 1 || numberOfCards > 50) {
      setError('El número de tarjetas debe estar entre 1 y 50');
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
          <div className="space-y-4">
            <div className="text-center mb-6">
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ej: Historia de España"
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ej: Guerra Civil Española"
              />
              
              {suggestions.length > 0 && (
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dificultad
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="español">Español</option>
                <option value="inglés">Inglés</option>
                <option value="francés">Francés</option>
                <option value="alemán">Alemán</option>
                <option value="italiano">Italiano</option>
                <option value="portugués">Portugués</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!deckName.trim() || !topic.trim()}
              className="btn-primary w-full"
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