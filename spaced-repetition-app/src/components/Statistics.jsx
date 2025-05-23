import React, { useState, useEffect } from 'react';import { useNavigate } from 'react-router-dom';import { ArrowLeft, TrendingUp, Calendar, Award, Clock, Target, BarChart3, BookOpen, CheckCircle, Zap } from 'lucide-react';import { SpacedRepetitionSystem } from '../utils/spacedRepetition';import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';import { useDarkMode } from '../hooks/useDarkMode';

function Statistics() {  const navigate = useNavigate();  const { darkMode } = useDarkMode();  const [srs] = useState(() => new SpacedRepetitionSystem());
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState('all');
  const [timeRange, setTimeRange] = useState('week'); // 'week', 'month', 'year'
  const [stats, setStats] = useState({
    overall: {},
    daily: [],
    achievements: [],
    detailed: {}
  });

  useEffect(() => {
    const allDecks = srs.getAllDecks();
    setDecks(allDecks);
    
    // Create sample data if no decks exist
    if (allDecks.length === 0) {
      srs.createSampleData();
      setDecks(srs.getAllDecks());
    }
  }, [srs]);

  useEffect(() => {
    calculateStats();
  }, [selectedDeck, timeRange, srs]);

  const calculateStats = () => {
    const data = srs.getData();
    const allDecks = srs.getAllDecks();
    
    if (!data || !data.studyHistory) {
      setStats({
        overall: {},
        daily: [],
        achievements: [],
        detailed: {}
      });
      return;
    }

    // Filter history by deck and time range
    let filteredHistory = data.studyHistory;
    
    if (selectedDeck !== 'all') {
      filteredHistory = filteredHistory.filter(session => session.deckId === selectedDeck);
    }

    // Time range filter
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subDays(now, 30);
        break;
      case 'year':
        startDate = subDays(now, 365);
        break;
      default:
        startDate = subDays(now, 7);
    }

    filteredHistory = filteredHistory.filter(session => {
      const sessionDate = new Date(session.date);
      return isAfter(sessionDate, startDate);
    });

    // Overall statistics
    const totalSessions = filteredHistory.length;
    const correctSessions = filteredHistory.filter(session => session.wasCorrect).length;
    const accuracy = totalSessions > 0 ? (correctSessions / totalSessions * 100) : 0;
    const avgResponseTime = totalSessions > 0 
      ? filteredHistory.reduce((sum, session) => sum + (session.responseTime || 0), 0) / totalSessions
      : 0;

    // Daily activity
    const dailyMap = new Map();
    for (let i = 0; i < (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365); i++) {
      const date = subDays(now, i);
      const dateKey = format(date, 'yyyy-MM-dd');
      dailyMap.set(dateKey, { date, sessions: 0, correct: 0, time: 0 });
    }

    filteredHistory.forEach(session => {
      const dateKey = format(new Date(session.date), 'yyyy-MM-dd');
      if (dailyMap.has(dateKey)) {
        const day = dailyMap.get(dateKey);
        day.sessions++;
        if (session.wasCorrect) day.correct++;
        day.time += session.responseTime || 0;
      }
    });

    const dailyStats = Array.from(dailyMap.values())
      .sort((a, b) => a.date - b.date)
      .map(day => ({
        date: format(day.date, 'MM/dd'),
        sessions: day.sessions,
        accuracy: day.sessions > 0 ? (day.correct / day.sessions * 100) : 0,
        avgTime: day.sessions > 0 ? Math.round(day.time / day.sessions) : 0
      }));

    // Achievements
    const achievements = calculateAchievements(data, allDecks);

    // Detailed deck stats
    const deckStats = selectedDeck === 'all' 
      ? allDecks.map(deck => ({
          ...deck,
          stats: srs.getDeckStatistics(deck.id)
        }))
      : [{ 
          ...allDecks.find(d => d.id === selectedDeck),
          stats: srs.getDeckStatistics(selectedDeck)
        }];

    setStats({
      overall: {
        totalSessions,
        accuracy: Number(accuracy.toFixed(1)),
        avgResponseTime: Math.round(avgResponseTime),
        streak: srs.getStudyStreak(),
        studiedToday: srs.getStudiedToday(selectedDeck === 'all' ? null : selectedDeck)
      },
      daily: dailyStats,
      achievements,
      detailed: { deckStats }
    });
  };

  const calculateAchievements = (data, decks) => {
    const achievements = [];
    const totalHistory = data.studyHistory || [];
    const streak = srs.getStudyStreak();

    // Study streak achievements
    if (streak >= 7) {
      achievements.push({
        title: '¡Una semana de dedicación!',
        description: `Has estudiado ${streak} días consecutivos`,
        icon: 'streak',
        color: 'orange',
        earned: true
      });
    }

    if (streak >= 30) {
      achievements.push({
        title: '¡Maestro de la constancia!',
        description: `${streak} días de racha es impresionante`,
        icon: 'fire',
        color: 'red',
        earned: true
      });
    }

    // Total sessions achievements
    if (totalHistory.length >= 100) {
      achievements.push({
        title: '¡Centenario!',
        description: 'Has completado 100 sesiones de estudio',
        icon: 'trophy',
        color: 'gold',
        earned: true
      });
    }

    if (totalHistory.length >= 500) {
      achievements.push({
        title: '¡Incansable!',
        description: '500 sesiones completadas',
        icon: 'star',
        color: 'purple',
        earned: true
      });
    }

    // Accuracy achievements
    const recentSessions = totalHistory.slice(-50);
    if (recentSessions.length >= 20) {
      const recentAccuracy = (recentSessions.filter(s => s.wasCorrect).length / recentSessions.length) * 100;
      if (recentAccuracy >= 90) {
        achievements.push({
          title: '¡Precisión experta!',
          description: `${recentAccuracy.toFixed(1)}% de precisión en las últimas sesiones`,
          icon: 'target',
          color: 'green',
          earned: true
        });
      }
    }

    // Deck mastery achievements
    decks.forEach(deck => {
      const deckStats = srs.getDeckStatistics(deck.id);
      const masteryPercentage = deckStats.totalCards > 0 
        ? (deckStats.masteredCards / deckStats.totalCards) * 100 
        : 0;
      
      if (masteryPercentage >= 80) {
        achievements.push({
          title: `¡Maestro de ${deck.name}!`,
          description: `Has dominado el ${masteryPercentage.toFixed(0)}% del mazo`,
          icon: 'crown',
          color: 'blue',
          earned: true
        });
      }
    });

    return achievements;
  };

  const getAchievementIcon = (iconType) => {
    const iconProps = { className: "w-6 h-6" };
    switch (iconType) {
      case 'streak': return <Calendar {...iconProps} />;
      case 'fire': return <Zap {...iconProps} />;
      case 'trophy': return <Award {...iconProps} />;
      case 'star': return <Award {...iconProps} />;
      case 'target': return <Target {...iconProps} />;
      case 'crown': return <Award {...iconProps} />;
      default: return <Award {...iconProps} />;
    }
  };

  const getColorClasses = (color) => {
    const colorMap = {
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      gold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">Estadísticas</h1>
          
          <div className="flex space-x-4">
            <select
              value={selectedDeck}
              onChange={(e) => setSelectedDeck(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los mazos</option>
              {decks.map(deck => (
                <option key={deck.id} value={deck.id}>{deck.name}</option>
              ))}
            </select>
            
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
              <option value="year">Último año</option>
            </select>
          </div>
        </div>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sesiones Totales</p>
                <p className="text-3xl font-bold text-gray-900">{stats.overall.totalSessions || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Precisión</p>
                <p className="text-3xl font-bold text-green-600">{stats.overall.accuracy || 0}%</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Racha Actual</p>
                <p className="text-3xl font-bold text-orange-500">{stats.overall.streak || 0} días</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-xl">
                <Calendar className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tiempo Promedio</p>
                <p className="text-3xl font-bold text-purple-500">{stats.overall.avgResponseTime || 0}ms</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Clock className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Daily Activity Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Actividad Diaria</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {stats.daily.map((day, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="bg-gradient-to-t from-blue-600 to-purple-600 rounded-t-lg w-full transition-all duration-300 hover:opacity-80"
                  style={{ 
                    height: `${Math.max((day.sessions / Math.max(...stats.daily.map(d => d.sessions), 1)) * 200, 4)}px` 
                  }}
                  title={`${day.sessions} sesiones - ${day.accuracy.toFixed(1)}% precisión`}
                ></div>
                <span className="text-xs text-gray-500 mt-2">{day.date}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center text-sm text-gray-600">
            Sesiones por día (hover para detalles)
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Achievements */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Award className="w-6 h-6 mr-2 text-yellow-500" />
              Logros
            </h3>
            
            <div className="space-y-4">
              {stats.achievements.length > 0 ? (
                stats.achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 ${getColorClasses(achievement.color)}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {getAchievementIcon(achievement.icon)}
                      </div>
                      <div>
                        <h4 className="font-semibold">{achievement.title}</h4>
                        <p className="text-sm opacity-80">{achievement.description}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>¡Sigue estudiando para desbloquear logros!</p>
                </div>
              )}
            </div>
          </div>

          {/* Deck Statistics */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <BookOpen className="w-6 h-6 mr-2 text-blue-500" />
              Estadísticas por Mazo
            </h3>
            
            <div className="space-y-4">
              {stats.detailed.deckStats && stats.detailed.deckStats.length > 0 ? (
                stats.detailed.deckStats.map((deck, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-3">{deck.name}</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-medium">{deck.stats.totalCards}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dominadas:</span>
                        <span className="font-medium text-green-600">{deck.stats.masteredCards}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Precisión:</span>
                        <span className="font-medium text-blue-600">{deck.stats.accuracy}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Por repasar:</span>
                        <span className="font-medium text-orange-600">{deck.stats.dueCards}</span>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${deck.stats.totalCards > 0 ? (deck.stats.masteredCards / deck.stats.totalCards) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        {deck.stats.totalCards > 0 
                          ? `${((deck.stats.masteredCards / deck.stats.totalCards) * 100).toFixed(1)}% dominado`
                          : 'Sin tarjetas'
                        }
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay datos suficientes para mostrar estadísticas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Statistics; 