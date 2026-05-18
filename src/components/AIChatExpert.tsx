import React from 'react';
import { Send, Sparkles, User, Brain, Bot, Wrench, Shield, ChevronRight, AlertCircle } from 'lucide-react';
import { SiteCode, Article } from '../types';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatExpertProps {
  site: SiteCode;
  articles: Article[];
}

export function AIChatExpert({ site, articles }: AIChatExpertProps) {
  const [messages, setMessages] = React.useState<Message[]>([
    { 
      role: 'assistant', 
      content: "Bonjour ! Je suis l'expert IA dédié à l'univers Hydromines. Spécialiste des opérations minières souterraines et des équipements Montabert, je vous accompagne dans la gestion de stock et la maintenance technique de votre parc engins. Posez-moi vos questions !" 
    }
  ]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: {
            site,
            articleCount: articles.length,
            lowStockCount: articles.filter(a => a.quantity <= a.minStock).length,
            examples: articles.slice(0, 10).map(a => ({ ref: a.ref, name: a.designation, qty: a.quantity, min: a.minStock }))
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur Serveur (HTML retourné au lieu de JSON)" }));
        throw new Error(errorData.details || errorData.error || `HTTP Error ${response.status}`);
      }

      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Gemini Chat Error:', error);
      const errorMessage = error instanceof Error ? error.message : "Erreur technique";
      let displayMessage = "Désolé, j'ai rencontré une erreur technique.";
      
      if (errorMessage.includes("GEMINI_API_KEY")) {
        displayMessage = "L'Expert Gemini n'est pas configuré (Clé API manquante).";
      } else if (errorMessage.includes("Unexpected token") || errorMessage.includes("JSON") || errorMessage.includes("HTML")) {
        displayMessage = "Erreur de communication : Le serveur a envoyé une réponse invalide. Vérifiez la configuration de déploiement.";
      } else if (errorMessage.includes("503") || errorMessage.includes("busy")) {
        displayMessage = "Le service AI est surchargé. Retentez dans quelques instants.";
      } else {
        displayMessage = `Erreur : ${errorMessage}`;
      }
      
      setMessages([...newMessages, { role: 'assistant', content: displayMessage }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Quelles sont les pièces critiques pour un Montabert T23 ?",
    "Donne-moi les références des joints hydrauliques en stock.",
    "Comment optimiser le rangement des forets de 3m ?",
    "Vérifie les niveaux de stock critiques pour le site " + site
  ];

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex items-center justify-between gap-6 pb-6 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-100">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 block">ASSISANT Hydromines app</span>
            <h2 className="text-4xl font-black text-slate-950 tracking-tighter uppercase leading-none">Expert Gemini</h2>
            <p className="text-sm text-indigo-600 font-black uppercase tracking-[0.1em] mt-2 flex items-center gap-2">
               <Sparkles className="w-4 h-4" /> Spécialiste Mines & Maintenance
            </p>
          </div>
        </div>

        <div className="hidden md:flex gap-4">
          <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
             <Wrench className="w-4 h-4 text-slate-400" />
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Support PERFORATEURS - ENGINS</span>
          </div>
          <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
             <Shield className="w-4 h-4 text-slate-400" />
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Procédures Sécurité</span>
          </div>
        </div>
      </header>
      
      {/* Professional Notification Banner */}
      <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none mb-1">Information Utilisation & Quotas</h4>
            <p className="text-sm font-bold text-amber-900/80 leading-tight">
              Pour une performance optimale, formulez des requêtes précises. <span className="text-amber-700">Relais automatique actif :</span> En cas de forte affluence, l'IA bascule sur un moteur de secours pour garantir la continuité du service.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scroll-smooth"
          >
            {messages.map((msg, i) => (
              <div 
                key={`${i}-${msg.role}`} 
                className={cn(
                  "flex items-start gap-4 max-w-[85%] animate-in fade-in slide-in-from-bottom-2",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shrink-0 shadow-lg",
                  msg.role === 'assistant' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                )}>
                  {msg.role === 'assistant' ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}
                </div>
                <div className={cn(
                  "p-6 rounded-[1.5rem] text-base md:text-lg font-bold leading-relaxed",
                  msg.role === 'assistant' 
                    ? "bg-indigo-50/50 text-slate-800 rounded-tl-none border border-indigo-100/50" 
                    : "bg-slate-900 text-white rounded-tr-none shadow-xl shadow-slate-200"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shrink-0">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="p-6 rounded-[1.5rem] bg-indigo-50/50 border border-indigo-100/50 flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-indigo-400 font-black text-sm uppercase tracking-widest">Réflexion...</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/30">
            <div className="relative">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Votre question à l'expert (ex: Maintenance T23, Stock, Procédures...)"
                className="w-full h-16 md:h-20 bg-white border-2 border-indigo-100 rounded-3xl pl-8 pr-28 text-lg md:text-xl font-black text-slate-900 focus:border-indigo-600 outline-none shadow-2xl shadow-indigo-100/20 transition-all"
              />
              <button 
                type="submit"
                disabled={loading || !input.trim()}
                className="absolute right-3 top-3 bottom-3 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                <span className="hidden md:inline font-black uppercase text-xs tracking-widest">Envoyer</span>
              </button>
            </div>
          </form>
        </div>

        {/* Suggestions Sidebar */}
        <div className="hidden lg:block w-80 space-y-6">
          <div className="card p-8 bg-indigo-900 text-white border-none shadow-2xl">
            <h4 className="text-xl font-black uppercase tracking-widest mb-6 border-l-4 border-l-white pl-4">Suggestions</h4>
            <div className="space-y-4">
              {suggestions.map((suggestion, i) => (
                <button 
                  key={`suggestion-${i}`}
                  onClick={() => setInput(suggestion)}
                  className="w-full text-left p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all text-sm font-bold leading-snug group flex items-start gap-3"
                >
                  <ChevronRight className="w-4 h-4 mt-0.5 text-indigo-400 group-hover:text-white transition-colors flex-shrink-0" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6 border-slate-100 bg-white">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Base de Connaissances</h5>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-600 uppercase">Documents Techniques</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-600 uppercase">Catalogue Hydromines</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  );
}
