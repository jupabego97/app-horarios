import { format, isToday, differenceInDays, addDays } from 'date-fns';

export class SpacedRepetitionSystem {
  constructor() {
    this.storageKey = 'memorymaster_data';
    this.initializeStorage();
  }

  initializeStorage() {
    const existingData = localStorage.getItem(this.storageKey);
    if (!existingData) {
      const initialData = {
        decks: [],
        studyHistory: [],
        settings: {
          maxNewCards: 20,
          maxReviewCards: 100,
          easyBonus: 1.3,
          intervalModifier: 1.0,
          darkMode: false
        }
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }
  }

  getData() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : null;
  }

  saveData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // Settings management
  updateSettings(newSettings) {
    const data = this.getData();
    data.settings = { ...data.settings, ...newSettings };
    this.saveData(data);
    return data.settings;
  }

  getSettings() {
    const data = this.getData();
    return data.settings || {};
  }

  // Deck management
  createDeck(name, description = '') {
    const data = this.getData();
    const newDeck = {
      id: Date.now().toString(),
      name,
      description,
      cards: [],
      createdAt: new Date().toISOString(),
      settings: {
        newCardsPerDay: 20,
        maxReviews: 100
      }
    };
    data.decks.push(newDeck);
    this.saveData(data);
    return newDeck;
  }

  getAllDecks() {
    const data = this.getData();
    return data.decks || [];
  }

  getDeck(deckId) {
    const data = this.getData();
    return data.decks.find(deck => deck.id === deckId);
  }

  updateDeck(deckId, updates) {
    const data = this.getData();
    const deckIndex = data.decks.findIndex(deck => deck.id === deckId);
    if (deckIndex !== -1) {
      data.decks[deckIndex] = { ...data.decks[deckIndex], ...updates };
      this.saveData(data);
      return data.decks[deckIndex];
    }
    return null;
  }

  deleteDeck(deckId) {
    const data = this.getData();
    data.decks = data.decks.filter(deck => deck.id !== deckId);
    this.saveData(data);
  }

  // Card management with image support
  createCard(deckId, front, back, tags = [], frontImage = null, backImage = null) {
    const data = this.getData();
    const deck = data.decks.find(d => d.id === deckId);
    if (!deck) return null;

    const newCard = {
      id: Date.now().toString(),
      front,
      back,
      frontImage, // base64 encoded image
      backImage,  // base64 encoded image
      tags,
      createdAt: new Date().toISOString(),
      // Spaced repetition data
      interval: 1,
      repetition: 0,
      easiness: 2.5,
      dueDate: new Date().toISOString(),
      lastReviewed: null,
      isNew: true,
      // Study statistics
      totalReviews: 0,
      correctAnswers: 0,
      avgResponseTime: 0
    };

    deck.cards.push(newCard);
    this.saveData(data);
    return newCard;
  }

  updateCard(deckId, cardId, updates) {
    const data = this.getData();
    const deck = data.decks.find(d => d.id === deckId);
    if (!deck) return null;

    const cardIndex = deck.cards.findIndex(card => card.id === cardId);
    if (cardIndex !== -1) {
      deck.cards[cardIndex] = { ...deck.cards[cardIndex], ...updates };
      this.saveData(data);
      return deck.cards[cardIndex];
    }
    return null;
  }

  deleteCard(deckId, cardId) {
    const data = this.getData();
    const deck = data.decks.find(d => d.id === deckId);
    if (!deck) return false;

    deck.cards = deck.cards.filter(card => card.id !== cardId);
    this.saveData(data);
    return true;
  }

