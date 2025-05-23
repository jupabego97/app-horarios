import { GoogleGenerativeAI } from '@google/generative-ai';

class AIService {
  constructor() {
    this.apiKey = null;
    this.genAI = null;
    this.model = null;
    this.loadSavedApiKey();
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });
  }

  isConfigured() {
    return this.apiKey && this.genAI && this.model;
  }

  async generateCards(topic, numberOfCards, difficulty = 'intermedio', language = 'español') {
    if (!this.isConfigured()) {
      throw new Error('API key de Gemini no configurada');
    }

    const prompt = this.buildPrompt(topic, numberOfCards, difficulty, language);

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseCardsFromResponse(text);
    } catch (error) {
      console.error('Error generando tarjetas con IA:', error);
      throw new Error(`Error al generar tarjetas: ${error.message}`);
    }
  }

  buildPrompt(topic, numberOfCards, difficulty, language) {
    return `
Eres un experto en educación y creación de contenido de aprendizaje. Tu tarea es crear ${numberOfCards} tarjetas de estudio de repetición espaciada sobre el tema "${topic}".

INSTRUCCIONES ESPECÍFICAS:
- Nivel de dificultad: ${difficulty}
- Idioma: ${language}
- Crea preguntas claras y específicas
- Las respuestas deben ser concisas pero completas
- Varía el tipo de preguntas: definiciones, ejemplos, aplicaciones, comparaciones
- Asegúrate de que las preguntas cubran diferentes aspectos del tema
- Ordena las tarjetas de menos a más complejo

FORMATO DE RESPUESTA REQUERIDO:
Responde ÚNICAMENTE con un JSON válido en el siguiente formato:

{
  "cards": [
    {
      "front": "Pregunta aquí",
      "back": "Respuesta aquí",
      "tags": ["etiqueta1", "etiqueta2"]
    }
  ]
}

EJEMPLO:
{
  "cards": [
    {
      "front": "¿Qué es la fotosíntesis?",
      "back": "Proceso mediante el cual las plantas convierten la luz solar, dióxido de carbono y agua en glucosa y oxígeno",
      "tags": ["biología", "plantas", "básico"]
    }
  ]
}

Genera exactamente ${numberOfCards} tarjetas sobre "${topic}". Responde solo con el JSON, sin texto adicional.
`;
  }

  parseCardsFromResponse(responseText) {
    try {
      // Limpiar la respuesta para extraer solo el JSON
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleanedResponse);
      
      if (!parsed.cards || !Array.isArray(parsed.cards)) {
        throw new Error('Formato de respuesta inválido');
      }

      // Validar que cada tarjeta tenga los campos requeridos
      const validCards = parsed.cards.filter(card => {
        return card.front && card.back && 
               typeof card.front === 'string' && 
               typeof card.back === 'string';
      }).map(card => ({
        ...card,
        tags: Array.isArray(card.tags) ? card.tags : [card.tags || 'generado-ia'].filter(Boolean)
      }));

      if (validCards.length === 0) {
        throw new Error('No se encontraron tarjetas válidas en la respuesta');
      }

      return validCards;
    } catch (error) {
      console.error('Error parseando respuesta de IA:', error);
      console.error('Respuesta original:', responseText);
      throw new Error('No se pudo procesar la respuesta de la IA. Intenta nuevamente.');
    }
  }

  // Método para generar sugerencias de temas
  async generateTopicSuggestions(subject) {
    if (!this.isConfigured()) {
      return [];
    }

    const prompt = `
Sugiere 5 temas específicos y útiles para crear tarjetas de estudio sobre "${subject}".

Responde ÚNICAMENTE con un array JSON de strings:
["tema1", "tema2", "tema3", "tema4", "tema5"]

Ejemplos de buenos temas:
- Para "matemáticas": ["Álgebra básica", "Geometría de triángulos", "Funciones lineales"]
- Para "historia": ["Primera Guerra Mundial", "Revolución Francesa", "Imperio Romano"]
- Para "biología": ["Sistema circulatorio", "Fotosíntesis", "Mitosis y meiosis"]

Sugiere temas para: "${subject}"
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Error generando sugerencias:', error);
      return [];
    }
  }

  // Método para verificar la API key
  async testApiKey(apiKey) {
    try {
      const tempGenAI = new GoogleGenerativeAI(apiKey);
      const tempModel = tempGenAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });
      
      const result = await tempModel.generateContent("Responde solo con 'OK' si esta API key funciona correctamente.");
      const response = await result.response;
      const text = response.text().toLowerCase();
      
      return text.includes('ok');
    } catch (error) {
      console.error('Error verificando API key:', error);
      return false;
    }
  }

  // Guardar API key en localStorage (para conveniencia del demo)
  saveApiKey(apiKey) {
    localStorage.setItem('gemini_api_key', apiKey);
    this.setApiKey(apiKey);
  }

  // Cargar API key desde localStorage
  loadSavedApiKey() {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      this.setApiKey(savedKey);
      return true;
    }
    return false;
  }

  // Limpiar API key
  clearApiKey() {
    localStorage.removeItem('gemini_api_key');
    this.apiKey = null;
    this.genAI = null;
    this.model = null;
  }
}

// Singleton instance
export const aiService = new AIService();
export default aiService; 