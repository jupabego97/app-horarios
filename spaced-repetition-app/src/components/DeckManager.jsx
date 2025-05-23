import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit3, Trash2, BookOpen, Eye, Save, X, Tag, Image, Upload, Bot, Sparkles, Cloud, CloudOff, Loader } from 'lucide-react';
import { SpacedRepetitionSystem } from '../utils/spacedRepetition';
import { useDarkMode } from '../hooks/useDarkMode';
import firebaseService from '../services/firebaseService';
import AIGeneratorModal from './AIGeneratorModal';

function DeckManager({ user }) {
  const navigate = useNavigate();
  const { darkMode } = useDarkMode();
  const [srs] = useState(() => new SpacedRepetitionSystem());
  const [decks, setDecks] = useState([]);
  const [deckCardCounts, setDeckCardCounts] = useState({}); // Estado para contar tarjetas por mazo
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [selectedDeckCards, setSelectedDeckCards] = useState([]);
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error

  // Form states
  const [deckForm, setDeckForm] = useState({ name: '', description: '' });
  const [cardForm, setCardForm] = useState({ 
    front: '', 
    back: '', 
    tags: '',
    frontImage: null,
    backImage: null
  });

  // Cargar mazos al montar el componente
  useEffect(() => {
    loadDecks();
  }, [user]);

  // Función para cargar el conteo de tarjetas para un mazo específico
  const loadDeckCardCount = async (deckId) => {
    try {
      if (user) {
        const cards = await firebaseService.getCards(deckId);
        return cards.length;
      } else {
        const deck = srs.getDeck(deckId);
        return deck ? deck.cards.length : 0;
      }
    } catch (error) {
      console.error('Error cargando conteo de tarjetas para mazo', deckId, ':', error);
      return 0;
    }
  };

  // Función para cargar conteos de tarjetas para todos los mazos
  const loadAllCardCounts = async (decksList) => {
    try {
      const counts = {};
      
      // Cargar conteos para todos los mazos en paralelo
      const countPromises = decksList.map(async (deck) => {
        const count = await loadDeckCardCount(deck.id);
        return { deckId: deck.id, count };
      });
      
      const results = await Promise.all(countPromises);
      
      // Crear objeto con los conteos
      results.forEach(({ deckId, count }) => {
        counts[deckId] = count;
      });
      
      setDeckCardCounts(counts);
      console.log('DeckManager: Conteos de tarjetas cargados:', counts);
      
    } catch (error) {
      console.error('Error cargando conteos de tarjetas:', error);
    }
  };

  // Función para cargar mazos (Firebase o localStorage)
  const loadDecks = async () => {
    setLoading(true);
    try {
      console.log('DeckManager: Cargando mazos para usuario:', user ? 'autenticado' : 'no autenticado');
      
      if (user) {
        // Cargar desde Firebase
        console.log('DeckManager: Cargando desde Firebase...');
        const firebaseDecks = await firebaseService.getDecks();
        console.log('DeckManager: Mazos de Firebase cargados:', firebaseDecks.length);
        setDecks(firebaseDecks);
        
        // Cargar conteos de tarjetas
        await loadAllCardCounts(firebaseDecks);
      } else {
        // Cargar desde localStorage
        console.log('DeckManager: Cargando desde localStorage...');
        let localDecks = srs.getAllDecks();
        // Crear datos de ejemplo si no hay mazos y el usuario no está autenticado
        if (localDecks.length === 0 && !user) {
          srs.createSampleData();
          localDecks = srs.getAllDecks(); // Recargar después de crear datos de ejemplo
        }
        setDecks(localDecks);
        // Para usuarios no autenticados, los conteos se pueden derivar directamente o mediante loadAllCardCounts
        await loadAllCardCounts(localDecks); 
      }
    } catch (error) {
      console.error('Error cargando mazos:', error);
      // Si hay un error y el usuario está autenticado, no hacer fallback a localStorage.
      // Mostrar estado vacío o mensaje de error.
      if (user) {
        setDecks([]);
        setDeckCardCounts({});
      }
      // Para usuarios no autenticados, el error podría ser de srs, ya se manejaría localmente.
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar tarjetas de un mazo
  const loadDeckCards = async (deckId) => {
    try {
      if (user) {
        const cards = await firebaseService.getCards(deckId);
        const cards = await firebaseService.getCards(deckId);
        return cards;
      } else {
        const deck = srs.getDeck(deckId);
        return deck ? deck.cards : [];
      }
    } catch (error) {
      console.error('Error cargando tarjetas para el mazo', deckId, ':', error);
      // Si es un usuario autenticado y falla la carga de Firebase, no hacer fallback.
      // Simplemente devolver un array vacío o manejar el error de otra forma.
      return [];
    }
  };

  // Seleccionar mazo y cargar sus tarjetas
  const selectDeck = async (deck) => {
    setSelectedDeck(deck);
    const cards = await loadDeckCards(deck.id);
    setSelectedDeckCards(cards);
  };

  // Función de sincronización con indicador visual
  const syncWithIndicator = async (operation) => {
    if (!user) return operation();
    
    setSyncStatus('syncing');
    try {
      const result = await operation();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
      return result;
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
      throw error;
    }
  };

  // AI Generation handler
  const handleAIGeneration = async (generatedData) => {
    try {
      await syncWithIndicator(async () => {
        if (user) {
          // Crear en Firebase
          const deckData = {
            name: generatedData.deckName,
            description: `Generado con IA sobre "${generatedData.topic}" (${generatedData.difficulty} - ${generatedData.language})`,
            tags: ['generado-ia', generatedData.difficulty, generatedData.topic]
          };
          
          const newDeck = await firebaseService.createDeck(deckData);
          
          // Crear las tarjetas
          for (const card of generatedData.cards) {
            await firebaseService.createCard({
              deckId: newDeck.id,
              front: card.front,
              back: card.back,
              tags: Array.isArray(card.tags) ? [...card.tags, 'generado-ia', generatedData.difficulty] : ['generado-ia', generatedData.difficulty]
            });
          }
        } else { // User is not authenticated
          const newDeckData = {
            name: generatedData.deckName,
            description: `Generado con IA sobre "${generatedData.topic}" (${generatedData.difficulty} - ${generatedData.language})`,
            tags: ['generado-ia', generatedData.difficulty, generatedData.topic]
          };
          const newDeck = srs.createDeck(newDeckData.name, newDeckData.description, newDeckData.tags);

          generatedData.cards.forEach(card => {
            srs.createCard(
              newDeck.id,
              card.front,
              card.back,
              Array.isArray(card.tags) ? [...card.tags, 'generado-ia', generatedData.difficulty] : ['generado-ia', generatedData.difficulty]
            );
          });
        }
      });

      // Recargar mazos y conteos
      await loadDecks(); // Esto ya debería recargar los conteos también.
      alert(`¡Mazo "${generatedData.deckName}" creado exitosamente con ${generatedData.cards.length} tarjetas!`);
      
    } catch (error) {
      console.error('Error creando mazo con IA:', error);
      // El syncIndicator ya maneja el estado de error visualmente.
      alert('Error al crear el mazo. Intenta nuevamente.');
    }
  };

  // Manejar subida de imágenes
  const handleImageUpload = async (file, side) => {
    if (!srs.isValidImageFile(file)) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, GIF, WebP) menor a 5MB');
      return;
    }

    try {
      const base64 = await srs.fileToBase64(file);
      setCardForm(prev => ({
        ...prev,
        [side === 'front' ? 'frontImage' : 'backImage']: base64
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al cargar la imagen');
    }
  };

  const removeImage = (side) => {
    setCardForm(prev => ({
      ...prev,
      [side === 'front' ? 'frontImage' : 'backImage']: null
    }));
  };

  // Crear mazo
  const handleCreateDeck = async (e) => {
    e.preventDefault();
    if (!deckForm.name.trim()) return;

    try {
      await syncWithIndicator(async () => {
        if (user) {
          await firebaseService.createDeck({
            name: deckForm.name,
            description: deckForm.description,
            tags: []
          });
        } else {
          srs.createDeck(deckForm.name, deckForm.description);
        }
      });

      await loadDecks();
      setDeckForm({ name: '', description: '' });
      setShowCreateDeck(false);
    } catch (error) {
      console.error('Error creando mazo:', error);
      alert('Error al crear el mazo');
    }
  };

  // Eliminar mazo - versión mejorada con debugging
  const handleDeleteDeck = async (deckId) => {
    if (!window.confirm('¿Estás seguro de eliminar este mazo? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      console.log('Eliminando mazo:', deckId, 'Usuario autenticado:', !!user);
      
      if (user) {
        // Usuario autenticado - usar Firebase
        setSyncStatus('syncing');
        await firebaseService.deleteDeck(deckId);
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else {
        // Usuario no autenticado - usar localStorage
        srs.deleteDeck(deckId);
      }

      // Recargar mazos
      await loadDecks();
      
      // Limpiar selección si el mazo eliminado estaba seleccionado
      if (selectedDeck && selectedDeck.id === deckId) {
        setSelectedDeck(null);
        setSelectedDeckCards([]);
      }
      
      console.log('Mazo eliminado exitosamente');
      
    } catch (error) {
      console.error('Error eliminando mazo:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
      alert('Error al eliminar el mazo: ' + error.message);
    }
  };

  // Crear tarjeta
  const handleCreateCard = async (e) => {
    e.preventDefault();
    if (!cardForm.front.trim() || !cardForm.back.trim()) return;

    const tags = cardForm.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      await syncWithIndicator(async () => {
        if (user) {
          await firebaseService.createCard({
            deckId: selectedDeck.id,
            front: cardForm.front,
            back: cardForm.back,
            tags,
            frontImage: cardForm.frontImage,
            backImage: cardForm.backImage
          });
        } else {
          srs.createCard(
            selectedDeck.id, 
            cardForm.front, 
            cardForm.back, 
            tags,
            cardForm.frontImage,
            cardForm.backImage
          );
        }
      });

      // Recargar tarjetas del mazo actual
      const updatedCards = await loadDeckCards(selectedDeck.id);
      setSelectedDeckCards(updatedCards);
      
      setCardForm({ front: '', back: '', tags: '', frontImage: null, backImage: null });
      setShowCreateCard(false);
    } catch (error) {
      console.error('Error creando tarjeta:', error);
      alert('Error al crear la tarjeta');
    }
  };

  // Actualizar tarjeta
  const handleUpdateCard = async (e) => {
    e.preventDefault();
    if (!cardForm.front.trim() || !cardForm.back.trim()) return;

    const tags = cardForm.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      await syncWithIndicator(async () => {
        if (user) {
          await firebaseService.updateCard(editingCard.id, {
            front: cardForm.front,
            back: cardForm.back,
            tags,
            frontImage: cardForm.frontImage,
            backImage: cardForm.backImage
          });
        } else {
          srs.updateCard(selectedDeck.id, editingCard.id, {
            front: cardForm.front,
            back: cardForm.back,
            tags,
            frontImage: cardForm.frontImage,
            backImage: cardForm.backImage
          });
        }
      });

      // Recargar tarjetas del mazo actual
      const updatedCards = await loadDeckCards(selectedDeck.id);
      setSelectedDeckCards(updatedCards);
      
      setEditingCard(null);
      setCardForm({ front: '', back: '', tags: '', frontImage: null, backImage: null });
    } catch (error) {
      console.error('Error actualizando tarjeta:', error);
      alert('Error al actualizar la tarjeta');
    }
  };

  // Eliminar tarjeta
  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta tarjeta?')) return;

    try {
      await syncWithIndicator(async () => {
        if (user) {
          await firebaseService.deleteCard(cardId);
        } else {
          srs.deleteCard(selectedDeck.id, cardId);
        }
      });

      // Recargar tarjetas del mazo actual
      const updatedCards = await loadDeckCards(selectedDeck.id);
      setSelectedDeckCards(updatedCards);
    } catch (error) {
      console.error('Error eliminando tarjeta:', error);
      alert('Error al eliminar la tarjeta');
    }
  };

  const startEditCard = (card) => {
    setEditingCard(card);
    setCardForm({
      front: card.front,
      back: card.back,
      tags: card.tags.join(', '),
      frontImage: card.frontImage || null,
      backImage: card.backImage || null
    });
  };

  const cancelEdit = () => {
    setEditingCard(null);
    setCardForm({ front: '', back: '', tags: '', frontImage: null, backImage: null });
  };

  // Componente de sincronización
  const SyncIndicator = () => {
    if (!user) return null;

    const getIcon = () => {
      switch (syncStatus) {
        case 'syncing':
          return <Loader className="w-4 h-4 animate-spin" />;
        case 'success':
          return <Cloud className="w-4 h-4" />;
        case 'error':
          return <CloudOff className="w-4 h-4" />;
        default:
          return <Cloud className="w-4 h-4" />;
      }
    };

    const getMessage = () => {
      switch (syncStatus) {
        case 'syncing':
          return 'Sincronizando...';
        case 'success':
          return 'Sincronizado';
        case 'error':
          return 'Error de sync';
        default:
          return 'Conectado';
      }
    };

    const getColor = () => {
      switch (syncStatus) {
        case 'syncing':
          return 'text-blue-600 dark:text-blue-400';
        case 'success':
          return 'text-green-600 dark:text-green-400';
        case 'error':
          return 'text-red-600 dark:text-red-400';
        default:
          return 'text-gray-600 dark:text-gray-400';
      }
    };

    return (
      <div className={`flex items-center space-x-1 text-sm ${getColor()}`}>
        {getIcon()}
        <span>{getMessage()}</span>
      </div>
    );
  };

  // Componente de subida de imágenes
  const ImageUpload = ({ side, currentImage, onUpload, onRemove }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Imagen para {side === 'front' ? 'Pregunta' : 'Respuesta'} (opcional)
      </label>
      
      {currentImage ? (
        <div className="image-preview relative">
          <img 
            src={currentImage} 
            alt={`${side} preview`} 
            className="max-w-full h-32 object-cover rounded-lg border"
          />
          <button
            type="button"
            onClick={() => onRemove(side)}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files[0]) {
                onUpload(e.target.files[0], side);
              }
            }}
            className="hidden"
            id={`image-${side}`}
          />
          <label
            htmlFor={`image-${side}`}
            className="cursor-pointer flex flex-col items-center space-y-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <Upload className="w-8 h-8" />
            <span className="text-sm">Subir imagen</span>
          </label>
        </div>
      )}
    </div>
  );

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Volver</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gestión de Mazos
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <SyncIndicator />
              
              <button
                onClick={() => setShowAIGenerator(true)}
                className="btn-secondary flex items-center space-x-2"
              >
                <Bot className="w-5 h-5" />
                <span>Generar con IA</span>
              </button>
              
              <button
                onClick={() => setShowCreateDeck(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Nuevo Mazo</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedDeck ? (
          // Vista de lista de mazos
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {decks.map(deck => (
                <div
                  key={deck.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => selectDeck(deck)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {deck.name}
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDeck(deck.id);
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                    {deck.description || 'Sin descripción'}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <BookOpen className="w-4 h-4" />
                      <span>{deckCardCounts[deck.id] || 0} tarjetas</span>
                    </div>
                    
                    {deck.tags?.includes('generado-ia') && (
                      <div className="flex items-center space-x-1 bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300 px-2 py-1 rounded-full text-xs">
                        <Bot className="w-3 h-3" />
                        <span>IA</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {decks.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No hay mazos
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Crea tu primer mazo para comenzar a estudiar
                  </p>
                  <button
                    onClick={() => setShowCreateDeck(true)}
                    className="btn-primary"
                  >
                    Crear primer mazo
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Vista detalle del mazo seleccionado
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <button
                  onClick={() => setSelectedDeck(null)}
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a mazos</span>
                </button>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {selectedDeck.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedDeckCards.length} tarjetas
                </p>
              </div>
              
              <button
                onClick={() => setShowCreateCard(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Nueva Tarjeta</span>
              </button>
            </div>

            {/* Lista de tarjetas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedDeckCards.map(card => (
                <div
                  key={card.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Pregunta
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => startEditCard(card)}
                        className="text-blue-500 hover:text-blue-700 p-1"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="text-gray-900 dark:text-white text-sm">
                      {card.front}
                    </div>
                    {card.frontImage && (
                      <img 
                        src={card.frontImage} 
                        alt="Front" 
                        className="w-full h-20 object-cover rounded"
                      />
                    )}
                    
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Respuesta
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-sm">
                        {card.back}
                      </div>
                      {card.backImage && (
                        <img 
                          src={card.backImage} 
                          alt="Back" 
                          className="w-full h-20 object-cover rounded mt-2"
                        />
                      )}
                    </div>
                    
                    {card.tags && card.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {card.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {selectedDeckCards.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No hay tarjetas
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Añade la primera tarjeta a este mazo
                  </p>
                  <button
                    onClick={() => setShowCreateCard(true)}
                    className="btn-primary"
                  >
                    Crear primera tarjeta
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear Mazo */}
      {showCreateDeck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Crear Nuevo Mazo
            </h3>
            
            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del mazo
                </label>
                <input
                  type="text"
                  value={deckForm.name}
                  onChange={(e) => setDeckForm(prev => ({...prev, name: e.target.value}))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ej: Vocabulario en Inglés"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  value={deckForm.description}
                  onChange={(e) => setDeckForm(prev => ({...prev, description: e.target.value}))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Describe el contenido del mazo..."
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateDeck(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Crear Mazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar Tarjeta */}
      {(showCreateCard || editingCard) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingCard ? 'Editar Tarjeta' : 'Crear Nueva Tarjeta'}
            </h3>
            
            <form onSubmit={editingCard ? handleUpdateCard : handleCreateCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pregunta (frente)
                </label>
                <textarea
                  value={cardForm.front}
                  onChange={(e) => setCardForm(prev => ({...prev, front: e.target.value}))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="¿Cuál es la pregunta?"
                  required
                />
              </div>

              <ImageUpload
                side="front"
                currentImage={cardForm.frontImage}
                onUpload={handleImageUpload}
                onRemove={removeImage}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Respuesta (reverso)
                </label>
                <textarea
                  value={cardForm.back}
                  onChange={(e) => setCardForm(prev => ({...prev, back: e.target.value}))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="¿Cuál es la respuesta?"
                  required
                />
              </div>

              <ImageUpload
                side="back"
                currentImage={cardForm.backImage}
                onUpload={handleImageUpload}
                onRemove={removeImage}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Etiquetas (separadas por comas)
                </label>
                <input
                  type="text"
                  value={cardForm.tags}
                  onChange={(e) => setCardForm(prev => ({...prev, tags: e.target.value}))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="vocabulario, básico, importante"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateCard(false);
                    cancelEdit();
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  {editingCard ? 'Actualizar' : 'Crear'} Tarjeta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal AI Generator */}
      <AIGeneratorModal
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onGenerate={handleAIGeneration}
      />
    </div>
  );
}

export default DeckManager; 