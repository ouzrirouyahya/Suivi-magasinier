import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { SITE_CODES } from '../../lib/constants';
import { InboxItem, MessageDraft, UserAccount, SiteCode, UserRole, MessageAttachment } from '../../types';
import { 
  Send, 
  Save, 
  User, 
  Globe, 
  ShieldAlert, 
  MapPin, 
  Paperclip, 
  CornerDownRight, 
  X,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface MessageComposerProps {
  onSend: (payload: any) => Promise<void>;
  onSaveDraft: (draft: any) => Promise<string | void>;
  replyTo?: InboxItem;
  initialDraft?: MessageDraft;
  accounts: UserAccount[];
}

export default function MessageComposer({
  onSend,
  onSaveDraft,
  replyTo,
  initialDraft,
  accounts
}: MessageComposerProps) {
  const { currentUser } = useAuthStore();

  // Core fields
  const [targetType, setTargetType] = useState<'INDIVIDUAL' | 'SITE' | 'ROLE' | 'ALL'>('INDIVIDUAL');
  const [selectedIndividual, setSelectedIndividual] = useState('');
  const [selectedSite, setSelectedSite] = useState<SiteCode | 'ALL'>('ALL');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'ALL'>('ALL');
  
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  
  // Attachments
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [attachmentNameInput, setAttachmentNameInput] = useState('');
  const [attachmentUrlInput, setAttachmentUrlInput] = useState('');
  const [showAttachmentForm, setShowAttachmentForm] = useState(false);

  // Draft state
  const [draftId, setDraftId] = useState<string | undefined>(initialDraft?.id);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [timeSinceSave, setTimeSinceSave] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Email autocomplete suggestions
  const [emailSuggestions, setEmailSuggestions] = useState<UserAccount[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Initialize reply
  useEffect(() => {
    if (replyTo) {
      setTargetType('INDIVIDUAL');
      const originalSender = accounts.find(a => a.id === replyTo.senderId || a.email === replyTo.senderId);
      setSelectedIndividual(originalSender?.email || replyTo.senderId);
      setSubject(replyTo.subject.startsWith('RE:') ? replyTo.subject : `RE: ${replyTo.subject}`);
      setPriority(replyTo.priority);
    }
  }, [replyTo, accounts]);

  // Initialize draft
  useEffect(() => {
    if (initialDraft) {
      setDraftId(initialDraft.id);
      setSubject(initialDraft.subject || '');
      setBody(initialDraft.body || '');
      setPriority((initialDraft as any).priority || 'NORMAL');
      if (initialDraft.attachments) {
        setAttachments(initialDraft.attachments);
      }
    }
  }, [initialDraft]);

  // Handle autocomplete matching
  useEffect(() => {
    if (targetType === 'INDIVIDUAL' && selectedIndividual.trim().length > 1) {
      const filtered = accounts.filter(acc => 
        (acc.email && acc.email.toLowerCase().includes(selectedIndividual.toLowerCase())) ||
        (acc.name && acc.name.toLowerCase().includes(selectedIndividual.toLowerCase()))
      );
      setEmailSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setEmailSuggestions([]);
      setShowSuggestions(false);
    }
  }, [selectedIndividual, targetType, accounts]);

  // Timer to display relative saved time
  useEffect(() => {
    if (!lastSaved) return;
    const interval = setInterval(() => {
      const seconds = Math.round((Date.now() - lastSaved.getTime()) / 1000);
      if (seconds < 5) {
        setTimeSinceSave("à l'instant");
      } else if (seconds < 60) {
        setTimeSinceSave(`il y a ${seconds}s`);
      } else {
        const mins = Math.floor(seconds / 60);
        setTimeSinceSave(`il y a ${mins}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSaved]);

  // Auto-save logic (debounced at 3 seconds)
  useEffect(() => {
    if (!onSaveDraft) return;
    // Don't auto-save if completely blank
    if (!subject.trim() && !body.trim()) return;

    const timeout = setTimeout(async () => {
      await handleSaveDraft(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [subject, body, priority, targetType, selectedIndividual, selectedSite, selectedRole, attachments]);

  const handleSaveDraft = async (isAuto = false) => {
    if (isSaving || isSending) return;
    setIsSaving(true);
    try {
      const draftPayload: any = {
        id: draftId,
        senderId: currentUser?.email || currentUser?.id || 'anonymous',
        subject: subject,
        body: body,
        priority: priority,
        targetType: targetType,
        attachments: attachments,
        updatedAt: new Date().toISOString()
      };

      if (targetType === 'INDIVIDUAL') {
        draftPayload.targetUserEmail = selectedIndividual;
      } else if (targetType === 'SITE') {
        draftPayload.targetSite = selectedSite;
      } else if (targetType === 'ROLE') {
        draftPayload.targetRole = selectedRole;
      }

      const returnedId = await onSaveDraft(draftPayload);
      if (returnedId && typeof returnedId === 'string') {
        setDraftId(returnedId);
      }
      setLastSaved(new Date());
      setTimeSinceSave("à l'instant");
      if (!isAuto) {
        toast.success('Brouillon enregistré');
      }
    } catch (err: any) {
      console.error('Error saving draft:', err);
      if (!isAuto) {
        toast.error(`Erreur d'enregistrement: ${err.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;

    // Validations
    if (!subject.trim()) {
      toast.error('Le sujet est obligatoire');
      return;
    }
    if (!body.trim()) {
      toast.error('Le message ne peut pas être vide');
      return;
    }

    // Determine recipient list based on target type
    let finalRecipients: { userId: string; userEmail: string; name: string }[] = [];

    if (targetType === 'INDIVIDUAL') {
      if (!selectedIndividual.trim()) {
        toast.error('Veuillez spécifier un destinataire');
        return;
      }
      // Look up target account
      const matched = accounts.find(a => a.email.toLowerCase() === selectedIndividual.toLowerCase() || a.id === selectedIndividual);
      if (matched) {
        finalRecipients = [{ userId: matched.email, userEmail: matched.email, name: matched.name }];
      } else {
        // Fallback if typed manually
        finalRecipients = [{ userId: selectedIndividual, userEmail: selectedIndividual, name: selectedIndividual.split('@')[0] }];
      }
    } else if (targetType === 'SITE') {
      const matches = accounts.filter(a => selectedSite === 'ALL' || a.assignedSite === selectedSite);
      if (matches.length === 0) {
        toast.error(`Aucun utilisateur trouvé sur le site ${selectedSite}`);
        return;
      }
      finalRecipients = matches.map(m => ({ userId: m.email, userEmail: m.email, name: m.name }));
    } else if (targetType === 'ROLE') {
      const matches = accounts.filter(a => selectedRole === 'ALL' || a.role === selectedRole);
      if (matches.length === 0) {
        toast.error(`Aucun utilisateur trouvé avec le rôle ${selectedRole}`);
        return;
      }
      finalRecipients = matches.map(m => ({ userId: m.email, userEmail: m.email, name: m.name }));
    } else if (targetType === 'ALL') {
      finalRecipients = accounts.map(a => ({ userId: a.email, userEmail: a.email, name: a.name }));
    }

    if (finalRecipients.length === 0) {
      toast.error('Aucun destinataire valide pour ce ciblage');
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        threadId: replyTo?.threadId || crypto.randomUUID(),
        parentId: replyTo?.messageId || undefined,
        senderId: currentUser?.email || 'system',
        senderName: currentUser?.name || 'Système',
        senderRole: currentUser?.role || 'OPERATEUR',
        senderSite: currentUser?.assignedSite || SITE_CODES[0],
        subject: subject,
        body: body,
        priority: priority,
        recipients: finalRecipients,
        attachments: attachments,
        status: 'ACTIVE' as const,
        createdBy: currentUser?.email || 'system'
      };

      await onSend(payload);
      toast.success('Message envoyé avec succès !');
      
      // Reset forms
      setSubject('');
      setBody('');
      setAttachments([]);
      setSelectedIndividual('');
    } catch (err: any) {
      toast.error(`Erreur d'envoi: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const addAttachment = () => {
    if (!attachmentNameInput.trim() || !attachmentUrlInput.trim()) {
      toast.error('Veuillez remplir le nom et l\'URL de la pièce jointe');
      return;
    }
    const newAttachment: MessageAttachment = {
      id: crypto.randomUUID(),
      fileName: attachmentNameInput,
      originalUrl: attachmentUrlInput,
      mimeType: attachmentUrlInput.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
      sizeBytes: 1024 * 50,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser?.email || 'user'
    };
    setAttachments(prev => [...prev, newAttachment]);
    setAttachmentNameInput('');
    setAttachmentUrlInput('');
    setShowAttachmentForm(false);
    toast.success('Pièce jointe ajoutée');
  };

  return (
    <div className="bg-[#0f2038]/70 border border-slate-800 rounded-xl p-5 shadow-lg" id="message-composer-container">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <h4 className="text-[#d4af37] font-bold text-base flex items-center gap-2">
          {replyTo ? 'Répondre au message' : 'Nouveau Message'}
        </h4>
        {replyTo && (
          <span className="text-xs bg-amber-950/40 text-[#d4af37] px-2 py-0.5 rounded border border-amber-900/30 flex items-center gap-1">
            <CornerDownRight className="w-3.5 h-3.5" />
            Fil de discussion
          </span>
        )}
      </div>

      {replyTo && (
        <div className="mb-4 bg-slate-900/40 border-l-2 border-slate-600 p-3 rounded text-xs text-slate-400 italic whitespace-pre-wrap">
          <p className="font-semibold text-slate-300 not-italic mb-1">
            De : {replyTo.senderName} ({replyTo.senderRole}) • {replyTo.subject}
          </p>
          {replyTo.body}
        </div>
      )}

      <form onSubmit={handleSend} className="space-y-4">
        {/* Targeting criteria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">À qui ?</label>
            <div className="flex gap-1 bg-slate-950 p-1 rounded border border-slate-800">
              {(['INDIVIDUAL', 'SITE', 'ROLE', 'ALL'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTargetType(type)}
                  className={`flex-1 text-[10px] font-bold py-1 px-1.5 rounded transition cursor-pointer ${
                    targetType === type ? 'bg-[#d4af37] text-[#0a1628]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {type === 'INDIVIDUAL' ? 'Individu' : type === 'SITE' ? 'Site' : type === 'ROLE' ? 'Rôle' : 'Tous'}
                </button>
              ))}
            </div>
          </div>

          <div>
            {targetType === 'INDIVIDUAL' && (
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email du Destinataire</label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded px-3">
                  <User className="w-3.5 h-3.5 text-slate-400 mr-2" />
                  <input
                    type="text"
                    value={selectedIndividual}
                    onChange={(e) => setSelectedIndividual(e.target.value)}
                    placeholder="Saisissez un nom ou email..."
                    className="w-full bg-transparent py-1.5 text-xs text-white focus:outline-none"
                    onFocus={() => setShowSuggestions(true)}
                  />
                </div>

                {/* Suggestions Autocomplete dropdown */}
                {showSuggestions && emailSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#0a1628] border border-slate-800 rounded shadow-xl max-h-40 overflow-y-auto z-50">
                    {emailSuggestions.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setSelectedIndividual(acc.email);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-white hover:bg-[#d4af37] hover:text-[#0a1628] transition border-b border-slate-900 last:border-0"
                      >
                        <div className="font-semibold">{acc.name}</div>
                        <div className="text-[10px] opacity-80">{acc.email} ({acc.role})</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {targetType === 'SITE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Sélectionner un Site</label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded px-3">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mr-2" />
                  <select
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value as any)}
                    className="w-full bg-transparent py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tous les chantiers (ALL)</option>
                    <option value="SMI">SMI</option>
                    <option value="ST2D">ST2D</option>
                    <option value="ST2G">ST2G</option>
                    <option value="ST7">ST7</option>
                    <option value="T23">T23</option>
                    <option value="T28">T28</option>
                  </select>
                </div>
              </div>
            )}

            {targetType === 'ROLE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Sélectionner un Rôle</label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded px-3">
                  <Globe className="w-3.5 h-3.5 text-slate-400 mr-2" />
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="w-full bg-transparent py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tous les rôles (ALL)</option>
                    <option value="SUPER_ADMIN">Super Administrateur</option>
                    <option value="ADMIN">Administrateur</option>
                    <option value="MAGASINIER">Magasinier</option>
                    <option value="RESPONSABLE_CHANTIER">Responsable de Chantier</option>
                    <option value="AGREE_FORAGE">Agréé Forage</option>
                    <option value="OPERATEUR">Opérateur</option>
                  </select>
                </div>
              </div>
            )}

            {targetType === 'ALL' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Destinataires</label>
                <div className="bg-slate-900/50 border border-slate-800 rounded px-3 py-1.5 text-xs text-amber-500 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  <span>Tous les utilisateurs inscrits de la plateforme</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Subject & Priority */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-300 mb-1">Objet / Sujet</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Sujet de votre message..."
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Priorité</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37] cursor-pointer"
            >
              <option value="LOW">Basse (LOW)</option>
              <option value="NORMAL">Normale (NORMAL)</option>
              <option value="HIGH">Haute (HIGH)</option>
              <option value="URGENT">Urgente (URGENT)</option>
            </select>
          </div>
        </div>

        {/* Message body */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-semibold text-slate-300">Message</label>
            <span className={`text-[10px] ${body.length > 9500 ? 'text-red-500' : 'text-slate-500'}`}>
              {body.length} / 10 000 caract.
            </span>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 10000))}
            placeholder="Rédigez votre message ici..."
            rows={5}
            className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
            required
          />
        </div>

        {/* Attachments Section */}
        {attachments.length > 0 && (
          <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pièces Jointes</h5>
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center bg-slate-800 text-xs px-2.5 py-1 rounded border border-slate-700 text-white gap-2">
                  <Paperclip className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>{file.fileName}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                    className="hover:text-red-500 text-slate-400 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachment form popover/trigger */}
        <div className="pt-1">
          {showAttachmentForm ? (
            <div className="bg-slate-900 p-3 rounded border border-[#d4af37]/30 space-y-2 max-w-sm">
              <div className="text-[10px] font-bold text-[#d4af37]">Ajouter un Document Média</div>
              <input
                type="text"
                placeholder="Nom du fichier..."
                value={attachmentNameInput}
                onChange={(e) => setAttachmentNameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none"
              />
              <input
                type="text"
                placeholder="URL du document (http...)"
                value={attachmentUrlInput}
                onChange={(e) => setAttachmentUrlInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAttachmentForm(false)}
                  className="px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-300 hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={addAttachment}
                  className="px-2 py-1 bg-[#d4af37] text-[#0a1628] font-bold rounded text-[10px] cursor-pointer"
                >
                  Confirmer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAttachmentForm(true)}
              className="text-xs text-[#d4af37] hover:text-[#bfa032] flex items-center gap-1 cursor-pointer hover:underline"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Joindre un document ou schéma</span>
            </button>
          )}
        </div>

        {/* Sub-bar / Draft status indicator */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pt-3 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            {lastSaved ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Brouillon sauvegardé {timeSinceSave}
              </span>
            ) : (
              <span className="text-slate-500">Auto-sauvegarde active</span>
            )}
          </div>

          <div className="flex gap-2 w-full md:w-auto justify-end">
            <button
              type="button"
              disabled={isSaving || isSending}
              onClick={() => handleSaveDraft(false)}
              className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-md transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer Brouillon</span>
            </button>

            <button
              type="submit"
              disabled={isSending || isSaving}
              className="flex items-center justify-center gap-2 px-4 py-1.5 bg-[#d4af37] hover:bg-[#bfa032] text-[#0a1628] text-xs font-bold rounded-md transition cursor-pointer disabled:opacity-50"
              id="send-message-submit-btn"
            >
              {isSending ? (
                <div className="w-3.5 h-3.5 border-2 border-[#0a1628] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Envoyer le Message</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
