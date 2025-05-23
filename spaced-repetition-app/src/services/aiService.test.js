import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { aiService } from './aiService'; // Testing the singleton instance
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock @google/generative-ai
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent,
}));

vi.mock('@google/generative-ai', () => {
  // Actual constructor for GoogleGenerativeAI class
  const ActualGoogleGenerativeAI = vi.fn(); 
  ActualGoogleGenerativeAI.prototype.getGenerativeModel = mockGetGenerativeModel;
  
  return {
    GoogleGenerativeAI: ActualGoogleGenerativeAI, // Use the class directly
  };
});


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

describe('AIService', () => {
  beforeEach(() => {
    global.localStorage = localStorageMock;
    store = {}; // Clear store for each test
    localStorageMock.clear();
    mockGenerateContent.mockReset();
    mockGetGenerativeModel.mockClear();
    // Reset the GoogleGenerativeAI constructor mock's calls if needed for specific tests
    GoogleGenerativeAI.mockClear();


    // aiService is a singleton, its constructor is called once when imported.
    // We need to manually reset its internal state or re-initialize critical parts for some tests.
    // For tests involving initial state (like constructor calls), this can be tricky.
    // The `clearApiKey` method helps reset most of its state.
    aiService.clearApiKey(); // Resets apiKey, genAI, model, and localStorage item
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restores all vi.spyOn, vi.fn().mockRestore(), etc.
  });

  describe('Initialization and API Key Management', () => {
    it('should have null apiKey, genAI, and model initially (after clearApiKey)', () => {
      // clearApiKey() is called in beforeEach, ensuring this state
      expect(aiService.apiKey).toBeNull();
      expect(aiService.genAI).toBeNull();
      expect(aiService.model).toBeNull();
    });

    describe('loadSavedApiKey()', () => {
      it('should configure the service if API key exists in localStorage', () => {
        store['gemini_api_key'] = 'test-key-from-storage';
        // aiService constructor calls loadSavedApiKey.
        // To test loadSavedApiKey behavior in isolation after initial construction,
        // we can call it directly if needed, or re-initialize service if possible.
        // Since we use singleton, we clear and then load.
        aiService.clearApiKey(); // ensure it's null
        localStorageMock.getItem.mockReturnValueOnce('test-key-from-storage'); // Mock this call specifically

        const result = aiService.loadSavedApiKey();
        
        expect(result).toBe(true);
        expect(localStorageMock.getItem).toHaveBeenCalledWith('gemini_api_key');
        expect(aiService.apiKey).toBe('test-key-from-storage');
        expect(GoogleGenerativeAI).toHaveBeenCalledWith('test-key-from-storage');
        expect(mockGetGenerativeModel).toHaveBeenCalled();
      });

      it('should not configure the service if no API key in localStorage', () => {
        localStorageMock.getItem.mockReturnValueOnce(null);
        const result = aiService.loadSavedApiKey();
        expect(result).toBe(false);
        expect(aiService.apiKey).toBeNull();
        expect(GoogleGenerativeAI).not.toHaveBeenCalled();
      });
    });

    describe('setApiKey(key)', () => {
      it('should set apiKey, initialize GenAI and model', () => {
        aiService.setApiKey('test-key');
        expect(aiService.apiKey).toBe('test-key');
        expect(GoogleGenerativeAI).toHaveBeenCalledWith('test-key');
        expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: "gemini-2.5-flash-preview-04-17" });
        expect(aiService.genAI).toBeInstanceOf(GoogleGenerativeAI);
        expect(aiService.model).not.toBeNull();
      });
    });

    describe('isConfigured()', () => {
      it('should return true if configured', () => {
        aiService.setApiKey('test-key');
        expect(aiService.isConfigured()).toBe(true);
      });

      it('should return false if not configured', () => {
        // State is cleared in beforeEach
        expect(aiService.isConfigured()).toBe(false);
      });
    });

    describe('clearApiKey()', () => {
      it('should nullify properties and remove key from localStorage', () => {
        aiService.setApiKey('test-key'); // Configure first
        localStorage.setItem('gemini_api_key', 'test-key'); // Simulate it was saved

        aiService.clearApiKey();

        expect(aiService.apiKey).toBeNull();
        expect(aiService.genAI).toBeNull();
        expect(aiService.model).toBeNull();
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('gemini_api_key');
      });
    });

    describe('saveApiKey(key)', () => {
      it('should set apiKey, initialize GenAI/model, and save to localStorage', () => {
        aiService.saveApiKey('saved-key');
        expect(aiService.apiKey).toBe('saved-key');
        expect(GoogleGenerativeAI).toHaveBeenCalledWith('saved-key');
        expect(mockGetGenerativeModel).toHaveBeenCalled();
        expect(localStorageMock.setItem).toHaveBeenCalledWith('gemini_api_key', 'saved-key');
      });
    });
  });

  describe('buildPrompt()', () => {
    it('should create a correctly formatted prompt string', () => {
      const prompt = aiService.buildPrompt('JavaScript', 3, 'avanzado', 'inglés');
      expect(prompt).toContain('JavaScript');
      expect(prompt).toContain('3 tarjetas de estudio');
      expect(prompt).toContain('Nivel de dificultad: avanzado');
      expect(prompt).toContain('Idioma: inglés');
      expect(prompt).toContain('FORMATO DE RESPUESTA REQUERIDO:');
      expect(prompt).toContain('"front": "Pregunta aquí"');
    });
  });

  describe('parseCardsFromResponse()', () => {
    it('should parse a valid JSON string into cards', () => {
      const responseText = '{ "cards": [{"front":"Q1","back":"A1","tags":["t1"]}] }';
      const cards = aiService.parseCardsFromResponse(responseText);
      expect(cards.length).toBe(1);
      expect(cards[0]).toEqual({ front: 'Q1', back: 'A1', tags: ['t1'] });
    });

    it('should handle JSON wrapped in markdown backticks', () => {
      const responseText = '```json\n{ "cards": [{"front":"Q1","back":"A1"}] }\n```';
      const cards = aiService.parseCardsFromResponse(responseText);
      expect(cards.length).toBe(1);
      expect(cards[0].front).toBe('Q1');
    });
    
    it('should filter out cards with missing front or back', () => {
        const responseText = '{ "cards": [{"front":"Q1","back":"A1"}, {"front":"Q2"}, {"back":"A3"}] }';
        const cards = aiService.parseCardsFromResponse(responseText);
        expect(cards.length).toBe(1);
        expect(cards[0].front).toBe('Q1');
    });

    it('should provide default tag if tags are missing or invalid', () => {
        const responseText = '{ "cards": [{"front":"Q1","back":"A1"}, {"front":"Q2","back":"A2", "tags": "singleTagString"}] }';
        const cards = aiService.parseCardsFromResponse(responseText);
        expect(cards[0].tags).toEqual(['generado-ia']);
        expect(cards[1].tags).toEqual(['singleTagString']); // Should wrap in array
    });

    it('should throw error for malformed JSON', () => {
      const responseText = '{ "cards": [';
      expect(() => aiService.parseCardsFromResponse(responseText)).toThrow('No se pudo procesar la respuesta de la IA');
    });
    
    it('should throw error if "cards" array is missing', () => {
      const responseText = '{ "items": [{"front":"Q1","back":"A1"}] }';
      expect(() => aiService.parseCardsFromResponse(responseText)).toThrow('Formato de respuesta inválido');
    });

    it('should throw error if no valid cards are found', () => {
      const responseText = '{ "cards": [{"question":"Q1","answer":"A1"}] }'; // Invalid keys
      expect(() => aiService.parseCardsFromResponse(responseText)).toThrow('No se encontraron tarjetas válidas en la respuesta');
    });
  });

  describe('generateCards()', () => {
    it('should throw error if not configured', async () => {
      // aiService is cleared in beforeEach
      await expect(aiService.generateCards('topic', 5)).rejects.toThrow('API key de Gemini no configurada');
    });

    it('should generate cards successfully', async () => {
      aiService.setApiKey('dummy-key');
      const mockResponseText = '{ "cards": [{"front":"Q1","back":"A1","tags":["t1"]}] }';
      mockGenerateContent.mockResolvedValue({ 
        response: { text: () => mockResponseText } 
      });

      const cards = await aiService.generateCards('topic', 1);
      
      expect(mockGenerateContent).toHaveBeenCalled();
      expect(cards.length).toBe(1);
      expect(cards[0].front).toBe('Q1');
    });

    it('should throw error if AI generation fails', async () => {
      aiService.setApiKey('dummy-key');
      mockGenerateContent.mockRejectedValue(new Error('AI error'));

      await expect(aiService.generateCards('topic', 1)).rejects.toThrow('Error al generar tarjetas: AI error');
    });
  });
  
  describe('generateTopicSuggestions()', () => {
    it('should return empty array if not configured', async () => {
        const suggestions = await aiService.generateTopicSuggestions("math");
        expect(suggestions).toEqual([]);
    });

    it('should generate topic suggestions successfully', async () => {
        aiService.setApiKey('dummy-key');
        const mockResponseText = '["Algebra", "Calculus", "Geometry"]';
        mockGenerateContent.mockResolvedValue({
            response: { text: () => mockResponseText }
        });

        const suggestions = await aiService.generateTopicSuggestions("math");
        expect(mockGenerateContent).toHaveBeenCalled();
        expect(suggestions).toEqual(["Algebra", "Calculus", "Geometry"]);
    });
    
    it('should return empty array if AI generation fails for suggestions', async () => {
        aiService.setApiKey('dummy-key');
        mockGenerateContent.mockRejectedValue(new Error('AI suggestion error'));
        const suggestions = await aiService.generateTopicSuggestions("math");
        expect(suggestions).toEqual([]);
    });
  });

  describe('testApiKey()', () => {
    it('should return true for a valid API key', async () => {
      // The mock for GoogleGenerativeAI and getGenerativeModel is global.
      // testApiKey creates its own tempGenAI and tempModel.
      // We need mockGetGenerativeModel to return another model that has generateContent.
      const mockTestGenerateContent = vi.fn().mockResolvedValue({
        response: { text: () => "OK, this key works." }
      });
      const mockTestModel = { generateContent: mockTestGenerateContent };
      
      // Temporarily override the global mockGetGenerativeModel for this test case
      const originalMockGetGenerativeModel = mockGetGenerativeModel.getMockImplementation();
      mockGetGenerativeModel.mockImplementation(() => mockTestModel);

      const isValid = await aiService.testApiKey('valid-key');
      
      expect(GoogleGenerativeAI).toHaveBeenCalledWith('valid-key');
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: "gemini-2.5-flash-preview-04-17" });
      expect(mockTestGenerateContent).toHaveBeenCalledWith("Responde solo con 'OK' si esta API key funciona correctamente.");
      expect(isValid).toBe(true);

      // Restore original mock
      mockGetGenerativeModel.mockImplementation(originalMockGetGenerativeModel);
    });

    it('should return false for an invalid API key (AI error)', async () => {
      const mockTestGenerateContent = vi.fn().mockRejectedValue(new Error('Invalid key error'));
      const mockTestModel = { generateContent: mockTestGenerateContent };
      
      const originalMockGetGenerativeModel = mockGetGenerativeModel.getMockImplementation();
      mockGetGenerativeModel.mockImplementation(() => mockTestModel);

      const isValid = await aiService.testApiKey('invalid-key');
      
      expect(isValid).toBe(false);
      
      mockGetGenerativeModel.mockImplementation(originalMockGetGenerativeModel);
    });
    
    it('should return false if AI response does not contain "ok"', async () => {
      const mockTestGenerateContent = vi.fn().mockResolvedValue({
        response: { text: () => "Something went wrong." }
      });
      const mockTestModel = { generateContent: mockTestGenerateContent };
      
      const originalMockGetGenerativeModel = mockGetGenerativeModel.getMockImplementation();
      mockGetGenerativeModel.mockImplementation(() => mockTestModel);

      const isValid = await aiService.testApiKey('another-key');
      expect(isValid).toBe(false);
      
      mockGetGenerativeModel.mockImplementation(originalMockGetGenerativeModel);
    });
  });
});
