import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

class FirebaseService {
  constructor() {
    this.userId = null;
    
    // Listener para cambios de autenticación
    auth.onAuthStateChanged((user) => {
      this.userId = user ? user.uid : null;
    });
  }

  // Operaciones de Mazos
  async createDeck(deckData) {
    if (!this.userId) throw new Error('Usuario no autenticado');
    
    const deck = {
      ...deckData,
      userId: this.userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'decks'), deck);
    return { id: docRef.id, ...deck };
  }

  async getDecks() {
    if (!this.userId) throw new Error('Usuario no autenticado');
    
    const q = query(
      collection(db, 'decks'),
      where('userId', '==', this.userId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async updateDeck(deckId, updates) {
    if (!this.userId) throw new Error('Usuario no autenticado');
    
    const deckRef = doc(db, 'decks', deckId);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(deckRef, updateData);
    return { id: deckId, ...updateData };
  }

  async deleteDeck(deckId) {
    if (!this.userId) throw new Error('Usuario no autenticado');
    
    console.log('FirebaseService: Eliminando mazo', deckId, 'para usuario', this.userId);
    
    try {
      // Eliminar el mazo
      console.log('FirebaseService: Eliminando documento del mazo...');
      await deleteDoc(doc(db, 'decks', deckId));
      console.log('FirebaseService: Mazo eliminado exitosamente');
      
      // También eliminar las tarjetas del mazo
      console.log('FirebaseService: Buscando tarjetas del mazo para eliminar...');
      const cardsQuery = query(
        collection(db, 'cards'),
        where('deckId', '==', deckId)
      );
      const cardsSnapshot = await getDocs(cardsQuery);
      console.log(`FirebaseService: Encontradas ${cardsSnapshot.size} tarjetas para eliminar`);
      
      if (cardsSnapshot.size > 0) {
        const deletePromises = cardsSnapshot.docs.map(cardDoc => 
          deleteDoc(doc(db, 'cards', cardDoc.id))
        );
        
        await Promise.all(deletePromises);
        console.log('FirebaseService: Todas las tarjetas eliminadas');
      }
      
      console.log('FirebaseService: Eliminación completa exitosa');
      
    } catch (error) {
      console.error('FirebaseService: Error detallado al eliminar:', error);
      throw error;
    }
  }

  // Operaciones de Tarjetas
  async createCard(cardData) {
    if (!this.userId) throw new Error('Usuario no autenticado');
    
    const card = {
      ...cardData,
      userId: this.userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'cards'), card);
    return { id: docRef.id, ...card };
  }

  async getCards(deckId) {
    if (!this.userId) throw new Error('Usuario no autenticado');
    
    const q = query(
      collection(db, 'cards'),
      where('deckId', '==', deckId),
      where('userId', '==', this.userId),
      orderBy('createdAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async updateCard(cardId, updates) {
    if (!this.userId) throw new Error('Usuario no autenticado');
    
    const cardRef = doc(db, 'cards', cardId);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(cardRef, updateData);
    return { id: cardId, ...updateData };
  }

  async deleteCard(cardId) {
    if (!this.userId) throw new Error('Usuario no autenticado');
    
    console.log('FirebaseService: Eliminando tarjeta', cardId);
    try {
      await deleteDoc(doc(db, 'cards', cardId));
      console.log('FirebaseService: Tarjeta eliminada exitosamente');
    } catch (error) {
      console.error('FirebaseService: Error eliminando tarjeta:', error);
      throw error;
    }
  }

  // Operaciones de Estadísticas de Estudio
  async updateStudyStats(cardId, quality, nextReview) {
    if (!this.userId) throw new Error('Usuario no autenticado');
    
    const cardRef = doc(db, 'cards', cardId);
    await updateDoc(cardRef, {
      lastReviewed: Timestamp.now(),
      nextReview: Timestamp.fromDate(nextReview),
      easinessFactor: quality.easinessFactor,
      interval: quality.interval,
      repetitions: quality.repetitions,
      updatedAt: Timestamp.now()
    });
  }

  // Migración desde localStorage (uso único)
  async migrateFromLocalStorage() {
    if (!this.userId) throw new Error('Usuario no autenticado');
    
    try {
      const localData = localStorage.getItem('flashcardDecks');
      if (!localData) return { success: true, message: 'No hay datos para migrar' };
      
      const decks = JSON.parse(localData);
      let migratedDecks = 0;
      let migratedCards = 0;
      
      for (const deck of decks) {
        // Crear mazo en Firebase
        const { cards, ...deckData } = deck;
        const newDeck = await this.createDeck(deckData);
        migratedDecks++;
        
        // Crear tarjetas en Firebase
        for (const card of cards) {
          await this.createCard({
            ...card,
            deckId: newDeck.id
          });
          migratedCards++;
        }
      }
      
      return {
        success: true,
        message: `Migración completada: ${migratedDecks} mazos y ${migratedCards} tarjetas`
      };
      
    } catch (error) {
      console.error('Error en migración:', error);
      return {
        success: false,
        message: 'Error durante la migración: ' + error.message
      };
    }
  }
}

export default new FirebaseService(); 