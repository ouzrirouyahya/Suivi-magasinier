import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBanners } from '../../hooks/useBanners';
import { useAuthStore } from '../../stores/auth.store';
import { bannerService } from '../../services/banner.service';
import { SITE_CODES } from '../../lib/constants';
import { 
  Bell, 
  AlertTriangle, 
  Zap, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Shield, 
  Plus, 
  Calendar,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

export default function BannerCarousel() {
  const { banners, currentBanner, currentIndex, total, dismiss, next, prev } = useBanners();
  const { currentUser } = useAuthStore();
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Form states for quick creation inside the modal
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [newSites, setNewSites] = useState<string[]>(['ALL']);
  const [newRoles, setNewRoles] = useState<string[]>(['ALL']);
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [isDismissible, setIsDismissible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (total === 0 || !currentBanner) return null;

  // Priority color/styling mappings
  const priorityStyles = {
    LOW: {
      bg: 'bg-slate-900/95 backdrop-blur border-b border-slate-700/50',
      icon: <Bell className="w-5 h-5 text-slate-400" />,
      accent: 'border-l-4 border-slate-500'
    },
    NORMAL: {
      bg: 'bg-blue-950/95 backdrop-blur border-b border-blue-800/50',
      icon: <Bell className="w-5 h-5 text-blue-400" />,
      accent: 'border-l-4 border-blue-500'
    },
    HIGH: {
      bg: 'bg-amber-950/95 backdrop-blur border-b border-amber-800/50',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      accent: 'border-l-4 border-amber-500'
    },
    URGENT: {
      bg: 'bg-red-950/95 backdrop-blur border-b border-red-800/50',
      icon: <Zap className="w-5 h-5 text-red-400 animate-pulse" />,
      accent: 'border-l-4 border-red-500 animate-pulse'
    }
  };

  const style = priorityStyles[currentBanner.priority] || priorityStyles.NORMAL;

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) {
      toast.error('Veuillez remplir le titre et le corps');
      return;
    }

    setIsSubmitting(true);
    try {
      const email = currentUser?.email || 'admin@hydromines.com';
      await bannerService.createBanner({
        title: newTitle,
        body: newBody,
        priority: newPriority,
        targetSites: newSites as any[],
        targetRoles: newRoles as any[],
        startDate: new Date(newStartDate).toISOString(),
        endDate: new Date(newEndDate).toISOString(),
        dismissible: isDismissible,
        status: 'ACTIVE',
        createdBy: email
      });
      toast.success('Bannière créée avec succès !');
      setIsAdminModalOpen(false);
      // Reset form
      setNewTitle('');
      setNewBody('');
    } catch (err: any) {
      toast.error(`Erreur de création: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUserAdmin = currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN');

  return (
    <>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        role="region"
        aria-label="Annonces Hydromines"
        aria-live="polite"
        className={`fixed top-[56px] left-0 right-0 z-40 flex items-center justify-between px-4 py-3 text-white transition-all ${style.bg} ${style.accent}`}
        id="banner-carousel-container"
      >
        <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
          <div className="flex-shrink-0">{style.icon}</div>
          
          {currentBanner.imageUrl && (
            <img 
              src={currentBanner.imageUrl} 
              alt="media" 
              className="w-10 h-10 object-cover rounded border border-slate-700 flex-shrink-0"
              referrerPolicy="no-referrer"
            />
          )}

          <div className="text-sm overflow-hidden text-ellipsis">
            <span className="font-bold text-[#d4af37] mr-2">
              {currentBanner.title}
            </span>
            <span className="text-slate-200">
              {currentBanner.body.length > 120 ? `${currentBanner.body.slice(0, 120)}...` : currentBanner.body}
            </span>
          </div>

          {isUserAdmin && (
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="ml-3 flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-slate-800 text-[#d4af37] border border-[#d4af37]/30 hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
              id="admin-banner-badge"
            >
              <Shield className="w-3 h-3" />
              <span>Admin</span>
            </button>
          )}
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {total > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/50 px-2 py-1 rounded-md border border-slate-700/30">
              <button 
                onClick={prev} 
                type="button"
                aria-label="Annonce précédente"
                className="hover:text-[#d4af37] disabled:opacity-30 cursor-pointer"
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>{currentIndex + 1} / {total}</span>
              <button 
                onClick={next} 
                type="button"
                aria-label="Annonce suivante"
                className="hover:text-[#d4af37] disabled:opacity-30 cursor-pointer"
                disabled={currentIndex === total - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {currentBanner.dismissible && (
            <button
              onClick={() => dismiss(currentBanner.id)}
              type="button"
              aria-label="Fermer cette annonce"
              className="p-1 hover:bg-slate-800 rounded-md transition text-slate-300 hover:text-white cursor-pointer"
              title="Fermer"
              id={`dismiss-btn-${currentBanner.id}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Admin Quick Banner Modal */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0a1628] border border-[#d4af37]/40 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6"
              id="admin-banner-modal"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#d4af37]" />
                  <h3 className="text-lg font-bold text-white">Gestionnaire de Bannières</h3>
                </div>
                <button
                  onClick={() => setIsAdminModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBanner} className="space-y-4 text-white">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Titre de la Bannière</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Alerte Forage ST2D"
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Message</label>
                  <textarea
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="Saisissez les détails de la notification..."
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Priorité</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="LOW">Basse (LOW)</option>
                      <option value="NORMAL">Normale (NORMAL)</option>
                      <option value="HIGH">Haute (HIGH)</option>
                      <option value="URGENT">Urgente (URGENT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Fermable par l'utilisateur ?</label>
                    <div className="flex items-center h-10">
                      <input
                        type="checkbox"
                        id="is-dismissible-cb"
                        checked={isDismissible}
                        onChange={(e) => setIsDismissible(e.target.checked)}
                        className="w-4 h-4 accent-[#d4af37] bg-slate-900 border-slate-700 rounded text-[#d4af37]"
                      />
                      <label htmlFor="is-dismissible-cb" className="ml-2 text-sm text-slate-300 cursor-pointer">
                        Oui, dismissible
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Date de début</label>
                    <input
                      type="date"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Date de fin</label>
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Sites visés</label>
                    <select
                      multiple
                      value={newSites}
                      onChange={(e) => {
                        const vals = Array.from(e.target.selectedOptions, option => option.value);
                        setNewSites(vals);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-[#d4af37] h-20"
                    >
                      <option value="ALL">Tous les sites</option>
                      {SITE_CODES.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400">Maintenez Ctrl/Cmd pour multi-sélection</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Rôles visés</label>
                    <select
                      multiple
                      value={newRoles}
                      onChange={(e) => {
                        const vals = Array.from(e.target.selectedOptions, option => option.value);
                        setNewRoles(vals);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-[#d4af37] h-20"
                    >
                      <option value="ALL">Tous les rôles</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MAGASINIER">Magasinier</option>
                      <option value="RESPONSABLE_CHANTIER">Resp. Chantier</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-4 bg-[#d4af37] hover:bg-[#bfa032] text-[#0a1628] font-bold py-2 px-4 rounded-md transition duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-[#0a1628] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Publier la Bannière</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
