import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  db
} from '../../lib/db';
import { useInventory } from '../../context/InventoryContext';
import { Message, MessageTelemetry, BannerNotification } from '../../types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  BarChart2, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  Tv, 
  Filter, 
  Trash2, 
  Play, 
  Pause, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function TelemetryDashboard() {
  const { currentUser } = useInventory();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // State collections
  const [messages, setMessages] = useState<Message[]>([]);
  const [telemetry, setTelemetry] = useState<MessageTelemetry[]>([]);
  const [banners, setBanners] = useState<BannerNotification[]>([]);
  const [bannerViews, setBannerViews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters for messages table
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<string>('30'); // '7', '30', 'ALL'
  const [deleteBannerConfirmId, setDeleteBannerConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch telemetry/analytics data on load
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const fetchViews = async () => {
        try {
          return await getDocs(collection(db, 'bannerViews'));
        } catch {
          return { docs: [] };
        }
      };

      const [msgSnap, telSnap, bannerSnap, viewsSnap] = await Promise.all([
        getDocs(collection(db, 'messages')),
        getDocs(collection(db, 'messageTelemetry')),
        getDocs(collection(db, 'bannerNotifications')),
        fetchViews()
      ]);

      const loadedMessages = msgSnap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      const loadedTelemetry = telSnap.docs.map(d => ({ id: d.id, ...d.data() as any } as MessageTelemetry));
      const loadedBanners = bannerSnap.docs.map(d => ({ id: d.id, ...d.data() as any } as BannerNotification));
      const loadedViews = viewsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

      setMessages(loadedMessages);
      setTelemetry(loadedTelemetry);
      setBanners(loadedBanners);
      setBannerViews(loadedViews);
    } catch (err) {
      console.error('[TelemetryDashboard] Failed to fetch data:', err);
      toast.error('Erreur lors du chargement des données de télémétrie');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format dynamic duration nicely (e.g., 2min 30s)
  const formatDuration = (totalSeconds?: number) => {
    if (totalSeconds === undefined || isNaN(totalSeconds)) return 'N/A';
    if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.round(totalSeconds % 60);
    return `${mins}min ${secs}s`;
  };

  // --- SECTION 1: GLOBAL METRICS ---
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const messagesSentThisMonth = messages.filter(m => m.createdAt && m.createdAt.startsWith(currentMonthPrefix)).length;

  // Read rate calculations across all messages with recipients
  const messagesWithRecipients = messages.filter(m => m.recipients && m.recipients.length > 0);
  const totalReadPercentSum = messagesWithRecipients.reduce((acc, m) => {
    const totalRecipients = m.recipients?.length || 0;
    const readCount = m.recipients?.filter(r => r.status === 'READ').length || 0;
    const rate = totalRecipients > 0 ? (readCount / totalRecipients) * 100 : 0;
    return acc + rate;
  }, 0);
  const averageReadRate = messagesWithRecipients.length > 0 
    ? Math.round(totalReadPercentSum / messagesWithRecipients.length) 
    : 0;

  // Average read time calculation based on recipients who have read the message
  let totalReadTimeSeconds = 0;
  let readTimeCount = 0;
  messages.forEach(m => {
    m.recipients?.forEach(r => {
      if (r.status === 'READ' && r.timeSpentSeconds !== undefined && r.timeSpentSeconds > 0) {
        totalReadTimeSeconds += r.timeSpentSeconds;
        readTimeCount++;
      }
    });
  });
  const averageReadTime = readTimeCount > 0 ? totalReadTimeSeconds / readTimeCount : undefined;

  const activeBannersCount = banners.filter(b => b.status === 'ACTIVE').length;


  // --- SECTION 2: MESSAGING ACTIVITY CHART (LAST 7 DAYS) ---
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  });

  const chartData = last7Days.map(dateStr => {
    const displayDate = dateStr.split('-').slice(1).reverse().join('/'); // DD/MM

    // Sent on this day
    const sentCount = messages.filter(m => m.createdAt && m.createdAt.startsWith(dateStr)).length;

    // Opened on this day (from telemetry event MESSAGE_OPENED)
    const readCount = telemetry.filter(t => 
      t.eventType === 'MESSAGE_OPENED' && t.timestamp && t.timestamp.startsWith(dateStr)
    ).length;

    return {
      name: displayDate,
      "Messages Envoyés": sentCount,
      "Messages Lus": readCount
    };
  });


  // --- SECTION 3: RECENT MESSAGES TABLE & FILTERING ---
  const handleToggleBannerStatus = async (bannerId: string, currentStatus: string) => {
    if (!isSuperAdmin) {
      toast.error('Action réservée aux Super Administrateurs');
      return;
    }
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await updateDoc(doc(db, 'bannerNotifications', bannerId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      toast.success(`Bannière ${newStatus === 'ACTIVE' ? 'activée' : 'suspendue'} avec succès`);
      fetchData();
    } catch (err) {
      console.error('[TelemetryDashboard] Failed to update banner:', err);
      toast.error('Erreur lors de la modification de la bannière');
    }
  };

  const handleDeleteBanner = (bannerId: string) => {
    if (!isSuperAdmin) {
      toast.error('Action réservée aux Super Administrateurs');
      return;
    }
    setDeleteBannerConfirmId(bannerId);
  };

  const handleConfirmDeleteBanner = async () => {
    if (!deleteBannerConfirmId || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'bannerNotifications', deleteBannerConfirmId));
      toast.success('Bannière supprimée avec succès');
      fetchData();
    } catch (err) {
      console.error('[TelemetryDashboard] Failed to delete banner:', err);
      toast.error('Erreur lors de la suppression de la bannière');
    } finally {
      setIsDeleting(false);
      setDeleteBannerConfirmId(null);
    }
  };

  // Apply filters to messages table
  const filteredMessages = messages.filter(m => {
    // Site filter
    if (siteFilter !== 'ALL') {
      if (m.senderSite !== siteFilter && !m.recipients?.some(r => r.site === siteFilter)) {
        return false;
      }
    }

    // Priority filter
    if (priorityFilter !== 'ALL' && m.priority !== priorityFilter) {
      return false;
    }

    // Period filter (days)
    if (periodFilter !== 'ALL') {
      const days = parseInt(periodFilter);
      if (m.createdAt) {
        const msgDate = new Date(m.createdAt);
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - days);
        if (msgDate < limitDate) return false;
      }
    }

    return true;
  });


  // --- SECTION 5: HEATMAP "HEURES D'ACTIVITÉ" (7 Days x 24 Hours) ---
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const heatmapGrid = Array.from({ length: 7 }, () => Array(24).fill(0));

  telemetry.forEach(t => {
    if (t.eventType === 'MESSAGE_OPENED' && t.timestamp) {
      const d = new Date(t.timestamp);
      const day = d.getDay(); // 0 (Sun) - 6 (Sat)
      const hour = d.getHours(); // 0 - 23
      if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
        heatmapGrid[day][hour]++;
      }
    }
  });

  // Find max value for scaling intensity colors
  let maxHeat = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (heatmapGrid[d][h] > maxHeat) {
        maxHeat = heatmapGrid[d][h];
      }
    }
  }

  const getHeatmapColor = (value: number) => {
    if (value === 0) return 'bg-slate-50 hover:bg-slate-100 border border-slate-100/50 text-slate-400';
    if (maxHeat === 0) return 'bg-amber-50 text-amber-500';
    const ratio = value / maxHeat;
    if (ratio < 0.25) return 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200/50';
    if (ratio < 0.5) return 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300/40 font-semibold';
    if (ratio < 0.75) return 'bg-[#d4af37]/30 text-slate-900 font-bold hover:bg-[#d4af37]/45 border border-[#d4af37]/30';
    return 'bg-[#d4af37]/80 text-slate-950 font-black animate-pulse border border-[#d4af37]';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold uppercase tracking-wider">Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-800" id="telemetry-dashboard-container">
      
      {/* SECTION 1: GLOBAL METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Sent Messages */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:border-slate-300 transition" id="metric-sent-messages">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-600">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Envois (ce mois)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{messagesSentThisMonth}</p>
          </div>
        </div>

        {/* Card 2: Read Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:border-slate-300 transition" id="metric-read-rate">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Taux de Lecture</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{averageReadRate}%</p>
          </div>
        </div>

        {/* Card 3: Read Time */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:border-slate-300 transition" id="metric-read-time">
          <div className="p-3 bg-amber-50 border border-[#d4af37]/30 rounded-lg text-[#8c7017]">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Temps de Lecture Moyen</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{formatDuration(averageReadTime)}</p>
          </div>
        </div>

        {/* Card 4: Active Banners */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:border-slate-300 transition" id="metric-active-banners">
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg text-purple-600">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Bannières Actives</p>
            <p className="text-2xl font-black text-purple-700 mt-1">{activeBannersCount}</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Messages Sent vs Messages Read */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#d4af37]" />
              Activité de la Messagerie (7 derniers jours)
            </h3>
            <span className="text-[10px] text-slate-500 font-mono bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
              Temps Réel
            </span>
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#1e293b' }} 
                  labelStyle={{ color: '#64748b', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Messages Envoyés" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSent)" />
                <Area type="monotone" dataKey="Messages Lus" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRead)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Summary or Help note */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-purple-500" />
              Rapport d'Audience
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed space-y-2">
              Ce tableau de bord fournit une télémétrie complète et anonymisée sur l'efficacité des communications de l'entreprise. 
              <br/><br/>
              Il permet de suivre la vitesse de diffusion des messages de sécurité ou des ordres logistiques auprès des magasiniers et responsables de chantiers sur les sites miniers.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mt-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Total messages archivés</span>
              <span className="font-mono text-[#8c7017] font-bold">
                {messages.reduce((acc, m) => acc + (m.recipients?.filter(r => r.status === 'ARCHIVED').length || 0), 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Taux de réponse moyen</span>
              <span className="font-mono text-blue-600 font-bold">
                {messages.length > 0 
                  ? Math.round((messages.filter(m => m.parentId).length / messages.length) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: HEATMAP "HEURES D'ACTIVITÉ" */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4" id="telemetry-activity-heatmap">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#d4af37]" />
            Heures d'Activité (Ouverture des Messages)
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Filtre : Heure locale magazinier
          </span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[800px] select-none">
            {/* Hours Header Row */}
            <div className="gap-1 mb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(25, minmax(0, 1fr))' }}>
              <div className="col-span-1 text-slate-500 text-[10px] uppercase font-bold flex items-center">Jour</div>
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="text-center text-slate-500 text-[10px] font-mono">
                  {String(h).padStart(2, '0')}h
                </div>
              ))}
            </div>

            {/* Days Rows */}
            <div className="space-y-1">
              {dayNames.map((dayName, dIndex) => (
                <div key={dayName} className="gap-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(25, minmax(0, 1fr))' }}>
                  <div className="col-span-1 text-slate-700 text-[11px] font-semibold truncate pr-1 flex items-center">
                    {dayName.slice(0, 3)}.
                  </div>
                  {Array.from({ length: 24 }).map((_, hIndex) => {
                    const val = heatmapGrid[dIndex][hIndex];
                    return (
                      <div
                        key={hIndex}
                        className={`h-8 rounded flex items-center justify-center text-[10px] font-mono transition duration-150 ${getHeatmapColor(val)}`}
                        title={`${dayName} à ${hIndex}h : ${val} ouverture(s) de message`}
                      >
                        {val > 0 && val}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 pt-2 text-xs text-slate-500 justify-end">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-50 border border-slate-200"></span>
            <span>Inactif</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200"></span>
            <span>Faible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span>
            <span>Moyen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#d4af37] border border-[#d4af37]/30"></span>
            <span>Intense</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: RECENT MESSAGES TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6" id="telemetry-recent-messages">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            Messages Récents &amp; Taux d'Ouverture
          </h3>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select 
                value={siteFilter} 
                onChange={(e) => setSiteFilter(e.target.value)}
                className="bg-transparent border-none text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tous les Sites</option>
                <option value="SMI">SMI</option>
                <option value="SML">SML</option>
                <option value="MOK">MOK</option>
                <option value="HMC">HMC (Mère)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
              <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
              <select 
                value={priorityFilter} 
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent border-none text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Toutes Priorités</option>
                <option value="LOW">Basse</option>
                <option value="NORMAL">Normale</option>
                <option value="HIGH">Haute</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <select 
                value={periodFilter} 
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="bg-transparent border-none text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="7">7 derniers jours</option>
                <option value="30">30 derniers jours</option>
                <option value="ALL">Tout l'historique</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                <th className="py-3 px-4">Expéditeur</th>
                <th className="py-3 px-4">Destinataires ciblé(s)</th>
                <th className="py-3 px-4">Sujet</th>
                <th className="py-3 px-4 text-center">Priorité</th>
                <th className="py-3 px-4 text-center">Taux lecture</th>
                <th className="py-3 px-4 text-right">Date d'Envoi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold italic">
                    Aucun message trouvé selon vos critères de filtrage.
                  </td>
                </tr>
              ) : (
                filteredMessages.map(m => {
                  const totRecipients = m.recipients?.length || 0;
                  const readCount = m.recipients?.filter(r => r.status === 'READ').length || 0;
                  const readRate = totRecipients > 0 ? Math.round((readCount / totRecipients) * 100) : 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/55 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{m.senderName}</div>
                        <div className="text-[10px] text-slate-500 font-semibold font-mono uppercase">
                          {m.senderRole} | {m.senderSite}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="max-w-[200px] truncate">
                          {m.targetType === 'ALL' && <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">TOUS (Diff.)</span>}
                          {m.targetType === 'SITE' && <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">SITE: {m.targetSite}</span>}
                          {m.targetType === 'ROLE' && <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-[#d4af37]/30">ROLE: {m.targetRole}</span>}
                          {m.targetType === 'INDIVIDUAL' && <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">INDIVIDUEL</span>}
                          {totRecipients > 0 && (
                            <span className="text-[10px] ml-1.5 text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                              {totRecipients} pers.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-700 line-clamp-1">{m.subject}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          m.priority === 'URGENT' ? 'bg-red-50 text-red-700 border border-red-200' :
                          m.priority === 'HIGH' ? 'bg-amber-50 text-amber-800 border border-[#d4af37]/30' :
                          m.priority === 'LOW' ? 'bg-slate-50 text-slate-500 border border-slate-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {m.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#d4af37] h-full rounded-full" style={{ width: `${readRate}%` }}></div>
                          </div>
                          <span className="font-bold font-mono min-w-[32px] text-right text-slate-700">{readRate}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500 font-mono text-[11px]">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: BANNERS TABLE (ADMIN ONLY) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6" id="telemetry-banners-management">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-4">
          <Tv className="w-4 h-4 text-[#d4af37]" />
          Gestion des Bannières Administratives
        </h3>

        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                <th className="py-3 px-4">Titre de la Bannière</th>
                <th className="py-3 px-4">Sites ciblés</th>
                <th className="py-3 px-4">Période de Diffusion</th>
                <th className="py-3 px-4 text-center">Vues</th>
                <th className="py-3 px-4 text-center">Dismissals</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Actions (SuperAdmin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {banners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold italic">
                    Aucune bannière administrative active ou programmée.
                  </td>
                </tr>
              ) : (
                banners.map(b => {
                  // Count total views & dismissals for this banner from bannerViews state
                  const totalViews = bannerViews.filter(v => v.bannerId === b.id).length;
                  const totalDismissals = bannerViews.filter(v => v.bannerId === b.id && v.dismissedAt).length;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/55 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {b.title}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {b.targetSites?.map(s => (
                            <span key={s} className="bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        Du {b.startDate ? new Date(b.startDate).toLocaleDateString('fr-FR') : 'N/A'} <br/>
                        Au {b.endDate ? new Date(b.endDate).toLocaleDateString('fr-FR') : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold font-mono text-[#8c7017]">
                        {totalViews}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold font-mono text-slate-500">
                        {totalDismissals}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          b.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          b.status === 'PAUSED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-50 text-slate-500 border border-slate-200'
                        }`}>
                          {b.status === 'ACTIVE' ? 'ACTIF' : 'PAUSE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggleBannerStatus(b.id, b.status)}
                            disabled={!isSuperAdmin}
                            className={`p-1 text-xs rounded transition duration-150 flex items-center justify-center ${
                              !isSuperAdmin ? 'opacity-30 cursor-not-allowed' :
                              b.status === 'ACTIVE'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 cursor-pointer'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                            }`}
                            title={b.status === 'ACTIVE' ? 'Mettre en pause' : 'Réactiver'}
                          >
                            {b.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleDeleteBanner(b.id)}
                            disabled={!isSuperAdmin}
                            className={`p-1 text-xs rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition duration-150 flex items-center justify-center ${
                              !isSuperAdmin ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title="Supprimer la bannière"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteBannerConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center 
                        bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-red-700/50 
                          rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-black text-lg mb-2">
              Supprimer la bannière ?
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Cette bannière sera supprimée définitivement.
              Les utilisateurs ne la verront plus.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => !isDeleting && setDeleteBannerConfirmId(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white 
                           rounded-lg font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDeleteBanner}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white 
                           rounded-lg font-black transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
