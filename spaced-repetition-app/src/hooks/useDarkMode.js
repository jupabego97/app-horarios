import { useState, useEffect } from 'react';
import { SpacedRepetitionSystem } from '../utils/spacedRepetition';

export const useDarkMode = () => {
  const [darkMode, setDarkMode] = useState(false);
  const srs = new SpacedRepetitionSystem();

  useEffect(() => {
    // Cargar preferencia guardada
    const settings = srs.getSettings();
    const isDark = settings.darkMode || false;
    setDarkMode(isDark);
    
    // Aplicar clase al body
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    // Actualizar clase del body
    if (newMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    
    // Guardar preferencia
    srs.updateSettings({ darkMode: newMode });
  };

  return { darkMode, toggleDarkMode };
}; 