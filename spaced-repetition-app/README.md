# MemoryMaster - Aplicación de Repetición Espaciada

Una aplicación moderna de repetición espaciada construida con React y Vite, diseñada para maximizar la retención de memoria a largo plazo usando el algoritmo SM-2.

## ✨ Características

### 🧠 Repetición Espaciada Inteligente
- **Algoritmo SM-2**: Implementación del algoritmo científicamente probado utilizado por Anki
- **Intervalos adaptativos**: Los intervalos de repaso se ajustan según tu rendimiento
- **Optimización automática**: La dificultad se calibra automáticamente para cada tarjeta

### 🎯 Experiencia de Usuario Excepcional
- **Interfaz moderna**: Diseño limpio y atractivo con Tailwind CSS
- **Animaciones fluidas**: Transiciones suaves y efectos visuales atractivos
- **Responsive**: Funciona perfectamente en desktop, tablet y móvil
- **Volteo de tarjetas**: Animación 3D para simular tarjetas físicas

### 📊 Seguimiento Detallado
- **Estadísticas completas**: Precisión, tiempo de respuesta, racha de estudio
- **Gráficos de progreso**: Visualización de actividad diaria y tendencias
- **Sistema de logros**: Gamificación para mantener la motivación
- **Análisis por mazo**: Estadísticas detalladas para cada conjunto de tarjetas

### 🗂️ Gestión de Contenido
- **Mazos organizados**: Crea y organiza tus tarjetas en mazos temáticos
- **Editor intuitivo**: Interfaz fácil para crear y editar tarjetas
- **Sistema de etiquetas**: Organiza y filtra tarjetas con etiquetas personalizadas
- **Datos de ejemplo**: Mazos precargados para empezar inmediatamente

## 🚀 Tecnologías Utilizadas

- **React 18**: Framework frontend moderno
- **Vite**: Build tool ultrarrápido
- **Tailwind CSS**: Framework de estilos utilitarios
- **Lucide React**: Iconos modernos y consistentes
- **React Router**: Navegación SPA
- **date-fns**: Manejo robusto de fechas
- **LocalStorage**: Persistencia de datos local

## 📦 Instalación y Uso

### Prerrequisitos
- Node.js 16+ 
- npm o yarn

### Instalación
```bash
# Clona el repositorio
git clone <url-repositorio>

# Navega al directorio
cd spaced-repetition-app

# Instala dependencias
npm install

# Inicia el servidor de desarrollo
npm run dev
```

### Scripts Disponibles
```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Linting con ESLint
```

## 🎮 Cómo Usar

### 1. Página de Inicio
- **Resumen general**: Estadísticas principales y progreso
- **Acceso rápido**: Botones para estudiar o crear mazos
- **Panel de estado**: Tarjetas pendientes y racha de estudio

### 2. Sesión de Estudio
- **Selección de mazo**: Elige qué conjunto de tarjetas estudiar
- **Interfaz de tarjetas**: Haz clic para voltear y ver la respuesta
- **Sistema de calificación**: Evalúa tu conocimiento del 0 al 5
- **Progreso visual**: Barra de progreso y contador de sesión

### 3. Gestión de Mazos
- **Crear mazos**: Organiza tus tarjetas por tema
- **Editar tarjetas**: Modifica preguntas, respuestas y etiquetas
- **Estadísticas de mazo**: Ve el progreso específico de cada conjunto

### 4. Estadísticas
- **Panel de control**: Métricas clave de rendimiento
- **Gráficos de actividad**: Visualiza tu consistencia de estudio
- **Sistema de logros**: Desbloquea insignias por tu progreso
- **Análisis detallado**: Profundiza en estadísticas específicas

## 🧮 Algoritmo de Repetición Espaciada

El algoritmo SM-2 implementado calcula el siguiente intervalo de repaso basado en:

1. **Calidad de respuesta** (0-5):
   - 0: No recordé nada
   - 1-2: Respuesta incorrecta
   - 3: Respuesta correcta con dificultad
   - 4: Respuesta correcta fácilmente
   - 5: Respuesta perfecta

2. **Factor de facilidad**: Se ajusta dinámicamente según el rendimiento
3. **Número de repeticiones**: Cuenta de repasos exitosos consecutivos
4. **Intervalos progresivos**: 1 día → 6 días → intervalo × facilidad

## 💾 Almacenamiento de Datos

Los datos se almacenan localmente en el navegador usando `localStorage`:

```javascript
{
  "decks": [...],           // Mazos y tarjetas
  "studyHistory": [...],    // Historial de sesiones
  "settings": {...}         // Configuraciones de usuario
}
```

## 🎨 Personalización

### Colores y Temas
Los colores principales se pueden modificar en `tailwind.config.js`:

```javascript
colors: {
  primary: { /* azul personalizado */ },
  secondary: { /* verde personalizado */ }
}
```

### Animaciones
Las animaciones personalizadas están definidas en `src/index.css`:

```css
.card-flip { /* Animación de volteo 3D */ }
.btn-primary { /* Efectos de botones */ }
```

## 🔮 Funcionalidades Futuras

- [ ] **Sincronización en la nube**: Backup automático y acceso multiplataforma
- [ ] **Importación/Exportación**: Compatibilidad con formatos Anki
- [ ] **Modo colaborativo**: Compartir mazos entre usuarios
- [ ] **Multimedia**: Soporte para imágenes y audio
- [ ] **IA integrada**: Generación automática de tarjetas
- [ ] **Análisis avanzado**: Machine learning para optimización personalizada

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ve el archivo `LICENSE` para más detalles.

## 🙏 Reconocimientos

- **SuperMemo**: Por el algoritmo SM-2 original
- **Anki**: Inspiración para la interfaz y funcionalidades
- **Tailwind CSS**: Por el excelente framework de estilos
- **Lucide**: Por los iconos hermosos y consistentes

---

**¡Feliz aprendizaje! 🎓**

*MemoryMaster - Tu compañero inteligente para el aprendizaje eficaz*
