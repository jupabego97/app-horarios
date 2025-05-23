import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpacedRepetitionSystem } from './spacedRepetition';

// Mock localStorage
let store = {};
const localStorageMock = {
  getItem: vi.fn((key) => store[key] || null),
  setItem: vi.fn((key, value) => {
    store[key] = value.toString();
  }),
  removeItem: vi.fn((key) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
};

global.localStorage = localStorageMock;

describe('SpacedRepetitionSystem', () => {
  let srs;

  beforeEach(() => {
    localStorageMock.clear();
    // Re-initialize store for each test
    store = {}; 
    srs = new SpacedRepetitionSystem();
    // Mock Date.now() for consistent due date calculations
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-01T00:00:00.000Z').getTime());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Deck Management Tests ---
  describe('Deck Management', () => {
    it('should create a new deck', () => {
      const deck = srs.createDeck({ name: 'Test Deck' });
      expect(deck).toHaveProperty('id');
      expect(deck.name).toBe('Test Deck');
      expect(localStorage.setItem).toHaveBeenCalledWith('flashcardDecks', expect.any(String));
      const decks = JSON.parse(store['flashcardDecks']);
      expect(decks.length).toBe(1);
      expect(decks[0].name).toBe('Test Deck');
    });

    it('should get all decks', () => {
      srs.createDeck({ name: 'Deck 1' });
      srs.createDeck({ name: 'Deck 2' });
      const decks = srs.getAllDecks();
      expect(decks.length).toBe(2);
      expect(localStorage.getItem).toHaveBeenCalledWith('flashcardDecks');
    });

    it('should get a specific deck by ID', () => {
      const createdDeck = srs.createDeck({ name: 'Target Deck' });
      const fetchedDeck = srs.getDeck(createdDeck.id);
      expect(fetchedDeck).not.toBeNull();
      expect(fetchedDeck.name).toBe('Target Deck');
    });

    it('should return null if deck ID does not exist', () => {
      const fetchedDeck = srs.getDeck('non-existent-id');
      expect(fetchedDeck).toBeNull();
    });

    it('should update an existing deck', () => {
      const deck = srs.createDeck({ name: 'Old Name' });
      const updatedDeck = srs.updateDeck(deck.id, { name: 'New Name', description: 'Updated Desc' });
      expect(updatedDeck.name).toBe('New Name');
      expect(updatedDeck.description).toBe('Updated Desc');
      const decks = JSON.parse(store['flashcardDecks']);
      expect(decks[0].name).toBe('New Name');
    });

    it('should not throw when updating a non-existent deck (and return null or handle gracefully)', () => {
      const result = srs.updateDeck('non-existent-id', { name: 'New Name' });
      expect(result).toBeNull(); // Assuming it returns null for non-existent deck
    });
    
    it('should delete a deck', () => {
      const deck1 = srs.createDeck({ name: 'Deck 1' });
      const deck2 = srs.createDeck({ name: 'Deck to Delete' });
      srs.deleteDeck(deck2.id);
      const decks = srs.getAllDecks();
      expect(decks.length).toBe(1);
      expect(decks[0].id).toBe(deck1.id);
      expect(srs.getDeck(deck2.id)).toBeNull();
    });

    it('should not fail when deleting a non-existent deck', () => {
      srs.createDeck({ name: 'Deck 1' });
      expect(() => srs.deleteDeck('non-existent-id')).not.toThrow();
      const decks = srs.getAllDecks();
      expect(decks.length).toBe(1);
    });
  });

  // --- Card Management Tests ---
  describe('Card Management', () => {
    let deckId;
    beforeEach(() => {
      const deck = srs.createDeck({ name: 'Card Test Deck' });
      deckId = deck.id;
    });

    it('should create a new card in a deck', () => {
      const card = srs.createCard(deckId, { front: 'Question', back: 'Answer' });
      expect(card).toHaveProperty('id');
      expect(card.front).toBe('Question');
      expect(card.isNew).toBe(true);
      const decks = JSON.parse(store['flashcardDecks']);
      const targetDeck = decks.find(d => d.id === deckId);
      expect(targetDeck.cards.length).toBe(1);
      expect(targetDeck.cards[0].front).toBe('Question');
    });
    
    it('should return null when creating a card in a non-existent deck', () => {
      const card = srs.createCard('non-existent-deck-id', { front: 'Q', back: 'A' });
      expect(card).toBeNull();
    });

    it('should update an existing card', () => {
      const card = srs.createCard(deckId, { front: 'Old Front', back: 'Old Back' });
      const updatedCard = srs.updateCard(deckId, card.id, { front: 'New Front', back: 'New Back', tags: ['updated'] });
      expect(updatedCard.front).toBe('New Front');
      expect(updatedCard.tags).toEqual(['updated']);
      const decks = JSON.parse(store['flashcardDecks']);
      const targetDeck = decks.find(d => d.id === deckId);
      expect(targetDeck.cards[0].front).toBe('New Front');
    });

    it('should return null when updating a card in a non-existent deck', () => {
       const updatedCard = srs.updateCard('non-existent-deck-id', 'card-id', { front: 'New Front' });
       expect(updatedCard).toBeNull();
    });

    it('should return null when updating a non-existent card', () => {
      const updatedCard = srs.updateCard(deckId, 'non-existent-card-id', { front: 'New Front' });
      expect(updatedCard).toBeNull();
    });

    it('should delete a card from a deck', () => {
      const card1 = srs.createCard(deckId, { front: 'Card 1' });
      const card2 = srs.createCard(deckId, { front: 'Card to Delete' });
      srs.deleteCard(deckId, card2.id);
      const targetDeck = srs.getDeck(deckId);
      expect(targetDeck.cards.length).toBe(1);
      expect(targetDeck.cards[0].id).toBe(card1.id);
    });
    
    it('should not fail when deleting a card from a non-existent deck', () => {
      expect(() => srs.deleteCard('non-existent-deck-id', 'card-id')).not.toThrow();
    });

    it('should not fail when deleting a non-existent card from an existing deck', () => {
      expect(() => srs.deleteCard(deckId, 'non-existent-card-id')).not.toThrow();
      const targetDeck = srs.getDeck(deckId);
      expect(targetDeck.cards.length).toBe(0); // Assuming no cards were added other than in tests
    });
  });

  // --- SM-2 Algorithm (calculateNextReview) Tests ---
  describe('SM-2 Algorithm (calculateNextReview)', () => {
    const baseCard = {
      id: 'card1',
      front: 'Q',
      back: 'A',
      easiness: 2.5,
      interval: 0,
      repetitions: 0,
      dueDate: null,
      isNew: true
    };
    const today = new Date('2024-01-01T00:00:00.000Z');

    it.each([0, 1, 2])('should reset interval and repetitions for quality %i (<=2)', (quality) => {
      const card = { ...baseCard, repetitions: 5, interval: 10, easiness: 2.0 }; // Existing card
      const result = srs.calculateNextReview(card, quality, today);
      expect(result.interval).toBe(1); // Interval reset to 1 day
      expect(result.repetitions).toBe(0); // Repetitions reset
      expect(result.easiness).toBeLessThan(2.0); // Easiness should decrease
      const expectedDueDate = new Date(today);
      expectedDueDate.setDate(today.getDate() + 1);
      expect(result.dueDate.toISOString().split('T')[0]).toBe(expectedDueDate.toISOString().split('T')[0]);
    });
    
    it('quality < 2 should decrease easiness, min 1.3', () => {
      let card = { ...baseCard, easiness: 1.3 };
      card = srs.calculateNextReview(card, 1, today); // quality 1
      expect(card.easiness).toBe(1.3); // Min easiness is 1.3
      
      card = { ...baseCard, easiness: 1.5 };
      card = srs.calculateNextReview(card, 0, today); // quality 0
      expect(card.easiness).toBe(1.3); // Min easiness is 1.3
    });

    describe('Quality >= 3', () => {
      it('for a new card (repetition 0), quality 4', () => {
        const card = { ...baseCard }; // isNew = true, repetitions = 0
        const result = srs.calculateNextReview(card, 4, today); // quality 4
        expect(result.repetitions).toBe(1);
        expect(result.interval).toBe(1); // First interval is 1 day
        expect(result.easiness).toBe(2.5); // Easiness: 2.5 - 0.8 + 0.28*4 - 0.02*4*4 = 2.5 - 0.8 + 1.12 - 0.32 = 2.5
        const expectedDueDate = new Date(today);
        expectedDueDate.setDate(today.getDate() + 1);
        expect(result.dueDate.toISOString().split('T')[0]).toBe(expectedDueDate.toISOString().split('T')[0]);
      });

      it('for a card with repetition 1, quality 5', () => {
        const card = { ...baseCard, repetitions: 1, interval: 1, easiness: 2.6 }; // prev interval 1 day
        const result = srs.calculateNextReview(card, 5, today); // quality 5
        expect(result.repetitions).toBe(2);
        expect(result.interval).toBe(6); // Next interval is 6 days
        expect(result.easiness).toBeCloseTo(2.6 - 0.8 + 0.28*5 - 0.02*5*5, 5); // 2.6 - 0.8 + 1.4 - 0.5 = 2.7
        const expectedDueDate = new Date(today);
        expectedDueDate.setDate(today.getDate() + 6);
        expect(result.dueDate.toISOString().split('T')[0]).toBe(expectedDueDate.toISOString().split('T')[0]);
      });
      
      it('for a card with repetition 1, quality 3 (borderline)', () => {
        const card = { ...baseCard, repetitions: 1, interval: 1, easiness: 2.3 }; 
        const result = srs.calculateNextReview(card, 3, today); // quality 3
        expect(result.repetitions).toBe(2);
        expect(result.interval).toBe(6); // Next interval is 6 days
        expect(result.easiness).toBeCloseTo(2.3 - 0.8 + 0.28*3 - 0.02*3*3, 5); // 2.3 - 0.8 + 0.84 - 0.18 = 2.16
        const expectedDueDate = new Date(today);
        expectedDueDate.setDate(today.getDate() + 6);
        expect(result.dueDate.toISOString().split('T')[0]).toBe(expectedDueDate.toISOString().split('T')[0]);
      });

      it('for a card with repetition > 1, quality 4', () => {
        const card = { ...baseCard, repetitions: 2, interval: 6, easiness: 2.7 }; // prev interval 6 days
        const result = srs.calculateNextReview(card, 4, today); // quality 4
        expect(result.repetitions).toBe(3);
        expect(result.interval).toBe(Math.round(6 * 2.7)); // interval * easiness = 6 * 2.7 = 16.2 -> 16
        expect(result.easiness).toBeCloseTo(2.7 - 0.8 + 0.28*4 - 0.02*4*4, 5); // 2.7 - 0.8 + 1.12 - 0.32 = 2.7
        const expectedDueDate = new Date(today);
        expectedDueDate.setDate(today.getDate() + Math.round(6 * 2.7));
        expect(result.dueDate.toISOString().split('T')[0]).toBe(expectedDueDate.toISOString().split('T')[0]);
      });
      
      it('easiness factor update for quality 3, 4, 5', () => {
        let card = { ...baseCard, easiness: 2.5 };
        card = srs.calculateNextReview(card, 3, today); // quality 3
        expect(card.easiness).toBeCloseTo(2.5 - 0.8 + 0.28*3 - 0.02*3*3, 5); // 2.36
        
        card = { ...baseCard, easiness: 2.36 }; // Use updated easiness
        card = srs.calculateNextReview(card, 4, today); // quality 4
        expect(card.easiness).toBeCloseTo(2.36 - 0.8 + 0.28*4 - 0.02*4*4, 5); // 2.36
        
        card = { ...baseCard, easiness: 2.36 }; // Use updated easiness
        card = srs.calculateNextReview(card, 5, today); // quality 5
        expect(card.easiness).toBeCloseTo(2.36 - 0.8 + 0.28*5 - 0.02*5*5, 5); // 2.46
      });
    });
  });
  
  // --- reviewCard Method Tests ---
  describe('reviewCard', () => {
    let deckId;
    let card;
    const today = new Date('2024-01-01T00:00:00.000Z');

    beforeEach(() => {
      const deck = srs.createDeck({ name: 'Review Test Deck' });
      deckId = deck.id;
      card = srs.createCard(deckId, { front: 'Q1', back: 'A1' });
      // Ensure Date.now() is mocked for reviewCard as well if it uses new Date() internally for history
      // Already done in global beforeEach
    });

    it('should call calculateNextReview and update card properties', () => {
      const quality = 4;
      const updatedCard = srs.reviewCard(deckId, card.id, quality);

      expect(updatedCard.isNew).toBe(false);
      expect(updatedCard.repetitions).toBe(1); // Based on SM-2 for new card, quality 4
      expect(updatedCard.interval).toBe(1);    // Based on SM-2 for new card, quality 4
      const expectedDueDate = new Date(today);
      expectedDueDate.setDate(today.getDate() + 1);
      expect(updatedCard.dueDate.toISOString().split('T')[0]).toBe(expectedDueDate.toISOString().split('T')[0]);
      
      const storedDeck = srs.getDeck(deckId);
      const storedCard = storedDeck.cards.find(c => c.id === card.id);
      expect(storedCard.repetitions).toBe(1);
    });

    it('should add a study history entry', () => {
      srs.reviewCard(deckId, card.id, 3);
      const history = JSON.parse(store['studyHistory'] || '[]');
      expect(history.length).toBe(1);
      expect(history[0].cardId).toBe(card.id);
      expect(history[0].deckId).toBe(deckId);
      expect(history[0].quality).toBe(3);
      expect(history[0].reviewedAt).toBe(today.toISOString()); // Mocked Date.now
    });
    
    it('should return null if deck or card not found', () => {
        expect(srs.reviewCard('non-existent-deck', card.id, 3)).toBeNull();
        expect(srs.reviewCard(deckId, 'non-existent-card', 3)).toBeNull();
    });
  });

  // --- getDueCards and getNewCards Tests ---
  describe('getDueCards and getNewCards', () => {
    let deckId1, deckId2;
    const today = new Date('2024-01-01T00:00:00.000Z');
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

    beforeEach(() => {
      const d1 = srs.createDeck({ name: 'Due Test Deck 1' });
      deckId1 = d1.id;
      const d2 = srs.createDeck({ name: 'Due Test Deck 2' });
      deckId2 = d2.id;

      // Card 1: New card in Deck 1
      srs.createCard(deckId1, { front: 'Q_New1', back: 'A' });
      // Card 2: Due card in Deck 1 (dueDate is yesterday)
      let c2 = srs.createCard(deckId1, { front: 'Q_Due1', back: 'A' });
      c2 = srs.reviewCard(deckId1, c2.id, 0); // Review with quality 0, interval becomes 1, due tomorrow
      // Manually set due date to yesterday for testing getDueCards
      const decks = srs.getAllDecks();
      const deckToUpdate = decks.find(d => d.id === deckId1);
      const cardToUpdate = deckToUpdate.cards.find(c => c.id === c2.id);
      cardToUpdate.dueDate = yesterday.toISOString();
      cardToUpdate.isNew = false;
      srs._saveDecks(decks);


      // Card 3: Not due card in Deck 1 (dueDate is tomorrow)
      let c3 = srs.createCard(deckId1, { front: 'Q_NotDue1', back: 'A' });
      c3 = srs.reviewCard(deckId1, c3.id, 5); // Interval will be >0, due in future
      // Card 4: New card in Deck 2
      srs.createCard(deckId2, { front: 'Q_New2', back: 'A' });
    });

    it('getNewCards should return only new cards from a specific deck', () => {
      const newCardsDeck1 = srs.getNewCards(deckId1);
      expect(newCardsDeck1.length).toBe(1);
      expect(newCardsDeck1[0].front).toBe('Q_New1');
    });
    
    it('getNewCards should return empty array if deck not found or no new cards', () => {
      expect(srs.getNewCards('non-existent-deck')).toEqual([]);
      const deck = srs.createDeck({name: "Empty Deck"});
      srs.createCard(deck.id, {front: "Reviewed", back: "Card"});
      srs.reviewCard(deck.id, deck.cards[0].id, 4); // make it not new
      expect(srs.getNewCards(deck.id)).toEqual([]);
    });

    it('getDueCards should return only due cards from a specific deck', () => {
      // Date.now mock is '2024-01-01T00:00:00.000Z'
      const dueCardsDeck1 = srs.getDueCards(deckId1);
      expect(dueCardsDeck1.length).toBe(1);
      expect(dueCardsDeck1[0].front).toBe('Q_Due1'); // dueDate was set to yesterday
    });
    
    it('getDueCards should return empty array if deck not found or no due cards', () => {
      expect(srs.getDueCards('non-existent-deck')).toEqual([]);
       const deck = srs.createDeck({name: "No Due Deck"});
      const card = srs.createCard(deck.id, {front: "Future", back: "Card"});
      srs.reviewCard(deck.id, card.id, 5); // Due in future
      expect(srs.getDueCards(deck.id)).toEqual([]);
    });

    it('getDueCards should include new cards if includeNew is true', () => {
      const dueCardsDeck1WithNew = srs.getDueCards(deckId1, true);
      // Should include Q_Due1 (due yesterday) and Q_New1 (new card)
      expect(dueCardsDeck1WithNew.length).toBe(2);
      const fronts = dueCardsDeck1WithNew.map(c => c.front).sort();
      expect(fronts).toEqual(['Q_Due1', 'Q_New1'].sort());
    });
  });

  // --- Statistics (localStorage based) ---
  describe('Statistics (getStudyStreak, getStudiedToday)', () => {
    const today = new Date('2024-01-01T00:00:00.000Z');
    const yesterday = new Date(new Date('2024-01-01T00:00:00.000Z').setDate(today.getDate() - 1));
    const twoDaysAgo = new Date(new Date('2024-01-01T00:00:00.000Z').setDate(today.getDate() - 2));

    const addStudyEntry = (date, cardId = 'c1', deckId = 'd1', quality = 3) => {
      const history = JSON.parse(localStorage.getItem('studyHistory') || '[]');
      history.push({
        cardId,
        deckId,
        quality,
        reviewedAt: date.toISOString(),
      });
      localStorage.setItem('studyHistory', JSON.stringify(history));
    };
    
    beforeEach(() => {
        // Date.now is mocked to today ('2024-01-01T00:00:00.000Z')
    });

    it('getStudiedToday should return correct count for today', () => {
      addStudyEntry(today);
      addStudyEntry(today);
      addStudyEntry(yesterday); // Should not be counted
      expect(srs.getStudiedToday()).toBe(2);
    });

    it('getStudiedToday should return 0 if no studies today', () => {
      addStudyEntry(yesterday);
      expect(srs.getStudiedToday()).toBe(0);
    });
    
    it('getStudiedToday should count for a specific deckId if provided', () => {
      addStudyEntry(today, 'c1', 'deck1');
      addStudyEntry(today, 'c2', 'deck1');
      addStudyEntry(today, 'c3', 'deck2');
      expect(srs.getStudiedToday('deck1')).toBe(2);
      expect(srs.getStudiedToday('deck2')).toBe(1);
      expect(srs.getStudiedToday('deck3')).toBe(0);
    });

    it('getStudyStreak should be 0 if no studies at all', () => {
      expect(srs.getStudyStreak()).toBe(0);
    });
    
    it('getStudyStreak should be 0 if studied today but not yesterday (and today is not the first study day)', () => {
        // Mock Date.now to a specific "current" day for streak calculation
        vi.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-03T00:00:00.000Z').getTime());
        srs = new SpacedRepetitionSystem(); // Re-init with new Date.now mock for internal _getTodayStart
        
        addStudyEntry(new Date('2024-01-03T10:00:00.000Z')); // "Today"
        addStudyEntry(new Date('2024-01-01T10:00:00.000Z')); // Two days ago
        expect(srs.getStudyStreak()).toBe(1); // Only today counts as streak start
    });


    it('getStudyStreak should be 1 if only studied today', () => {
      addStudyEntry(today);
      expect(srs.getStudyStreak()).toBe(1);
    });

    it('getStudyStreak should be 2 for studies on today and yesterday', () => {
      addStudyEntry(today);
      addStudyEntry(yesterday);
      expect(srs.getStudyStreak()).toBe(2);
    });

    it('getStudyStreak should be 3 for studies on today, yesterday, and two days ago', () => {
      addStudyEntry(today);
      addStudyEntry(yesterday);
      addStudyEntry(twoDaysAgo);
      expect(srs.getStudyStreak()).toBe(3);
    });

    it('getStudyStreak should be 1 if studied today, skipped yesterday, studied two days ago', () => {
      addStudyEntry(today);
      addStudyEntry(twoDaysAgo); // Gap in study
      expect(srs.getStudyStreak()).toBe(1);
    });
    
    it('getStudyStreak should be 0 if last study was yesterday but not today', () => {
      addStudyEntry(yesterday);
      addStudyEntry(twoDaysAgo);
      expect(srs.getStudyStreak()).toBe(0);
    });
    
    it('getStudyStreak handles multiple entries on the same day correctly', () => {
      addStudyEntry(today);
      addStudyEntry(today); // multiple on same day
      addStudyEntry(yesterday);
      addStudyEntry(yesterday); // multiple on same day
      addStudyEntry(twoDaysAgo);
      expect(srs.getStudyStreak()).toBe(3);
    });
  });
});
