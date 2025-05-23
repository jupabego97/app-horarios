import React, { useState } from 'react';
import { Upload, CloudUpload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import firebaseService from '../services/firebaseService';

const MigrationModal = ({ isOpen, onClose, onMigrationComplete }) => {
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [localDataInfo, setLocalDataInfo] = useState(null);

  React.useEffect(() => {
    if (isOpen) {
      // Analizar datos locales al abrir el modal
      const localData = localStorage.getItem('flashcardDecks');
      if (localData) {
        try {
          const decks = JSON.parse(localData);
          let totalCards = 0;
          decks.forEach(deck => {
            totalCards += deck.cards.length;
          });
          setLocalDataInfo({
            decks: decks.length,
            cards: totalCards,
            hasData: true
          });
        } catch (error) {
          setLocalDataInfo({ hasData: false });
        }
      } else {
        setLocalDataInfo({ hasData: false });
      }
    }
  }, [isOpen]);

  const handleMigration = async () => {
    setMigrating(true);
    setMigrationStatus(null);

    try {
      const result = await firebaseService.migrateFromLocalStorage();
      setMigrationStatus(result);
      
      if (result.success) {
        // Esperar un momento para mostrar el éxito
        setTimeout(() => {
          onMigrationComplete();
          onClose();
        }, 2000);
      }
    } catch (error) {
      setMigrationStatus({
        success: false,
        message: 'Error inesperado durante la migración: ' + error.message
      });
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    onMigrationComplete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CloudUpload className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Migración a la Nube
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Transfiere tus datos locales a Firebase para sincronización
          </p>
        </div>

        {/* Estado de datos locales */}
        {localDataInfo && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {localDataInfo.hasData ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Datos locales encontrados</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>📚 {localDataInfo.decks} mazos encontrados</p>
                  <p>🎯 {localDataInfo.cards} tarjetas en total</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-gray-500">
                <AlertCircle className="w-5 h-5" />
                <span>No se encontraron datos locales para migrar</span>
              </div>
            )}
          </div>
        )}

        {/* Estado de migración */}
        {migrationStatus && (
          <div className={`mb-6 p-4 rounded-lg ${
            migrationStatus.success 
              ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300' 
              : 'bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              {migrationStatus.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span className="font-semibold">
                {migrationStatus.success ? '¡Migración exitosa!' : 'Error en migración'}
              </span>
            </div>
            <p className="text-sm">{migrationStatus.message}</p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="space-y-3">
          {localDataInfo?.hasData && !migrationStatus?.success && (
            <button
              onClick={handleMigration}
              disabled={migrating}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {migrating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Migrando datos...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Upload className="w-5 h-5" />
                  <span>Migrar a Firebase</span>
                </div>
              )}
            </button>
          )}

          <button
            onClick={handleSkip}
            disabled={migrating}
            className="w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 p-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 transition-colors"
          >
            {migrationStatus?.success ? 'Continuar' : 'Omitir por ahora'}
          </button>
        </div>

        {!migrationStatus && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>💡 La migración es opcional pero recomendada</p>
              <p>🔄 Puedes migrar los datos más tarde desde configuración</p>
              <p>☁️ Una vez migrado, tus datos se sincronizarán automáticamente</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MigrationModal; 