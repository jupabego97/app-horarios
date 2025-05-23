import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Brain, Plus, BarChart3, Settings, BookOpen, Trophy, Calendar, Zap, Moon, Sun, User, LogOut, LogIn } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebaseConfig';
import firebaseService from './services/firebaseService';
import AuthModal from './components/AuthModal';
import MigrationModal from './components/MigrationModal';
import StudySession from './components/StudySession';
import DeckManager from './components/DeckManager';
import Statistics from './components/Statistics';
import { SpacedRepetitionSystem } from './utils/spacedRepetition';
import { useDarkMode } from './hooks/useDarkMode';

function HomePage({ user }) {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [stats, setStats] = useState({
    totalCards: 0,
    studiedToday: 0,
    streak: 0,
    dueCards: 0
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      if (user) {
        // Cargar stats desde Firebase cuando el usuario esté autenticado
        try {
          const decks = await firebaseService.getDecks();
          let totalCards = 0;
          let dueCards = 0;
          
          for (const deck of decks) {
            const cards = await firebaseService.getCards(deck.id);
            totalCards += cards.length;
            
            // Calcular tarjetas pendientes usando la lógica de repetición espaciada
            const now = new Date();
            const due = cards.filter(card => {
              if (!card.nextReview) return true;
              const nextReview = card.nextReview.toDate();
              return nextReview <= now;
            });
            dueCards += due.length;
          }
          
          let userStudyStats = { studiedToday: 0, streak: 0 };
          try {
            const fetchedStudyStats = await firebaseService.getUserStudyStatistics();
            if (fetchedStudyStats) {
              userStudyStats = fetchedStudyStats;
            }
          } catch (err) {
            console.error('Error cargando estadísticas de estudio del usuario:', err);
            // userStudyStats will retain its default { studiedToday: 0, streak: 0 }
          }

          setStats({ 
            totalCards, 
            dueCards,
            studiedToday: userStudyStats.studiedToday,
            streak: userStudyStats.streak
          });
        } catch (error) {
          console.error('Error cargando estadísticas generales:', error);
          // Set stats with defaults if general loading fails
          setStats({
            totalCards: 0,
            dueCards: 0,
            studiedToday: 0,
            streak: 0
          });
        }
      } else {
        // Fallback a localStorage para usuarios no autenticados
        const srs = new SpacedRepetitionSystem();
        const decks = srs.getAllDecks();
        
        let totalCards = 0;
        let dueCards = 0;
        let studiedToday = 0;
        
        decks.forEach(deck => {
          totalCards += deck.cards.length;
          dueCards += srs.getDueCards(deck.id).length;
          studiedToday += srs.getStudiedToday(deck.id);
        });
        
        const streak = srs.getStudyStreak();
        
        setStats({ totalCards, studiedToday, streak, dueCards });
      }
    };

    loadStats();
  }, [user]);

  const handleAuthSuccess = (isNewUser = false) => {
    setShowAuthModal(false);
    // Mostrar modal de migración para nuevos usuarios si hay datos locales
    if (isNewUser) {
      const localData = localStorage.getItem('flashcardDecks');
      if (localData) {
        setShowMigrationModal(true);
      }
    }
  };

  const handleMigrationComplete = () => {
    setShowMigrationModal(false);
    // Recargar stats después de la migración
    window.location.reload();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">MemoryMaster</h1>
                <p className="text-gray-600 dark:text-gray-400">Tu compañero de repetición espaciada</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <nav className="hidden md:flex space-x-6">
                <Link to="/study" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <BookOpen className="w-5 h-5" />
                  <span>Estudiar</span>
                </Link>
                <Link to="/decks" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <Plus className="w-5 h-5" />
                  <span>Mazos</span>
                </Link>
                <Link to="/stats" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <BarChart3 className="w-5 h-5" />
                  <span>Estadísticas</span>
                </Link>
              </nav>
              
              <button
                onClick={toggleDarkMode}
                className="dark-toggle"
                title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Authentication Section */}
              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-8 h-8 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {user.displayName || user.email}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Iniciar Sesión</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Cloud Sync Indicator */}
      {user && (
        <div className="bg-green-50 dark:bg-green-900 border-b border-green-200 dark:border-green-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-300">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm">☁️ Sincronizado con Firebase</span>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Aprende más <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">eficientemente</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Utiliza el poder de la repetición espaciada para memorizar cualquier cosa de forma permanente
          </p>
          
          {!user && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-xl border border-blue-200 dark:border-blue-700">
              <p className="text-blue-700 dark:text-blue-300 mb-3">
                🔒 <strong>¡Registrate gratis!</strong> Sincroniza tus datos en todos tus dispositivos
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Crear cuenta gratuita
              </button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tarjetas</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCards}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800 p-3 rounded-xl">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Por Repasar</p>
                <p className="text-3xl font-bold text-orange-500">{stats.dueCards}</p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-800 p-3 rounded-xl">
                <Calendar className="w-6 h-6 text-orange-500 dark:text-orange-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Estudiadas Hoy</p>
                <p className="text-3xl font-bold text-green-500">{stats.studiedToday}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800 p-3 rounded-xl">
                <Zap className="w-6 h-6 text-green-500 dark:text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
      <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Racha</p>
                <p className="text-3xl font-bold text-purple-500">{stats.streak} días</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800 p-3 rounded-xl">
                <Trophy className="w-6 h-6 text-purple-500 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => navigate('/study')}
            className="btn-primary text-xl px-8 py-4 w-full sm:w-auto"
            disabled={stats.dueCards === 0}
          >
            <BookOpen className="w-6 h-6 mr-2" />
            {stats.dueCards > 0 ? `Estudiar ${stats.dueCards} tarjetas` : 'No hay tarjetas por repasar'}
          </button>
          
          <button
            onClick={() => navigate('/decks')}
            className="btn-secondary text-lg px-6 py-3 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            Crear Nuevo Mazo
          </button>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuth={handleAuthSuccess}
      />

      {/* Migration Modal */}
      <MigrationModal
        isOpen={showMigrationModal}
        onClose={() => setShowMigrationModal(false)}
        onMigrationComplete={handleMigrationComplete}
      />
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando MemoryMaster...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/study" element={<StudySession user={user} />} />
          <Route path="/decks" element={<DeckManager user={user} />} />
          <Route path="/stats" element={<Statistics user={user} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
