import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Database, Clock, RefreshCw, Wifi } from 'lucide-react';
import { getHealthStatus } from '@/lib/api/client';
import { getApiErrorInfo } from '@/lib/api/errorHandler';
import { logger } from '@/lib/logger';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface HealthData {
  status: 'ok' | 'error';
  uptime: number;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

export const SystemStatus: React.FC = () => {
  const { t } = useTranslation();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHealthStatus();
      setHealth(data);
    } catch (err) {
      logger.error('Failed to fetch health status', { error: err });
      const errorInfo = getApiErrorInfo(err);
      setError(t(errorInfo.key, errorInfo.params));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const formatUptime = (seconds: number): string => {
    try {
      if (!isFinite(seconds) || seconds < 0) {
        return t('system_status.unknown', 'Unknown');
      }
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    } catch {
      return t('system_status.unknown', 'Unknown');
    }
  };

  const getTimeAgo = (timestamp: string): string => {
    try {
      const now = new Date();
      const then = new Date(timestamp);
      if (isNaN(then.getTime())) {
        return t('system_status.unknown', 'Unknown');
      }
      const diffMs = now.getTime() - then.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return t('system_status.just_now', 'Just now');
      if (diffMins < 60) return t('system_status.minutes_ago', '{{count}}m ago', { count: diffMins });

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return t('system_status.hours_ago', '{{count}}h ago', { count: diffHours });

      const diffDays = Math.floor(diffHours / 24);
      return t('system_status.days_ago', '{{count}}d ago', { count: diffDays });
    } catch {
      return t('system_status.unknown', 'Unknown');
    }
  };

  if (!health && !error) {
    return (
      <div className="bg-slate-900/30 border border-slate-800/50 rounded-3xl p-5">
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/30 border border-slate-800/50 rounded-3xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
          {t('system_status.title', 'System Status')}
        </h3>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={t('system_status.refresh', 'Refresh')}
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-300">
              {t('system_status.connection_error', 'Connection Error')}
            </p>
            <p className="text-xs text-red-400 mt-1">{error}</p>
          </div>
        </div>
      ) : health ? (
        <div className="space-y-3">
          {/* Overall Status */}
          <div className="flex items-center gap-3">
            {health.status === 'ok' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-200">
                {t('system_status.overall_status', 'Overall Status')}
              </p>
              <p className={`text-xs ${health.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                {health.status === 'ok'
                  ? t('system_status.healthy', 'Healthy')
                  : t('system_status.unhealthy', 'Unhealthy')
                }
              </p>
            </div>
          </div>

          {/* Database Status */}
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-200">
                {t('system_status.database', 'Database')}
              </p>
              <p className={`text-xs ${health.database === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                {health.database === 'connected'
                  ? t('system_status.connected', 'Connected')
                  : t('system_status.disconnected', 'Disconnected')
                }
              </p>
            </div>
          </div>

          {/* Uptime */}
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-200">
                {t('system_status.uptime', 'Uptime')}
              </p>
              <p className="text-xs text-slate-400">
                {formatUptime(health.uptime)}
              </p>
            </div>
          </div>

          {/* Last Check */}
          <div className="flex items-center gap-3">
            <Wifi className="w-5 h-5 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-200">
                {t('system_status.last_check', 'Last Check')}
              </p>
              <p className="text-xs text-slate-400">
                {getTimeAgo(health.timestamp)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};