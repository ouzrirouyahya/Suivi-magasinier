import React from 'react';
import { Search, Menu, Activity, Bell, Check, CheckSquare, AlertTriangle, Info, ShieldAlert, Clock, SlidersHorizontal, Sun, Moon, Monitor, Smartphone } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { Article, SiteCode, AppNotification } from '../../types';
import { useInventory } from '../../context/InventoryContext';

interface ToolbarProps {
  globalSearch: string;
  setGlobalSearch: (s: string) => void;
  articles: Article[];
  currentSite: SiteCode;
  onSearchFocus: () => void;
  onOpenMenu?: () => void;
  onNavigateToForensic?: () => void;
  onNavigateTo?: (page: string) => void;
  density: 'compact' | 'standard' | 'large';
  onChangeDensity: (d: 'compact' | 'standard' | 'large') => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  isDesktopViewport?: boolean;
  onToggleViewportMode?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  globalSearch, 
  setGlobalSearch, 
  articles, 
  currentSite,
  onSearchFocus,
  onOpenMenu,
  onNavigateToForensic,
  onNavigateTo,
  density,
  onChangeDensity,
  isDarkMode = false,
  onToggleDarkMode,
  isDesktopViewport = true,
  onToggleViewportMode
}) => {
  const { 
    collectSystemMetrics, 
    dlq, 
    networkQuality, 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead 
  } = useInventory();

  const [notifOpen, setNotifOpen] = React.useState(false);
  const [filterType, setFilterType] = React.useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');

  const siteNotifications = React.useMemo(() => {
    return (notifications || []).filter(n => n.siteId === currentSite);
  }, [notifications, currentSite]);

  const unreadCount = React.useMemo(() => {
    return siteNotifications.filter(n => !n.isRead).length;
  }, [siteNotifications]);

  const hasUnreadCritical = React.useMemo(() => {
    return siteNotifications.some(n => (n.severity === 'CRITICAL' || n.type === 'CRITICAL') && !n.isRead);
  }, [siteNotifications]);

  const filteredNotifications = React.useMemo(() => {
    const list = filterType === 'ALL'
      ? siteNotifications
      : siteNotifications.filter(n => n.type === filterType || n.severity === filterType);
    
    // Priority valuation helper
    const getPriorityScore = (n: any) => {
      const severity = n.severity || n.type || 'INFO';
      if (severity === 'CRITICAL') return 3;
      if (severity === 'WARNING') return 2;
      return 1;
    };

    return [...list].sort((a, b) => {
      const pA = getPriorityScore(a);
      const pB = getPriorityScore(b);
      if (pA !== pB) {
        return pB - pA; // CRITICAL first
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [siteNotifications, filterType]);

  const siteArticles = articles.filter(a => a.site === currentSite);
  const totalValue = siteArticles.reduce((sum, a) => sum + (a.quantity * a.price), 0);

  const metrics = collectSystemMetrics();
  const unresolvedDLQCount = dlq.filter((e: any) => e.status === 'PENDING').length;

  return (
    <div className="max-w-[1600px] mx-auto mb-3 no-print">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-white/40 backdrop-blur-3xl p-1.5 rounded-xl border border-white shadow-xl shadow-slate-200/30">
        <div className="flex items-center gap-2 flex-1">
          <button 
            onClick={onOpenMenu}
            className="lg:hidden w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-sky-600 transition-colors shadow-sm"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="relative flex-1 group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors" />
            <div className="h-3 w-[1px] bg-slate-200" />
          </div>
          <input 
            type="text" 
            placeholder="Recherche Rapide..."
            className="w-full bg-white/80 h-10 pl-14 pr-8 rounded-xl text-sm font-bold outline-none border border-slate-100 focus:border-sky-200 transition-all focus:ring-4 focus:ring-sky-500/5 placeholder:text-slate-300"
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              if (e.target.value.length >= 2) {
                onSearchFocus();
              }
            }}
          />
        </div>
      </div>
        
        <div className="flex items-center gap-2 px-1">
          {/* DISCREET INDUSTRIAL SRE TELEMETRY BLOCK */}
          <div 
            onClick={onNavigateToForensic}
            className={`hidden md:flex items-center gap-2.5 mr-2 px-3 py-1.5 bg-slate-100/85 hover:bg-slate-200/80 active:scale-[0.98] border border-slate-200/50 rounded-lg text-[10px] font-mono select-none cursor-pointer transition-all`}
          >
            <div className="flex items-center gap-1 text-slate-500">
              <Activity className="w-3 h-3 text-slate-400" />
              <span className="font-extrabold uppercase">SOCI:</span>
            </div>

            <div className="flex items-center gap-1 text-slate-500 mr-1" title="Qualité Réseau de Surface">
              <span className="text-[10px] font-extrabold text-slate-400">NET:</span>
              <span className={`px-1 py-0.5 rounded text-[8px] font-black ${
                networkQuality === 'ONLINE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                networkQuality === 'HIGH_LATENCY' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                networkQuality === 'INTERMITTENT' ? 'bg-yellow-50 text-yellow-600 border border-yellow-105' :
                networkQuality === 'RECOVERING' ? 'bg-sky-50 text-sky-600 border border-sky-100 animate-pulse' :
                'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse'
              }`}>
                {networkQuality}
              </span>
            </div>

            <div className="h-3 w-[1px] bg-slate-300" />

            <div className="flex items-center gap-1" title="Statut de Synchronisation Master">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                metrics.reconnectStormStatus ? 'bg-red-500 animate-ping' :
                metrics.queueDepth > 0 ? 'bg-amber-400' : 'bg-emerald-500'
              }`} />
              <span className="text-slate-600 font-bold uppercase" title={`${metrics.queueDepth} opérations en attente`}>
                {metrics.reconnectStormStatus ? 'STORM' : metrics.queueDepth > 0 ? 'SYNCING' : 'OK'}
              </span>
            </div>

            <div className="h-3 w-[1px] bg-slate-300" />

            {/* Queue depth */}
            <div className="flex items-center gap-0.5" title="File de transmission FIFO">
              <span className="text-slate-400">Q:</span>
              <span className={`font-black ${metrics.queueDepth > 0 ? 'text-amber-500 font-extrabold' : 'text-slate-600'}`}>
                {metrics.queueDepth}
              </span>
            </div>

            <div className="h-3 w-[1px] bg-slate-300" />

            {/* Confidence metric */}
            <div className="flex items-center gap-0.5" title="Indicateur de cohérence globale">
              <span className="text-slate-400">CONF:</span>
              <span className={`font-extrabold ${
                metrics.confidenceMode === 'NORMAL' ? 'text-emerald-600' :
                metrics.confidenceMode === 'DEGRADED' ? 'text-yellow-600' : 'text-rose-600'
              }`}>
                {Math.round(metrics.confidenceScore * 100)}%
              </span>
            </div>

            {unresolvedDLQCount > 0 && (
              <>
                <div className="h-3 w-[1px] bg-slate-300" />
                <div className="flex items-center gap-0.5 bg-red-15 text-red-500 font-extrabold px-1 rounded animate-pulse" title="Alerte DLQ unresolvable">
                  <span>DLQ:{unresolvedDLQCount}</span>
                </div>
              </>
            )}
          </div>

          {/* SEGMENTED LAYOUT DENSITY SWITCHER */}
          <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 font-mono text-[9px] font-black select-none pointer-events-auto shadow-inner gap-0.5" title="Densité d'affichage">
            <SlidersHorizontal className="w-2.5 h-2.5 text-slate-400 mx-1.5" />
            <button
              onClick={() => onChangeDensity('compact')}
              className={`px-1.5 py-0.5 rounded text-[8px] transition-all duration-150 ${
                density === 'compact' 
                  ? 'bg-white text-sky-600 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200/30 font-black' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Compact (Option par défaut)"
            >
              CPT
            </button>
            <button
              onClick={() => onChangeDensity('standard')}
              className={`px-1.5 py-0.5 rounded text-[8px] transition-all duration-150 ${
                density === 'standard' 
                  ? 'bg-white text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200/30' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Standard"
            >
              STD
            </button>
            <button
              onClick={() => onChangeDensity('large')}
              className={`px-1.5 py-0.5 rounded text-[8px] transition-all duration-150 ${
                density === 'large' 
                  ? 'bg-white text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200/30' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Large"
            >
              LRG
            </button>
          </div>

          <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden md:block" />

          {/* VIEWPORT SCALING MODE TOGGLE */}
          {onToggleViewportMode && (
            <button
              onClick={onToggleViewportMode}
              className={cn(
                "px-2.5 py-1.5 rounded-xl border transition-all active:scale-95 flex items-center gap-1.5 pointer-events-auto text-[9px] font-black uppercase tracking-wider shadow-sm bg-white cursor-pointer hover:border-slate-350",
                isDesktopViewport 
                  ? "bg-sky-50/70 text-sky-700 border-sky-200/80 hover:bg-sky-100/50" 
                  : "bg-slate-50/50 text-slate-500 border-slate-200 hover:bg-slate-100/50"
              )}
              title={isDesktopViewport ? "Passer à la version mobile standard" : "Forcer la version ordinateur (Recommandé)"}
            >
              <span className="relative flex h-1.5 w-1.5">
                {isDesktopViewport ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-400"></span>
                )}
              </span>
              {isDesktopViewport ? <Monitor className="w-3.5 h-3.5 text-sky-600 hidden sm:block" /> : <Smartphone className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />}
              <span>{isDesktopViewport ? 'Mode Bureau' : 'Mode Mobile'}</span>
            </button>
          )}

          <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden md:block" />

          {/* NIGHT MODE TOGGLE */}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="p-1.5 md:p-2 rounded-xl text-slate-500 hover:text-sky-600 hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center pointer-events-auto border border-slate-100/70 hover:border-slate-200 bg-white shadow-sm"
              title={isDarkMode ? "Activer le mode jour" : "Activer le mode nuit"}
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
          )}

          <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden md:block" />

          {/* FACEBOOK STYLE NOTIFICATION BELL */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className={`relative p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center pointer-events-auto ${
                hasUnreadCritical 
                  ? "text-rose-600 bg-rose-50 border border-rose-300 shadow animate-pulse" 
                  : "text-slate-500 hover:text-sky-600 hover:bg-slate-50"
              }`}
              id="notification-bell"
            >
              <Bell className={`w-5 h-5 ${unreadCount > 0 ? "text-rose-600" : ""} ${hasUnreadCritical ? "animate-bounce" : ""}`} />
              {unreadCount > 0 && (
                <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 text-[8px] font-black text-white rounded-full min-w-4 h-4 flex items-center justify-center border-2 border-white shadow-sm ${
                  hasUnreadCritical ? "bg-red-650 animate-ping" : "bg-red-500"
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div 
                className="absolute right-0 mt-2.5 w-80 md:w-96 bg-white border border-slate-150 rounded-2xl shadow-2xl z-50 overflow-hidden text-slate-700 animate-slide-up"
                id="notification-dropdown"
              >
                {/* Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-sky-500" /> Notifications ({currentSite})
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold">Flux opérationnel filtré</p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllNotificationsAsRead(currentSite)}
                      className="text-[10px] font-extrabold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1 pointer-events-auto"
                    >
                      <CheckSquare className="w-3.5 h-3.5" /> Tout marquer lu
                    </button>
                  )}
                </div>

                {/* Filter chips */}
                <div className="px-3 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto">
                  <button
                    onClick={() => setFilterType('ALL')}
                    className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase transition-all ${
                      filterType === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-200/60 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    Tout ({siteNotifications.length})
                  </button>
                  <button
                    onClick={() => setFilterType('CRITICAL')}
                    className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase transition-all ${
                      filterType === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100/50'
                    }`}
                  >
                    Urgent
                  </button>
                  <button
                    onClick={() => setFilterType('WARNING')}
                    className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase transition-all ${
                      filterType === 'WARNING' ? 'bg-amber-500 text-amber-950' : 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100/50'
                    }`}
                  >
                    Alerte
                  </button>
                  <button
                    onClick={() => setFilterType('INFO')}
                    className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase transition-all ${
                      filterType === 'INFO' ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100/50'
                    }`}
                  >
                    Opérations
                  </button>
                </div>

                {/* Notification Items */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                        <Check className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Site en sécurité</p>
                      <p className="text-[10px] text-slate-400">Aucune notification {filterType !== 'ALL' ? `de type "${filterType}"` : ""} enregistrée.</p>
                    </div>
                  ) : (
                    filteredNotifications.map((notif) => {
                      const isUnread = !notif.isRead;
                      return (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationAsRead(notif.id);
                            setNotifOpen(false);
                            if (notif.actionRoute && onNavigateTo) {
                              onNavigateTo(notif.actionRoute);
                            }
                          }}
                          className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer select-none text-left ${
                            isUnread ? 'bg-sky-50/40 hover:bg-sky-50/80 font-semibold' : 'hover:bg-slate-50'
                          }`}
                        >
                           {/* Left severity indicator icon */}
                          <div className="mt-0.5">
                            {notif.severity === 'CRITICAL' || notif.type === 'CRITICAL' ? (
                              <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg shadow-sm border border-rose-250 animate-pulse">
                                <ShieldAlert className="w-4 h-4 animate-bounce" />
                              </div>
                            ) : notif.severity === 'WARNING' || notif.type === 'WARNING' ? (
                              <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg shadow-sm border border-amber-250">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                            ) : notif.severity === 'SYSTEM' ? (
                              <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg shadow-sm border border-purple-250">
                                <ShieldAlert className="w-4 h-4 text-purple-600" />
                              </div>
                            ) : (
                              <div className="p-1.5 bg-sky-100 text-sky-600 rounded-lg shadow-sm border border-sky-250">
                                <Info className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          {/* Center Content */}
                          <div className="flex-1 space-y-1 min-w-0">
                            <div className="flex items-center justify-between gap-2.5">
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                notif.category === 'STOCK' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                notif.category === 'TRANSFER' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                notif.category === 'SYNC' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                                notif.category === 'DAILY' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-500'
                              }`}>
                                {notif.category}
                              </span>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                              )}
                            </div>
                            <p className="text-xs text-slate-700 leading-snug break-words">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(notif.timestamp).toLocaleString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden md:block" />
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none opacity-70">Valeur Stock</p>
            <p className="text-sm font-black text-slate-900 mt-0.5">
              {formatCurrency(totalValue).split(',')[0]}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-black text-xs shadow-inner">
            {siteArticles.length}
          </div>
        </div>
      </div>
    </div>
  );
};