  // Image handling utilities
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  isValidImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  // SM-2 Algorithm implementation
  calculateNextReview(card, quality) {
    // quality: 0-5 (0: complete blackout, 5: perfect response)
    let { interval, repetition, easiness } = card;

    if (quality >= 3) {
      // Correct answer
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easiness);
      }
      repetition += 1;
    } else {
      // Incorrect answer
      repetition = 0;
      interval = 1;
    }

    // Update easiness factor
    easiness = Math.max(1.3, easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    const dueDate = addDays(new Date(), interval);

    return {
      interval,
      repetition,
      easiness: Number(easiness.toFixed(2)),
      dueDate: dueDate.toISOString(),
      lastReviewed: new Date().toISOString(),
      isNew: false
    };
  }

  reviewCard(deckId, cardId, quality, responseTime = 0) {
    const data = this.getData();
    const deck = data.decks.find(d => d.id === deckId);
    if (!deck) return null;

    const card = deck.cards.find(c => c.id === cardId);
    if (!card) return null;

    // Calculate next review using SM-2
    const nextReview = this.calculateNextReview(card, quality);
    
    // Update card statistics
    const updatedCard = {
      ...card,
      ...nextReview,
      totalReviews: card.totalReviews + 1,
      correctAnswers: card.correctAnswers + (quality >= 3 ? 1 : 0),
      avgResponseTime: card.totalReviews === 0 
        ? responseTime 
        : (card.avgResponseTime * card.totalReviews + responseTime) / (card.totalReviews + 1)
    };

    // Update card in deck
    const cardIndex = deck.cards.findIndex(c => c.id === cardId);
    deck.cards[cardIndex] = updatedCard;

    // Record study session
    data.studyHistory.push({
      deckId,
      cardId,
      quality,
      responseTime,
      date: new Date().toISOString(),
      wasCorrect: quality >= 3
    });

    this.saveData(data);
    return updatedCard;
  }

  // Get cards that are due for review
  getDueCards(deckId) {
    const deck = this.getDeck(deckId);
    if (!deck) return [];

    const now = new Date();
    return deck.cards.filter(card => {
      const dueDate = new Date(card.dueDate);
      return dueDate <= now;
    });
  }

  // Get new cards (not yet studied)
  getNewCards(deckId, limit = 20) {
    const deck = this.getDeck(deckId);
    if (!deck) return [];

    return deck.cards
      .filter(card => card.isNew)
      .slice(0, limit);
  }

  // Get cards for study session
  getStudyCards(deckId) {
    const dueCards = this.getDueCards(deckId);
    const newCards = this.getNewCards(deckId, 10);
    
    // Shuffle arrays for better distribution
    const shuffled = [...dueCards, ...newCards]
      .sort(() => Math.random() - 0.5);
    
    return shuffled.slice(0, 50); // Limit to 50 cards per session
  }

  // Statistics
  getStudyStreak() {
    const data = this.getData();
    if (!data.studyHistory.length) return 0;

    let streak = 0;
    let currentDate = new Date();
    
    // Check if studied today
    const todayStudied = data.studyHistory.some(session => 
      isToday(new Date(session.date))
    );
    
    if (!todayStudied) return 0;

    // Count consecutive days with study sessions
    for (let i = 0; i < 365; i++) {
      const checkDate = addDays(currentDate, -i);
      const studiedOnDate = data.studyHistory.some(session =>
        format(new Date(session.date), 'yyyy-MM-dd') === format(checkDate, 'yyyy-MM-dd')
      );
      
      if (studiedOnDate) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  getStudiedToday(deckId = null) {
    const data = this.getData();
    const today = format(new Date(), 'yyyy-MM-dd');
    
    return data.studyHistory.filter(session => {
      const sessionDate = format(new Date(session.date), 'yyyy-MM-dd');
      const matchesDate = sessionDate === today;
      const matchesDeck = deckId ? session.deckId === deckId : true;
      return matchesDate && matchesDeck;
    }).length;
  }

  getDeckStatistics(deckId) {
    const deck = this.getDeck(deckId);
    if (!deck) return null;

    const data = this.getData();
    const deckHistory = data.studyHistory.filter(session => session.deckId === deckId);

    const totalCards = deck.cards.length;
    const newCards = deck.cards.filter(card => card.isNew).length;
    const dueCards = this.getDueCards(deckId).length;
    const masteredCards = deck.cards.filter(card => 
      !card.isNew && card.repetition >= 3 && card.easiness >= 2.5
    ).length;

    const totalReviews = deckHistory.length;
    const correctReviews = deckHistory.filter(session => session.wasCorrect).length;
    const accuracy = totalReviews > 0 ? (correctReviews / totalReviews * 100).toFixed(1) : 0;

    const avgResponseTime = deckHistory.length > 0
      ? deckHistory.reduce((sum, session) => sum + session.responseTime, 0) / deckHistory.length
      : 0;

    return {
      totalCards,
      newCards,
      dueCards,
      masteredCards,
      totalReviews,
      accuracy: Number(accuracy),
      avgResponseTime: Math.round(avgResponseTime)
    };
  }

  // Sample data for demonstration
  createSampleData() {
    const spanishDeck = this.createDeck(
      'Español Básico',
      'Vocabulario fundamental del español'
    );

    const sampleCards = [
      { front: 'Hello', back: 'Hola' },
      { front: 'Goodbye', back: 'Adiós' },
      { front: 'Please', back: 'Por favor' },
      { front: 'Thank you', back: 'Gracias' },
      { front: 'Yes', back: 'Sí' },
      { front: 'No', back: 'No' },
      { front: 'Water', back: 'Agua' },
      { front: 'Food', back: 'Comida' },
      { front: 'House', back: 'Casa' },
      { front: 'Family', back: 'Familia' },
      { front: 'Friend', back: 'Amigo/Amiga' },
      { front: 'School', back: 'Escuela' },
      { front: 'Work', back: 'Trabajo' },
      { front: 'Time', back: 'Tiempo' },
      { front: 'Day', back: 'Día' },
      { front: 'Night', back: 'Noche' },
      { front: 'Good morning', back: 'Buenos días' },
      { front: 'Good night', back: 'Buenas noches' },
      { front: 'How are you?', back: '¿Cómo estás?' },
      { front: 'I love you', back: 'Te amo' }
    ];

    sampleCards.forEach(card => {
      this.createCard(spanishDeck.id, card.front, card.back, ['básico']);
    });

    const mathDeck = this.createDeck(
      'Matemáticas',
      'Fórmulas y conceptos matemáticos'
    );

    const mathCards = [
      { front: '¿Cuál es la fórmula del área de un círculo?', back: 'A = πr²' },
      { front: '¿Cuál es el teorema de Pitágoras?', back: 'a² + b² = c²' },
      { front: '¿Cuánto es 15 × 7?', back: '105' },
      { front: '¿Cuál es la derivada de x²?', back: '2x' },
      { front: '¿Cuánto es √144?', back: '12' }
    ];

    mathCards.forEach(card => {
      this.createCard(mathDeck.id, card.front, card.back, ['matemáticas', 'fórmulas']);
    });

    return { spanishDeck, mathDeck };
  }
} 