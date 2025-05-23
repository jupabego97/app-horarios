import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Eye, CheckCircle, XCircle, Clock, BarChart3, Bot } from 'lucide-react';
import { SpacedRepetitionSystem } from '../utils/spacedRepetition';
import { useDarkMode } from '../hooks/useDarkMode';
import firebaseService from '../services/firebaseService';

function StudySession({ user }) {
  const navigate = useNavigate();
  const { darkMode } = useDarkMode();
  const [srs] = useState(() => new SpacedRepetitionSystem());
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [studyCards, setStudyCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    cardsStudied: 0,
    correct: 0,
    startTime: null
  });
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const startTimeRef = useRef(null);

  // Cargar mazos (Firebase o localStorage)
  const loadDecks = async () => {
    setLoading(true);
    try {
      console.log('StudySession: Cargando mazos para usuario:', user ? 'autenticado' : 'no autenticado');
      
      if (user) {
        // Cargar desde Firebase
        console.log('StudySession: Cargando desde Firebase...');
        const firebaseDecks = await firebaseService.getDecks();
        console.log('StudySession: Mazos de Firebase cargados:', firebaseDecks.length);
        setDecks(firebaseDecks);
      } else {
        // Cargar desde localStorage
        console.log('StudySession: Cargando desde localStorage...');
        const localDecks = srs.getAllDecks();
        setDecks(localDecks);
        
        // Crear datos de ejemplo si no hay mazos
        if (localDecks.length === 0) {
          srs.createSampleData();
          setDecks(srs.getAllDecks());
        }
      }
    } catch (error) {
      console.error('StudySession: Error cargando mazos:', error);
      // Fallback a localStorage en caso de error
      if (user) {
        const localDecks = srs.getAllDecks();
        setDecks(localDecks);
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar tarjetas de estudio para un mazo
  const loadStudyCards = async (deckId) => {
    try {
      if (user) {
        // Firebase: cargar tarjetas y aplicar algoritmo de repetición espaciada
        const cards = await firebaseService.getCards(deckId);
        // Aplicar lógica de repetición espaciada (filtrar tarjetas que necesitan repaso)
        const now = new Date();
        const studyCards = cards.filter(card => {
          if (!card.nextReview) return true; // Tarjeta nueva
          return new Date(card.nextReview.toDate()) <= now; // Tarjeta que necesita repaso
        });
        return studyCards.slice(0, 10); // Limitar a 10 tarjetas como máximo
      } else {
        // localStorage: usar el método existente
        return srs.getStudyCards(deckId);
      }
    } catch (error) {
      console.error('StudySession: Error cargando tarjetas de estudio:', error);
      return [];
    }
  };

  useEffect(() => {
    loadDecks();
  }, [user]);

  useEffect(() => {
    if (selectedDeck) {
      const loadCards = async () => {
        const cards = await loadStudyCards(selectedDeck.id);
        setStudyCards(cards);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setShowAnswer(false);
        setSessionStats({
          cardsStudied: 0,
          correct: 0,
          startTime: new Date()
        });
        setIsComplete(false);
        startTimeRef.current = new Date();
      };
      
      loadCards();
    }
  }, [selectedDeck, user]);

  const handleDeckSelect = (deck) => {
    setSelectedDeck(deck);
  };

  const handleCardFlip = () => {
    setIsFlipped(!isFlipped);
    setShowAnswer(!showAnswer);
  };

  const handleAnswer = async (quality) => {
    if (!showAnswer) return;

    const responseTime = new Date() - startTimeRef.current;
    const currentCard = studyCards[currentCardIndex];
    
    try {
      if (user) {
        // Firebase: actualizar estadísticas de la tarjeta
        const easinessFactor = currentCard.easinessFactor || 2.5;
        const interval = currentCard.interval || 0;
        const repetitions = currentCard.repetitions || 0;
        
        // Calcular próxima revisión usando algoritmo SM-2
        let newEasinessFactor = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (newEasinessFactor < 1.3) newEasinessFactor = 1.3;
        
        let newInterval;
        let newRepetitions;
        
        if (quality < 3) {
          newRepetitions = 0;
          newInterval = 1;
        } else {
          newRepetitions = repetitions + 1;
          if (newRepetitions === 1) {
            newInterval = 1;
          } else if (newRepetitions === 2) {
            newInterval = 6;
          } else {
            newInterval = Math.round(interval * newEasinessFactor);
          }
        }
        
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + newInterval);
        
        // Actualizar en Firebase
        await firebaseService.updateStudyStats(currentCard.id, {
          easinessFactor: newEasinessFactor,
          interval: newInterval,
          repetitions: newRepetitions
        }, nextReview);
        
        console.log('StudySession: Estadísticas actualizadas en Firebase para tarjeta', currentCard.id);
        
      } else {
        // localStorage: usar método existente
        srs.reviewCard(selectedDeck.id, currentCard.id, quality, responseTime);
      }
    } catch (error) {
      console.error('StudySession: Error actualizando estadísticas:', error);
    }
    
    setSessionStats(prev => ({
      ...prev,
      cardsStudied: prev.cardsStudied + 1,
      correct: prev.correct + (quality >= 3 ? 1 : 0)
    }));

    if (currentCardIndex + 1 < studyCards.length) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
      setShowAnswer(false);
      startTimeRef.current = new Date();
    } else {
      setIsComplete(true);
    }
  };

  const resetSession = async () => {
    const cards = await loadStudyCards(selectedDeck.id);
    setStudyCards(cards);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowAnswer(false);
    setSessionStats({
      cardsStudied: 0,
      correct: 0,
      startTime: new Date()
    });
    setIsComplete(false);
    startTimeRef.current = new Date();
  };

  const getQualityText = (quality) => {
    const qualityMap = {
      0: { text: 'No recordé nada', color: 'text-red-600', bg: 'bg-red-100' },
      1: { text: 'Mal', color: 'text-red-500', bg: 'bg-red-50' },
      2: { text: 'Regular', color: 'text-orange-500', bg: 'bg-orange-50' },
      3: { text: 'Bien', color: 'text-yellow-500', bg: 'bg-yellow-50' },
      4: { text: 'Fácil', color: 'text-green-500', bg: 'bg-green-50' },
      5: { text: 'Muy fácil', color: 'text-green-600', bg: 'bg-green-100' }
    };
    return qualityMap[quality] || qualityMap[3];
  };

  if (isComplete) {
    const accuracy = sessionStats.cardsStudied > 0 
      ? (sessionStats.correct / sessionStats.cardsStudied * 100).toFixed(1)
      : 0;
    const studyTime = sessionStats.startTime 
      ? Math.round((new Date() - sessionStats.startTime) / 1000 / 60)
      : 0;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="bg-gradient-to-r from-green-400 to-blue-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Sesión Completada!</h2>
          
          <div className="space-y-4 mb-8">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">Tarjetas estudiadas</p>
              <p className="text-2xl font-bold text-gray-900">{sessionStats.cardsStudied}</p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">Precisión</p>
              <p className="text-2xl font-bold text-green-600">{accuracy}%</p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">Tiempo de estudio</p>
              <p className="text-2xl font-bold text-blue-600">{studyTime} min</p>
            </div>
          </div>
          
          <div className="flex flex-col space-y-3">
            <button
              onClick={resetSession}
              className="btn-primary w-full"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Estudiar Más
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="btn-secondary w-full"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedDeck) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando mazos...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Seleccionar Mazo</h1>
            <div></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.map(deck => {
              return (
                <div
                  key={deck.id}
                  onClick={() => handleDeckSelect(deck)}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:scale-105 border border-gray-100"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{deck.name}</h3>
                  <p className="text-gray-600 mb-4">{deck.description || 'Sin descripción'}</p>
                  
                  <div className="mt-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center py-3 rounded-lg font-medium">
                    ¡Comenzar a estudiar!
                  </div>
                  
                  {deck.tags?.includes('generado-ia') && (
                    <div className="flex items-center justify-center space-x-1 bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-xs mt-2">
                      <Bot className="w-3 h-3" />
                      <span>Generado con IA</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {decks.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <BarChart3 className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay mazos disponibles</h3>
              <p className="text-gray-600 mb-6">Crea tu primer mazo para comenzar a estudiar</p>
              <button
                onClick={() => navigate('/decks')}
                className="btn-primary"
              >
                Crear Primer Mazo
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (studyCards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-gray-400 mb-4">
            <CheckCircle className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Todo al día!</h2>
          <p className="text-gray-600 mb-6">No hay tarjetas pendientes de repasar en este mazo.</p>
          <button
            onClick={() => setSelectedDeck(null)}
            className="btn-primary w-full"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Elegir Otro Mazo
          </button>
        </div>
      </div>
    );
  }

  const currentCard = studyCards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / studyCards.length) * 100;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setSelectedDeck(null)}
            className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Cambiar Mazo</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">{selectedDeck.name}</h1>
            <p className="text-gray-600">{currentCardIndex + 1} de {studyCards.length}</p>
          </div>
          
          <div className="flex items-center space-x-2 text-gray-600">
            <Clock className="w-5 h-5" />
            <span>{sessionStats.cardsStudied} estudiadas</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-200 rounded-full h-3 mb-8">
          <div 
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Card */}
        <div className="flex justify-center mb-8">
          <div className="w-full max-w-2xl">
            <div className={`card-flip ${isFlipped ? 'flipped' : ''} h-80`}>
              <div className="card-inner">
                <div className="card-front">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Pregunta</h2>
                    {currentCard.frontImage && (
                      <img 
                        src={currentCard.frontImage} 
                        alt="Front" 
                        className="card-image mb-4"
                      />
                    )}
                    <p className="text-xl">{currentCard.front}</p>
                  </div>
                </div>
                <div className="card-back">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Respuesta</h2>
                    {currentCard.backImage && (
                      <img 
                        src={currentCard.backImage} 
                        alt="Back" 
                        className="card-image mb-4"
                      />
                    )}
                    <p className="text-xl">{currentCard.back}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="text-center">
          {!showAnswer ? (
            <button
              onClick={handleCardFlip}
              className="btn-primary text-xl px-8 py-4"
            >
              <Eye className="w-6 h-6 mr-2" />
              Mostrar Respuesta
            </button>
          ) : (
            <div>
              <p className="text-lg text-gray-700 mb-6">¿Qué tan fácil fue recordar la respuesta?</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
                {[0, 1, 2, 3, 4, 5].map(quality => {
                  const qualityInfo = getQualityText(quality);
                  return (
                    <button
                      key={quality}
                      onClick={() => handleAnswer(quality)}
                      className={`p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-all duration-200 transform hover:scale-105 ${qualityInfo.bg}`}
                    >
                      <div className={`font-semibold ${qualityInfo.color}`}>
                        {qualityInfo.text}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {quality < 3 ? 'Repetir pronto' : quality === 3 ? 'Repetir normal' : 'Repetir más tarde'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudySession; 