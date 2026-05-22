/**
 * PHASE v12.0 - INDUSTRIAL AUTOMATION, INTELLIGENT WORKFLOWS & EXECUTIVE ORCHESTRATION CONSOLE
 * Core: Smart Recommendations, Automated Pipeline states, Daily/Weekly Executive Reports,
 *       Smart Procurement Wizard, Reconciliation wizards, Task priority algorithms, and Actionable Notifications
 * Style: Hyper-premium glassmorphism, NASA-grade deep dark layout, neon indicators.
 */

import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { SiteCode, Article, Mouvement, PurchaseRequest, AppNotification, Transfert } from '../types';
import { 
  Cpu, Zap, Sparkles, ShieldAlert, ArrowRight, CheckCircle2, Play, AlertTriangle, 
  RotateCcw, ArrowDownLeft, ArrowUpRight, TrendingUp, BarChart3, Users, 
  FileSpreadsheet, ClipboardList, Send, Loader2, Layers, Check, X, Shield,
  FileCheck, FileDown, Eye, AlertCircle, Info, Activity, Clock, RefreshCw, ChevronRight, HelpCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

// Core types for phase 12 simulation states
interface SmartRecommendation {
  id: string;
  type: 'TRANSFER' | 'REPLENISH' | 'CORRECTION' | 'CYCLE_COUNT' | 'DORMANT_REDUSTRIBUTE';
  title: string;
  description: string;
  impactScore: number;
  priority: 'CRITICAL' | 'HIGH' | 'MED' | 'LOW';
  sourceSite: SiteCode;
  targetSite?: SiteCode;
  skuRef?: string;
  quantityProposed?: number;
  status: 'PENDING' | 'EXECUTING' | 'EXECUTED' | 'DISMISSED';
}

interface WorkflowItem {
  id: string;
  type: 'APPROVAL' | 'TRANSFER_VALIDATION' | 'ANOMALY_REVIEW' | 'CORRECTION_VAL' | 'EMERGENCY_ALLOCATION';
  title: string;
  description: string;
  state: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'ESCALATED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  initiator: string;
  site: SiteCode;
  sku?: string;
  quantity?: number;
  forensicLogs: string[];
  votedUser?: string;
  createdAt: string;
}

interface ReconciliationWizard {
  id: string;
  title: string;
  type: 'MISMATCH' | 'DISPUTE' | 'DLQ' | 'SYNC' | 'PHYSICAL_DRIFT';
  description: string;
  site: SiteCode;
  sku: string;
  currentStep: number;
  steps: {
    label: string;
    description: string;
    completed: boolean;
    requireAction?: boolean;
    actionLabel?: string;
  }[];
  isCompleted: boolean;
}

interface AuditReport {
  id: string;
  title: string;
  type: 'DAILY_OP' | 'WEEKLY_ANOMALY' | 'MONTHLY_PRESSURE' | 'TRANSFER_IMBALANCE' | 'DISCIPLINE_AUDIT';
  dateRange: string;
  summaryText: string;
  stats: { label: string; value: string | number; change?: string }[];
  operatorRankings?: { name: string; score: number; actions: number }[];
  imbalances?: { item: string; ratio: string; recommended: string }[];
  downloadName: string;
}

export default function AutomationOrchestrator() {
  const { 
    articles, 
    mouvements, 
    transferts, 
    purchaseRequests, 
    dlq = [], 
    currentUser, 
    saveArticle, 
    addNotification,
    notifications = []
  } = useInventory();

  // Active section
  const [activeSegment, setActiveSegment] = useState<'DECISION' | 'WORKFLOWS' | 'REPORTS' | 'PROCUREMENT' | 'RECONCILE' | 'TASKS' | 'KPI'>('DECISION');
  
  // Site filter for overall view
  const [globalSite, setGlobalSite] = useState<SiteCode | 'ALL'>('ALL');

  // Interactive recommendations simulation state
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([
    {
      id: 'rec-1',
      type: 'TRANSFER',
      title: 'Transfertl d\'équilibre inter-sites',
      description: 'Transférer 12 filtres à huile hydrauliques (SKU FH-5201) de Oumejrane (surplus: 45) vers SMI (sous-stock: 2).',
      impactScore: 92,
      priority: 'CRITICAL',
      sourceSite: 'OUMEJRANE',
      targetSite: 'SMI',
      skuRef: 'FH-5201',
      quantityProposed: 12,
      status: 'PENDING'
    },
    {
      id: 'rec-2',
      type: 'REPLENISH',
      title: 'Approvisionnement d\'urgence requis',
      description: 'Lancer un achat groupé de Plaquettes de Frein Dumper (SKU PF-900) pour Bou-Azzer. Le stock actuel (1) est nul vis-à-vis du minimum (8).',
      impactScore: 88,
      priority: 'CRITICAL',
      sourceSite: 'BOU-AZZER',
      skuRef: 'PF-900',
      quantityProposed: 10,
      status: 'PENDING'
    },
    {
      id: 'rec-3',
      type: 'CORRECTION',
      title: 'Ajustement d\'inventaire suggéré',
      description: 'Ajustement physique recommandé sur le consommable Gazole - Site Oumejrane. Une divergence de +120L a été relevée à l\'étape du pointage du pistolet.',
      impactScore: 78,
      priority: 'HIGH',
      sourceSite: 'OUMEJRANE',
      skuRef: 'GAZ-920',
      quantityProposed: 120,
      status: 'PENDING'
    },
    {
      id: 'rec-4',
      type: 'DORMANT_REDUSTRIBUTE',
      title: 'Redistribution de Capital Dormant imobilisé',
      description: 'Redistribuer 40 lampes de mineur frontales (SKU LF-80) stockées depuis 120 jours sans mouvement à SMI vers Bou-Azzer.',
      impactScore: 65,
      priority: 'MED',
      sourceSite: 'SMI',
      targetSite: 'BOU-AZZER',
      skuRef: 'LF-80',
      quantityProposed: 40,
      status: 'PENDING'
    },
    {
      id: 'rec-5',
      type: 'CYCLE_COUNT',
      title: 'Comptage tournant suggéré',
      description: 'Faire un pointage tournant sur le Flexible Joint Haute Température (SKU HTJ-011) suite à 4 corrections contraires des opérateurs en 5 jours.',
      impactScore: 82,
      priority: 'HIGH',
      sourceSite: 'BOU-AZZER',
      skuRef: 'HTJ-011',
      status: 'PENDING'
    }
  ]);

  // Interactive workflows simulation state
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([
    {
      id: 'wf-401',
      type: 'TRANSFER_VALIDATION',
      title: 'Validation de transfert SMI -> Bou-Azzer',
      description: 'Vérification réglementaire de déplacement de 15 Pompes Hydrauliques à Pistons (Valeur élevée: 12,500€).',
      state: 'PENDING',
      priority: 'CRITICAL',
      initiator: 'Yahya Ouzrir',
      site: 'SMI',
      sku: 'PHP-12',
      quantity: 15,
      createdAt: '2026-05-22T08:30:00Z',
      forensicLogs: [
        '[08:30] Créé par Yahya O. (Magasinier SMI).',
        '[08:31] Validateur automatique : Cohérence de stock validée.',
        '[08:32] Transit asynchrone enregistré en file d\'attente locale.'
      ]
    },
    {
      id: 'wf-402',
      type: 'ANOMALY_REVIEW',
      title: 'Enquête Anomaly Pattern - Dumper DM-03',
      description: 'Fréquence démesurée de remplacement d\'alternateurs (+300% au-delà de la moyenne flotte).',
      state: 'UNDER_REVIEW',
      priority: 'HIGH',
      initiator: 'Diagnostic Engine v12.0',
      site: 'OUMEJRANE',
      sku: 'ALT-45',
      createdAt: '2026-05-21T14:15:00Z',
      forensicLogs: [
        '[21:15] Détection anomalies par le module Abnormal Consumption Engine.',
        '[21:16] Lié à l\'opérateur mécanicien principal Ahmed K.',
        '[22:00] Statut configuré : Sous-enquête terrain.'
      ]
    },
    {
      id: 'wf-403',
      type: 'EMERGENCY_ALLOCATION',
      title: 'Réquisition Critique de Matériel de Sécurité',
      description: 'Allocation immédiate de 50 casques antibruit renforcés d\'un dépôt auxiliaire vers la zone de sondage de Bou-Azzer.',
      state: 'APPROVED',
      priority: 'CRITICAL',
      initiator: 'Système d\'Alerte de Stock',
      site: 'BOU-AZZER',
      sku: 'CAB-99',
      quantity: 50,
      createdAt: '2026-05-22T10:00:00Z',
      forensicLogs: [
        '[10:00] Capteur sonore souterrain dépasse le seuil critique (Alerte OMS).',
        '[10:02] Réquisition autorisée sous signature électronique.',
        '[10:15] Approuvé par le Superviseur.'
      ]
    },
    {
      id: 'wf-404',
      type: 'CORRECTION_VAL',
      title: 'Approbation Ajustement Manuel de Stock supérieur au seuil',
      description: 'Correction de -35 filtres (Modèle FH-100) à SMI après audit tournant.',
      state: 'ESCALATED',
      priority: 'MEDIUM',
      initiator: 'Karim Ait',
      site: 'SMI',
      sku: 'FH-100',
      quantity: 35,
      createdAt: '2026-05-20T09:12:00Z',
      forensicLogs: [
        '[09:12] Karim A. sollicite un ajustement de -35 filtres.',
        '[09:13] Écart financier > 500€ détecté. Blocage automatique.',
        '[09:15] Escaladé vers la hiérarchie pour contrôle physique.'
      ]
    }
  ]);

  // Interactive Step-by-step Reconciliation Wizards state
  const [reconciliationWizards, setReconciliationWizards] = useState<ReconciliationWizard[]>([
    {
      id: 'rec-wiz-1',
      title: 'Divergence Pointage / Logiciel SMI',
      type: 'MISMATCH',
      description: 'Écart sévère sur le SKU Joint d\'étanchéité souple DUMPER (Theoric: 42 u., Physique: 28 u.).',
      site: 'SMI',
      sku: 'JES-82',
      currentStep: 0,
      isCompleted: false,
      steps: [
        { label: 'Re-comptage direct', description: 'Mandater un opérateur SMI équipé de son terminal mobile de re-comptage pour vérifier le rayon B-12.', completed: false, requireAction: true, actionLabel: 'Vérifier Terrain' },
        { label: 'Calculer les bons volants', description: 'Agréger les sorties en suspens n\'ayant pas encore été déversées sur Cloud.', completed: false },
        { label: 'Reconstitution chronologique', description: 'Analyser si des sorties ont été effectuées sans être saisies temporairement.', completed: false },
        { label: 'Appliquer correction', description: 'Déclencher la mise à jour finale du stock réel.', completed: false, requireAction: true, actionLabel: 'Corriger avec Validation de l\'Agent' }
      ]
    },
    {
      id: 'rec-wiz-2',
      title: 'Résolution de conflit DLQ Sync',
      type: 'DLQ',
      description: 'Le paquet d\'opération de sortie de Bou-Azzer a échoué en file à cause d\'un lock concurrent.',
      site: 'BOU-AZZER',
      sku: 'ALT-10',
      currentStep: 0,
      isCompleted: false,
      steps: [
        { label: 'Analyser Payload JSON', description: 'Inspecter les anomalies de corruption de données cryptographiques.', completed: false, requireAction: true, actionLabel: 'Visualiser Schema' },
        { label: 'Résoudre doublons cryptographiques', description: 'Générer un nouvel identifiant d\'intention unique lié au ledger.', completed: false },
        { label: 'Re-déverser paquet', description: 'Forcer la transmission vers la transaction en base de données.', completed: false, requireAction: true, actionLabel: 'Injecter' }
      ]
    }
  ]);

  // Custom actionable notification center simulation
  const [customNotifications, setCustomNotifications] = useState<any[]>([
    {
      id: 'c-not-1',
      title: 'Demande d\'approbation de transfert urgent',
      message: 'TRF-9092 : SMI sollicite 10 raccordements flexibles pour pelle EX-02.',
      actionType: 'APPROVE_TRANSFER',
      entityId: 'TRF-9092',
      status: 'PENDING'
    },
    {
      id: 'c-not-2',
      title: 'Anomalie de sur-consommation identifiée',
      message: 'Suspicion d\'abus sur l\'huile moteur par le mécanicien M-04 à Oumejrane.',
      actionType: 'LAUNCH_INVESTIGATION',
      entityId: 'wf-402',
      status: 'PENDING'
    },
    {
      id: 'c-not-3',
      title: 'Pointage de sécurité DLQ requis',
      message: 'Incident réseau bloquant sur le site Bou-Azzer. Concurrence d\'écriture détectée.',
      actionType: 'RESOLVE_DLQ',
      entityId: 'rec-wiz-2',
      status: 'PENDING'
    }
  ]);

  // Generate mock Executive Audit Reports
  const auditReportsArchive = useMemo<AuditReport[]>(() => {
    return [
      {
        id: 'rep-daily',
        title: 'Rapport Journalier Opérationnel d\'Inventaire',
        type: 'DAILY_OP',
        dateRange: 'Aujourd\'hui (22 Mai 2026)',
        summaryText: 'Activité globale forte. Volume d\'opérations soutenu à SMI. Détection de 2 déséquilibres légers résorbés de manière autonome.',
        stats: [
          { label: 'Transactions validées', value: mouvements.length, change: '+12%' },
          { label: 'Écart de saisies', value: '0.4%', change: 'Amélioré' },
          { label: 'Stock total valorisé', value: `${articles.reduce((acc, a) => acc + (a.quantity * (a.price || 42)), 0).toLocaleString()} €` }
        ],
        downloadName: 'Rapport_Journalier_Hydromines_22052026.pdf'
      },
      {
        id: 'rep-weekly',
        title: 'Bilan Hebdomadaire des Anomalies et Usures',
        type: 'WEEKLY_ANOMALY',
        dateRange: 'Deuxième Quinzaine (15 - 22 Mai 2026)',
        summaryText: 'Enquête approfondie sur l\'usure mécanique à Oumejrane. 3 anomalies de duplication de sortie isolées.',
        stats: [
          { label: 'Double consommations', value: '4 cas décelés' },
          { label: 'Taux corrections manuelles', value: '14.2%', change: '-3% vs S-1' },
          { label: 'Alertes critiques de sécurité', value: '1 non résolue' }
        ],
        downloadName: 'Bilan_Hebdomadaire_Anomalies_V12.pdf'
      },
      {
        id: 'rep-imbalance',
        title: 'Diagnostic de Pression et Déséquilibres de site',
        type: 'TRANSFER_IMBALANCE',
        dateRange: 'Mois en cours (Mai 2026)',
        summaryText: 'SMI présente un excédent de stock dormant (22% de volume inactif). Oumejrane est en souscapacité pour les pièces hydrauliques critiques.',
        stats: [
          { label: 'Taux de réponse transfert', value: '94.2%' },
          { label: 'Perte de stockage estimée', value: '2,400 € / mois' },
          { label: 'Friction de transport inter-sites', value: '2.1 jours' }
        ],
        imbalances: [
          { item: 'Lampe Frontale LF-80', ratio: 'SMI (95% sur-stock) vs Bou-Azzer (0%)', recommended: 'Transférer 40 u.' },
          { item: 'Flexible FH-5201', ratio: 'Oumejrane (surplus) vs SMI (critique)', recommended: 'Transférer 12 u.' }
        ],
        downloadName: 'Diagnostic_Déséquilibres_Mois_Mai.pdf'
      },
      {
        id: 'rep-discipline',
        title: 'Index d\'Intégrité & Discipline des Opérateurs',
        type: 'DISCIPLINE_AUDIT',
        dateRange: 'Rétrospective Trimestrielle',
        summaryText: 'Taux de conformité des relevés de fin de quart évalué à 96.5% de moyenne. Rigueur élevée de l\'équipe Bou-Azzer.',
        stats: [
          { label: 'Remplissage des motifs', value: '100% requis', change: 'Atteint' },
          { label: 'Erreurs de pointage physique', value: '12 incidents' },
          { label: 'Répétitions injustifiées', value: '0.8%' }
        ],
        operatorRankings: [
          { name: 'Youssef Taghi', score: 98, actions: 120 },
          { name: 'Ahmed Karim', score: 92, actions: 145 },
          { name: 'Karim Ait', score: 85, actions: 98 }
        ],
        downloadName: 'Index_Discipline_Operating_Trim.xlsx'
      }
    ];
  }, [mouvements, articles]);

  // Priority scoring logic for task items (Operational priority engine)
  const priorityTasks = useMemo(() => {
    const list: {
      id: string;
      title: string;
      priorityScore: number; // calculated 0-100
      urgency: 'CRITICAL' | 'HIGH' | 'MED';
      description: string;
      category: 'SHORTAGE' | 'ANOMALY' | 'DISPUTE' | 'SYNC' | 'APPROVAL';
      actionLabel: string;
    }[] = [];

    // Shortages
    const criticalShortages = articles.filter(a => a.quantity <= a.minStock);
    criticalShortages.slice(0, 3).forEach(c => {
      list.push({
        id: `tsk-sh-${c.id}`,
        title: `Rupture critique : SKU ${c.ref}`,
        priorityScore: Math.round(95 - (c.quantity * 5)),
        urgency: c.quantity === 0 ? 'CRITICAL' : 'HIGH',
        description: `L'article ${c.designation} (${c.site}) est passé en dessous du stock minimum. Stock actuel: ${c.quantity}.`,
        category: 'SHORTAGE',
        actionLabel: 'Lancer un réapprovisionnement'
      });
    });

    // Pending approvals
    const pendingWfs = workflows.filter(w => w.state === 'PENDING' || w.state === 'UNDER_REVIEW');
    pendingWfs.forEach(p => {
      list.push({
        id: `tsk-wf-${p.id}`,
        title: `Validation d'opération : ${p.title}`,
        priorityScore: p.priority === 'CRITICAL' ? 90 : 75,
        urgency: p.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        description: `${p.description} initié par ${p.initiator}.`,
        category: 'APPROVAL',
        actionLabel: 'Statuer d\'urgence'
      });
    });

    // DLQ instances
    if (dlq.length > 0) {
      list.push({
        id: 'tsk-dlq-system',
        title: `Résidu de synchronisation réseau (${dlq.length} pannes)`,
        priorityScore: 88,
        urgency: 'CRITICAL',
        description: `Erreur SRE asynchrone interceptée. Données bloquées en tampon local.`,
        category: 'SYNC',
        actionLabel: 'Forcer la purge du DLQ'
      });
    }

    // Sort by priorityScore descending
    return list.sort((a, b) => b.priorityScore - a.priorityScore);
  }, [articles, workflows, dlq]);

  // SMART PROCUREMENT ASSISTANT DYNAMIC LOGIC
  const procurementSuggestions = useMemo(() => {
    return articles.filter(a => a.quantity <= a.minStock + 1).map(art => {
      const quantityToOrder = Math.max(5, (art.minStock * 2) - art.quantity);
      const riskLevel: 'MAXIMUM' | 'MODERATE' | 'LOW' = art.quantity === 0 ? 'MAXIMUM' : art.quantity < art.minStock ? 'MODERATE' : 'LOW';
      const estimatedCost = quantityToOrder * (art.price || 42);
      
      return {
        id: art.id,
        ref: art.ref,
        designation: art.designation,
        site: art.site,
        currentStock: art.quantity,
        minStock: art.minStock,
        recommendedOrder: quantityToOrder,
        riskLevel,
        estimatedCost,
        urgencyDays: art.quantity === 0 ? 'IMMÉDIAT' : art.quantity < art.minStock ? '2 jours' : '5 jours'
      };
    }).sort((a, b) => (a.currentStock === 0 ? -1 : 1));
  }, [articles]);

  // ADVANCED INDUSTRIAL KPIS ORCHESTRATION DATA
  const industryKPIs = useMemo(() => {
    // operational efficiency = moves / total items
    const efficiency = Math.min(100, Math.round((mouvements.length / articles.length) * 105));
    // stock coherence = (1 - variance of adjustments)
    const adjustmentsCount = mouvements.filter(m => m.type === 'AJUSTEMENT').length;
    const coherence = Math.max(45, Math.round(100 - (adjustmentsCount * 8)));
    // transfer performance
    const transferPerformance = Math.min(100, Math.round(92 + Math.random() * 5));
    // sync health
    const syncHealth = Math.round(Math.max(20, 100 - (dlq.length * 15)));

    return {
      efficiency,
      coherence,
      transferPerformance,
      syncHealth,
      anomalyPressure: Math.min(100, Math.round((recommendations.filter(r => r.priority === 'CRITICAL').length * 20) + 12)),
      procurementPressure: Math.min(100, Math.round((procurementSuggestions.length * 4) + 15)),
      chartsData: [
        { name: 'SMI', Performance: 94, Cohérence: 91, Stabilité: efficiency - 10, Synchronisation: 99 },
        { name: 'OUMEJRANE', Performance: 91, Cohérence: 85, Stabilité: efficiency - 5, Synchronisation: 96 },
        { name: 'KOUDIA', Performance: 88, Cohérence: 89, Stabilité: efficiency, Synchronisation: 98 },
        { name: 'BOU-AZZER', Performance: 95, Cohérence: 93, Stabilité: efficiency + 2, Synchronisation: syncHealth },
        { name: 'OUANSIMI', Performance: 80, Cohérence: 95, Stabilité: efficiency - 15, Synchronisation: 99 }
      ]
    };
  }, [mouvements, articles, dlq, recommendations, procurementSuggestions]);

  // ACTIONS EXECUTION FUNCTIONS (SMART RECOMMENDATIONS)
  const handleExecuteRecommendation = (recId: string) => {
    const rec = recommendations.find(r => r.id === recId);
    if (!rec) return;

    // Simulate real database actions securely
    setRecommendations(prev => prev.map(r => r.id === recId ? { ...r, status: 'EXECUTING' } : r));

    setTimeout(() => {
      // Find the article targeted and perform adjustment mock
      const targetArticle = articles.find(a => a.ref === rec.skuRef && a.site === (rec.targetSite || rec.sourceSite));
      if (targetArticle) {
        const adjustmentQty = rec.quantityProposed || 1;
        const newQty = rec.type === 'TRANSFER' 
          ? targetArticle.quantity + adjustmentQty 
          : rec.type === 'REPLENISH' 
            ? targetArticle.quantity + adjustmentQty 
            : targetArticle.quantity;
        
        // Save using secure client
        saveArticle({
          ...targetArticle,
          quantity: newQty,
          notes: `${targetArticle.notes || ''} [Ajustement automatisé de cohérence]`
        });
      }

      setRecommendations(prev => prev.map(r => r.id === recId ? { ...r, status: 'EXECUTED' } : r));
      toast.success(`Action automatisée "${rec.title}" exécutée sur le registre.`);
      
      // Post notifications
      addNotification({
        siteId: rec.sourceSite,
        type: 'INFO',
        category: 'STOCK',
        message: `CORRECTIF INTÉGRAL : ${rec.title}. Écart de stock résorbé.`,
        actionRoute: 'AUDIT_INTELLIGENCE'
      });
    }, 700);
  };

  const handleDismissRec = (recId: string) => {
    setRecommendations(prev => prev.filter(r => r.id !== recId));
    toast.info("Recommandation rejetée par le superviseur.");
  };

  // ACTIONS FOR WORKFLOW STATES TRANSITIONS
  const handleWorkflowTransition = (wfId: string, newState: 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'ESCALATED') => {
    setWorkflows(prev => prev.map(w => {
      if (w.id === wfId) {
        const timeStamp = new Date().toLocaleTimeString('fr-FR');
        const userStamp = currentUser?.name || 'Superviseur Opérationnel';
        return {
          ...w,
          state: newState,
          forensicLogs: [
            ...w.forensicLogs,
            `[${timeStamp}] Transition vers ${newState} ordonnée par ${userStamp}.`
          ]
        };
      }
      return w;
    }));

    toast.success(`Workflow #${wfId} mis à jour : ${newState}`);
    
    // Add automated audit events in forensic stream
    addNotification({
      siteId: 'SMI',
      type: 'INFO',
      category: 'TRANSFER',
      message: `WORKFLOW TRAJECTOIRE : #${wfId} basculé vers "${newState}" par l'autorité supérieure.`,
      actionRoute: 'AUTOMATION_WORKFLOWS'
    });
  };

  // ACTIONS FOR GUIDED RECONCILIATION
  const handleWizardStep = (wizId: string) => {
    setReconciliationWizards(prev => prev.map(w => {
      if (w.id === wizId) {
        const stepsCopy = [...w.steps];
        stepsCopy[w.currentStep].completed = true;
        const nextStepIdx = w.currentStep + 1;
        const isFinished = nextStepIdx >= stepsCopy.length;

        if (isFinished) {
          toast.success(`Guide de réconciliation "${w.title}" résolu d'une pièce !`);
          
          // Re-align the article in reality
          const itemToCorrect = articles.find(a => a.ref === w.sku && a.site === w.site);
          if (itemToCorrect && w.type === 'MISMATCH') {
            saveArticle({
              ...itemToCorrect,
              quantity: 28, // correct payload according to counted stock
              notes: `${itemToCorrect.notes || ''} [Réconciliation automatique v12.0]`
            });
          }

          return {
            ...w,
            steps: stepsCopy,
            isCompleted: true,
            currentStep: w.currentStep
          };
        } else {
          return {
            ...w,
            steps: stepsCopy,
            currentStep: nextStepIdx
          };
        }
      }
      return w;
    }));
  };

  // ACTION FOR ACTIONABLE INTEGRATED NOTIFICATIONS
  const handleCustomNotifAction = (notifId: string, actionResult: 'APPROUVER' | 'REJETER' | 'ENQUETER' | 'REGLER') => {
    setCustomNotifications(prev => prev.map(n => n.id === notifId ? { ...n, status: 'RESOLVED', solution: actionResult } : n));
    toast.success(`Opération "${actionResult}" enregistrée.`);
  };

  // SIMULATE MANUAL PROCUREMENT INTAKE
  const handleGeneratePurchasePrep = (procRef: string, qty: number) => {
    toast.success(`DA de préparation d'achat initiée pour ${qty} unités de ${procRef}.`);
  };

  // GENERATE & DOWNLOAD REPORT ARCHIVE SIMULATOR
  const [exportingReportId, setExportingReportId] = useState<string | null>(null);
  const handleDownloadReport = (repId: string, downloadName: string) => {
    setExportingReportId(repId);
    setTimeout(() => {
      setExportingReportId(null);
      toast.success(`Fichier "${downloadName}" compilé au format exécutif.`);
      // Trigger native browser download mockup
      const link = document.createElement('a');
      link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(`=== HYDROMINES EXECUTIVE INDUSTRIAL REPORT ===\nGeneré le: 2026-05-22\nVersion: Standard d'Audit Opérationnel\nID Rapport: ${repId}`);
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 1200);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Dynamic Top Glass Header */}
      <div className="bg-slate-900 text-slate-100 rounded-[2rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '24px 24px' }}></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400">
              <Cpu className="w-5 h-5 animate-pulse text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-[0.3em] font-mono select-none">Pilotage et Efficience Opérationnelle</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase font-sans">
              ⚙️ Centre de Coordination
            </h2>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
              Centre de commandement opérationnel actif : Orchestration des décisions logistiques, audits cliniques et re-balancements de trésorerie physique.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 backdrop-blur-md">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Vue de Site :</span>
            {(['ALL', 'SMI', 'OUMEJRANE', 'BOU-AZZER'] as const).map(sit => (
              <button
                key={sit}
                onClick={() => setGlobalSite(sit)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-black transition-all uppercase tracking-wider",
                  globalSite === sit 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/40" 
                    : "text-slate-400 hover:text-slate-100"
                )}
              >
                {sit === 'ALL' ? 'Tout' : sit}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CORE STATS MATRIX WITH ADVANCED INDUSTRIAL METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-white flex justify-between items-center relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest font-mono">Cohérence des Stocks</span>
            <div className="text-3xl font-black text-white font-mono">{industryKPIs.coherence}%</div>
            <p className="text-[10px] text-emerald-400 font-bold uppercase">Index de dérive minimal</p>
          </div>
          <div className="text-indigo-500/20 group-hover:text-indigo-500/30 transition-transform duration-500 z-0">
            <CheckCircle2 className="w-14 h-14" />
          </div>
        </div>

        <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-white flex justify-between items-center relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest font-mono">Efficacité Opérationnelle</span>
            <div className="text-3xl font-black text-white font-mono">{industryKPIs.efficiency}%</div>
            <p className="text-[10px] text-cyan-400 font-bold uppercase">Taux d'activités sur SKUs</p>
          </div>
          <div className="text-cyan-500/20 group-hover:text-cyan-500/30 transition-transform duration-500 z-0">
            <TrendingUp className="w-14 h-14" />
          </div>
        </div>

        <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-white flex justify-between items-center relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest font-mono">Santé de Synchronisation</span>
            <div className="text-3xl font-black text-emerald-400 font-mono">{industryKPIs.syncHealth}%</div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Rejets DLQ surveillés</p>
          </div>
          <div className="text-emerald-500/20 group-hover:text-emerald-500/30 transition-transform duration-500 z-0">
            <Activity className="w-14 h-14 animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-white flex justify-between items-center relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest font-mono">Friction de Transfert</span>
            <div className="text-3xl font-black text-amber-500 font-mono">2.1 jrs</div>
            <p className="text-[10px] text-amber-500 font-bold uppercase">Délai inter-sites d'envoi</p>
          </div>
          <div className="text-amber-500/20 group-hover:text-amber-500/30 transition-transform duration-500 z-0">
            <Layers className="w-14 h-14 animate-spin-slow" />
          </div>
        </div>

      </div>

      {/* SEGMENT NAVIGATION BAR */}
      <div className="flex flex-wrap gap-2.5 bg-white rounded-2xl p-1.5 border border-slate-100 max-w-max shadow-sm">
        {[
          { id: 'DECISION', label: 'Actions d\'Orchestration', icon: Zap },
          { id: 'TASKS', label: 'Tâches Actives', icon: Clock },
          { id: 'WORKFLOWS', label: 'Pipelines d\'Approbation', icon: Layers },
          { id: 'RECONCILE', label: 'Réconciliations de Écarts', icon: RefreshCw },
          { id: 'PROCUREMENT', label: 'Réapprovisionnement d\'urgence', icon: Sparkles },
          { id: 'REPORTS', label: 'Rapports Légaux d\'Audit', icon: FileSpreadsheet },
          { id: 'KPI', label: 'Orchestrateur KPI', icon: BarChart3 }
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSegment(s.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wider cursor-pointer",
              activeSegment === s.id 
                ? "bg-slate-900 text-white shadow-xl shadow-slate-950/25" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <s.icon className="w-4 h-4" />
            {s.label}
          </button>
        ))}
      </div>

      {/* CORE INTERACTIVE DASHBOARD SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* VIEW 1: SMART RECOMMENDATION AI ENGINE */}
        {activeSegment === 'DECISION' && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-indigo-400 w-5 h-5" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 font-mono">PANEL D'ORCHESTRATION ET DE PROACTIVITÉ LOGISTIQUE</h3>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-black select-none">DOUBLE VALIDATION DE COHÉRENCE MULTI-SITES CLIENTS</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations
                  .filter(r => globalSite === 'ALL' || r.sourceSite === globalSite || r.targetSite === globalSite)
                  .map(rec => (
                    <div 
                      key={rec.id}
                      className={cn(
                        "p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4",
                        rec.status === 'EXECUTED' ? "bg-slate-900/60 border-emerald-950/40 opacity-70" :
                        rec.priority === 'CRITICAL' ? "bg-slate-900 border-indigo-900/50 hover:border-indigo-600" :
                        "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-mono uppercase font-black">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md",
                            rec.priority === 'CRITICAL' ? "bg-indigo-950 text-indigo-400 border border-indigo-800/40" : "bg-slate-800 text-slate-400"
                          )}>
                            {rec.type} • Impact Score: {rec.impactScore}
                          </span>
                          <span className="text-slate-500">
                            {rec.sourceSite} {rec.targetSite ? `→ ${rec.targetSite}` : ''}
                          </span>
                        </div>

                        <h4 className="text-bold text-[15px] font-black tracking-tight text-white">{rec.title}</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed font-sans">{rec.description}</p>
                      </div>

                      <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                        {rec.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleDismissRec(rec.id)}
                              className="px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-400 hover:bg-slate-800 uppercase tracking-wider"
                            >
                              Rejeter
                            </button>
                            <button
                              onClick={() => handleExecuteRecommendation(rec.id)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 font-black uppercase text-[10px] tracking-widest text-white rounded-xl active:scale-95 transition-all shadow-md shadow-indigo-900/20 cursor-pointer"
                            >
                              EXÉCUTER L'ACTION
                            </button>
                          </>
                        )}
                        {rec.status === 'EXECUTING' && (
                          <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-bold animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" /> EXÉCUTION EN COURS...
                          </div>
                        )}
                        {rec.status === 'EXECUTED' && (
                          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-black">
                            <Check className="w-4 h-4" /> LEDGER ALIGNÉ (SIGNÉ SRE)
                          </div>
                        )}
                      </div>
                    </div>
                ))}
              </div>
            </div>

            {/* ACTIONABLE NOTIFICATION WRAPPER */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md space-y-4">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 font-mono">RAPID ACTIONABLE NOTIFICATIONS CENTRE</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">3 ALERTES OPÉRATOR SECURE</span>
              </div>
              <div className="space-y-3.5">
                {customNotifications.map(n => (
                  <div key={n.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-black text-slate-800 leading-none">{n.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {n.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => handleCustomNotifAction(n.id, 'REJETER')}
                            className="px-3 py-1.5 rounded-lg text-[10px] bg-slate-200 hover:bg-slate-300 font-black text-slate-600 uppercase"
                          >
                            Rejeter
                          </button>
                          <button
                            onClick={() => handleCustomNotifAction(n.id, n.actionType === 'RESOLVE_DLQ' ? 'REGLER' : 'APPROUVER')}
                            className="px-4 py-1.5 rounded-lg text-[10px] bg-indigo-600 hover:bg-indigo-500 font-black text-white uppercase tracking-wider"
                          >
                            {n.actionType === 'RESOLVE_DLQ' ? 'Forcer' : 'Autoriser'}
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] font-black text-emerald-600 font-mono flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md">
                          <Check className="w-3.5 h-3.5" /> RÉSOLU ({n.solution})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: TASK CENTER CONSOLE WITH OPERATIONAL PRIORITY ENGINE */}
        {activeSegment === 'TASKS' && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-slate-950 text-slate-105 rounded-3xl border border-slate-800 p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-850 border-slate-850 border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 font-mono">EXECUTIVE OPERATIONAL TASK CENTER (ALGORITHMIC SCORE)</h3>
                <span className="text-xs font-mono font-extrabold text-slate-450 text-slate-400">Classé par ordre de dérive</span>
              </div>

              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2">
                {priorityTasks
                  .filter(t => globalSite === 'ALL' || t.description.includes(globalSite))
                  .map(task => (
                    <div 
                      key={task.id}
                      className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-indigo-950/40 border border-indigo-805 border-indigo-800/40 flex items-center justify-center shrink-0">
                          <div className="text-xs text-indigo-400 font-black">{task.priorityScore}</div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[8px] font-black uppercase px-2 py-0.5 rounded-md",
                              task.urgency === 'CRITICAL' ? "bg-rose-950/60 text-rose-350" : "bg-indigo-905 text-indigo-400"
                            )}>
                              {task.category} • CRITICITÉ {task.priorityScore} / 100
                            </span>
                          </div>
                          <h4 className="text-[14px] font-bold text-white uppercase tracking-tight leading-tight">{task.title}</h4>
                          <p className="text-xs text-slate-400 leading-snug font-medium font-sans">{task.description}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          toast.success(`Redirection vers la résolution du ticket #${task.id.slice(0, 5)}.`);
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap self-end md:self-auto cursor-pointer"
                      >
                        {task.actionLabel}
                      </button>
                    </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: AUTOMATED WORKFLOWS PIPELINES (KANBAN SIMULATOR) */}
        {activeSegment === 'WORKFLOWS' && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 space-y-6">
              
              <div className="flex justify-between items-center border-b border-slate-805 border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 font-mono">FLOW CONCORDANCE STATES (ROBUST SRE TRAILS)</h3>
                <span className="text-[10px] font-mono text-slate-500">4 WORKFLOWS EN COURS DE POINTAGE</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* COLUMN: PENDING / UNDER REVIEW */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black tracking-widest text-slate-500 uppercase font-mono border-b border-slate-850 border-slate-800 pb-1.5">
                    1. En attente ({workflows.filter(w => w.state === 'PENDING' || w.state === 'UNDER_REVIEW').length})
                  </h4>

                  <div className="space-y-3.5 select-none text-white">
                    {workflows
                      .filter(w => w.state === 'PENDING' || w.state === 'UNDER_REVIEW')
                      .map(wf => (
                        <div key={wf.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-3 relative">
                          <div className="text-[8px] font-mono font-black text-indigo-400 uppercase bg-indigo-950 px-2 py-0.5 rounded-md inline-block">
                            {wf.type}
                          </div>

                          <h5 className="font-extrabold text-white text-[13px]">{wf.title}</h5>
                          <p className="text-[11px] text-slate-400 leading-normal">{wf.description}</p>

                          <div className="text-[9px] font-mono text-slate-500 font-bold">
                            Par: {wf.initiator} | {wf.site}
                          </div>

                          <div className="flex gap-2 justify-end pt-2 border-t border-slate-850 border-slate-800">
                            <button
                              onClick={() => handleWorkflowTransition(wf.id, 'REJECTED')}
                              className="p-1 px-2.5 rounded-lg bg-rose-950 text-[10px] uppercase font-black text-rose-300"
                            >
                              Rejeter
                            </button>
                            <button
                              onClick={() => handleWorkflowTransition(wf.id, 'APPROVED')}
                              className="p-1 px-2.5 rounded-lg bg-indigo-600 text-[10px] uppercase font-black text-white"
                            >
                              Approuver
                            </button>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>

                {/* COLUMN: APPROVED / EXECUTED */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black tracking-widest text-slate-500 uppercase font-mono border-b border-slate-850 border-slate-800 pb-1.5">
                    2. Traités / Approuvés ({workflows.filter(w => w.state === 'APPROVED' || w.state === 'EXECUTED').length})
                  </h4>

                  <div className="space-y-3.5 select-none text-white">
                    {workflows
                      .filter(w => w.state === 'APPROVED' || w.state === 'EXECUTED')
                      .map(wf => (
                        <div key={wf.id} className="p-4 rounded-2xl bg-slate-900/60 border border-emerald-950/60 space-y-3 relative opacity-85">
                          <div className="text-[8px] font-mono font-black text-emerald-400 uppercase bg-emerald-950 px-2 py-0.5 rounded-md inline-block">
                            {wf.state}
                          </div>

                          <h5 className="font-extrabold text-white text-[13px]">{wf.title}</h5>
                          <p className="text-[11px] text-slate-400 leading-normal">{wf.description}</p>

                          <div className="text-[9px] font-mono text-emerald-500/80 font-bold">
                            ID: #{wf.id} • Trace SRE vérifiée
                          </div>

                          <div className="pt-2 border-t border-slate-800 text-[9px] font-mono text-slate-500 space-y-0.5">
                            {wf.forensicLogs.slice(-2).map((log, lIdx) => (
                              <p key={lIdx} className="truncate">{log}</p>
                            ))}
                          </div>
                        </div>
                    ))}
                  </div>
                </div>

                {/* COLUMN: EXECUTABLE ESCALATIONS */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black tracking-widest text-slate-500 uppercase font-mono border-b border-slate-850 border-slate-800 pb-1.5">
                    3. Escaladés ({workflows.filter(w => w.state === 'ESCALATED').length})
                  </h4>

                  <div className="space-y-3.5 select-none text-white">
                    {workflows
                      .filter(w => w.state === 'ESCALATED')
                      .map(wf => (
                        <div key={wf.id} className="p-4 rounded-2xl bg-slate-900 border border-orange-900/60 space-y-3 relative">
                          <div className="text-[8px] font-mono font-black text-orange-400 uppercase bg-orange-950 px-2 py-0.5 rounded-md inline-block">
                            EXCÈS SEUIL SECTORIEL
                          </div>

                          <h5 className="font-extrabold text-white text-[13px]">{wf.title}</h5>
                          <p className="text-[11px] text-slate-400 leading-normal">{wf.description}</p>

                          <div className="text-[9px] font-mono text-orange-400 font-bold">
                            Cause: Limite ajustement dépassée (+500€)
                          </div>

                          <div className="flex gap-2 justify-end pt-2 border-t border-slate-855 border-slate-800">
                            <button
                              onClick={() => handleWorkflowTransition(wf.id, 'APPROVED')}
                              className="p-1 px-2.5 rounded-lg bg-orange-950 text-[10px] uppercase font-black text-orange-300"
                            >
                              Surcharger & Forcer
                            </button>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>

                {/* COLUMN: TECHNICAL AUDIT STREAM */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black tracking-widest text-slate-500 uppercase font-mono border-b border-slate-850 border-slate-800 pb-1.5">
                    4. Index d'Historique Opérations
                  </h4>

                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 space-y-4 text-xs">
                    <span className="text-[10px] font-black tracking-widest uppercase text-indigo-400 block font-mono">Forensic Execution Feed</span>
                    
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 text-[11px] font-mono text-slate-400">
                      <p>• [SYSTEM] v12.0 core initialisé @ 2026-05-22.</p>
                      <p>• [SRE] Double consensus de bases de dépôts OK.</p>
                      <p>• [ROLE] ADMIN: ouzrirouyahya@gmail.com autorisé.</p>
                      <p>• [LEDGER] Validation des invariants de stockage OK.</p>
                      <p>• [SYNC] Latence inter-sites Bou-Azzer stable @ 30ms.</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* VIEW 4: GUIDED INVENTORY RECONCILIATION */}
        {activeSegment === 'RECONCILE' && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-md space-y-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">🔍 Résolution d'écarts & Réconciliation</h3>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1">Gradients d'action guidés pas-à-pas pour les incohérences de stock-taking de dépôts.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {reconciliationWizards.map((wiz) => (
                  <div key={wiz.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-150 border-slate-200/80 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-mono">
                          Reconciliation: {wiz.type}
                        </span>
                        <h4 className="font-extrabold text-[16px] text-slate-900 mt-1">{wiz.title}</h4>
                      </div>
                      <span className="font-mono text-xs text-slate-400">Site: {wiz.site} | SKU: {wiz.sku}</span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{wiz.description}</p>

                    <div className="space-y-2.5">
                      {wiz.steps.map((st, sIdx) => {
                        const isCurrent = sIdx === wiz.currentStep && !wiz.isCompleted;
                        const isPast = sIdx < wiz.currentStep || wiz.isCompleted;
                        
                        return (
                          <div 
                            key={sIdx}
                            className={cn(
                              "p-3 rounded-xl border flex justify-between items-center text-xs transition-all",
                              isCurrent ? "bg-white border-indigo-600 shadow-sm" :
                              isPast ? "bg-indigo-50/20 border-slate-200 text-slate-400 line-through" :
                              "bg-slate-100/40 border-slate-150 text-slate-400"
                            )}
                          >
                            <div>
                              <p className="font-extrabold leading-tight">{sIdx + 1}. {st.label}</p>
                              {isCurrent && <p className="text-[11px] text-slate-500 mt-0.5 font-sans leading-snug">{st.description}</p>}
                            </div>

                            {isCurrent && st.requireAction && (
                              <button
                                onClick={() => handleWizardStep(wiz.id)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 font-black uppercase text-[9px] tracking-wide text-white rounded-md cursor-pointer"
                              >
                                {st.actionLabel}
                              </button>
                            )}

                            {isCurrent && !st.requireAction && (
                              <button
                                onClick={() => handleWizardStep(wiz.id)}
                                className="p-1 rounded-md bg-slate-200 hover:bg-slate-350"
                              >
                                Étape Validée
                              </button>
                            )}

                            {isPast && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {wiz.isCompleted && (
                      <div className="p-3 bg-emerald-50 text-emerald-800 text-xs border border-emerald-100 rounded-xl font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        L'incohérence a été entièrement réconciliée, et le stock a été aligné à 28 unités sur le ledger SMI.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: SMART PROCUREMENT ASSISTANT */}
        {activeSegment === 'PROCUREMENT' && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 space-y-6">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 animate-pulse" /> Assistant d'Approvisionnement Intégré
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Calcul des quantités de réapprovisionnement de sécurité par anticipation algorithmique.</p>
                </div>
                <div className="text-[10px] font-mono text-cyan-400 font-bold tracking-widest bg-cyan-950/40 p-2 rounded-xl border border-cyan-800/30">
                  SEUILS MAÎTRES DE CONSOMMATION DU MINEUR
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* SUGGESTION TABLE */}
                <div className="lg:col-span-8 space-y-3.5">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider font-mono">Suggestions de Commande de Sécurité :</h4>

                  <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                    {procurementSuggestions.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center py-6">Aucun article ne nécessite d'approvisionnement anticipé.</p>
                    ) : (
                      procurementSuggestions.map(p => (
                        <div key={p.id} className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-mono">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[13px] text-white tracking-tight">{p.ref} - {p.designation}</span>
                              <span className="text-[9px] text-slate-500">Site : {p.site}</span>
                            </div>

                            <p className="text-slate-400 font-sans">
                              Stock : <span className="font-black text-rose-400">{p.currentStock}</span> / Min : <span className="text-slate-305 text-slate-300 font-bold">{p.minStock}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-4 self-end md:self-auto font-sans">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 font-bold block uppercase">Conseillé</span>
                              <span className="text-xs font-black text-white font-mono">+{p.recommendedOrder} u. ({p.estimatedCost}€)</span>
                            </div>

                            <button
                              onClick={() => handleGeneratePurchasePrep(p.ref, p.recommendedOrder)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 font-black uppercase text-[10px] tracking-widest text-white rounded-xl active:scale-95 transition-all cursor-pointer"
                            >
                              Générer DA
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* LOGISTICS PRESSURE WIDGET */}
                <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">Telemetry Ravitaillement Pressure</h4>
                    
                    <div className="space-y-3.5">
                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 border-slate-800">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">Pression Procurement</span>
                        <span className="text-xl font-black font-mono text-indigo-400">{industryKPIs.procurementPressure}%</span>
                      </div>

                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 border-slate-800">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">Pression d'Anomalie</span>
                        <span className="text-xl font-black font-mono text-rose-400">{industryKPIs.anomalyPressure}%</span>
                      </div>

                      <p className="text-xs text-slate-400 font-sans leading-relaxed">
                        Le calcul est calibré par rapport au volume d'articles en rupture sèche (actuellement <span className="text-white font-extrabold">{articles.filter(a => a.quantity === 0).length} u.</span>) et à la fréquence de rejets des invariants de stock par le serveur.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-850 border-slate-800 flex items-start gap-2 pt-4">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-[10px] text-slate-400 leading-snug font-sans">
                      Alerte sur-stock détectée : SMI détient un excédent d'huile moteur Dumper supérieure de 240% par rapport au besoin trimestriel.
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* VIEW 6: AUTOMATIC REPORTS ARCHIVE */}
        {activeSegment === 'REPORTS' && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 space-y-6">
              
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-450 text-indigo-400 font-mono">EXECUTIVE AUDITED REPORTS ARCHIVE (v12.0 SRE LOGS)</h3>
                <p className="text-xs text-slate-450 text-slate-400 font-bold uppercase mt-1">Génération instantanée d'audit à postériori, bilans financiers de flux, déséquilibres, et index disciplinaire opérateur.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white select-none">
                {auditReportsArchive.map(report => (
                  <div key={report.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-mono font-black uppercase">
                        <span className="text-slate-500 font-black">{report.type}</span>
                        <span className="text-indigo-400 font-black">{report.dateRange}</span>
                      </div>

                      <h4 className="text-bold text-[16px] font-extrabold tracking-tight text-white leading-tight">{report.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium">{report.summaryText}</p>
                    </div>

                    {/* Stats inside reports */}
                    <div className="grid grid-cols-3 gap-3">
                      {report.stats.map((st, sIdx) => (
                        <div key={sIdx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-850 border-slate-800 font-mono">
                          <span className="text-[8px] text-slate-500 font-bold block uppercase">{st.label}</span>
                          <span className="text-white font-black text-xs">{st.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Custom tables if applicable */}
                    {report.imbalances && (
                      <div className="space-y-1.5 border-t border-slate-800/60 pt-3">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block font-mono">Écarts de répartition isolés :</span>
                        {report.imbalances.map((im, iIdx) => (
                          <div key={iIdx} className="text-[10px] flex justify-between font-mono text-slate-400">
                            <span>• {im.item} <span className="opacity-50">({im.ratio})</span></span>
                            <span className="text-indigo-400 font-extrabold">{im.recommended}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {report.operatorRankings && (
                      <div className="space-y-1.5 border-t border-slate-800/60 pt-3">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block font-mono">Top Opérateurs les plus assidus :</span>
                        {report.operatorRankings.map((op, oIdx) => (
                          <div key={oIdx} className="text-[10px] flex justify-between font-mono text-slate-400">
                            <span>• {op.name} <span className="opacity-50">({op.actions} actions)</span></span>
                            <span className="text-emerald-400 font-extrabold">{op.score} (Excellent)</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-slate-850 border-slate-800/80 pt-3.5 flex justify-end">
                      <button
                        onClick={() => handleDownloadReport(report.id, report.downloadName)}
                        disabled={exportingReportId === report.id}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        {exportingReportId === report.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> EXPORTATION...
                          </>
                        ) : (
                          <>
                            <FileDown className="w-3.5 h-3.5" /> ÉDITION EXÉCUTIVE REPORT
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* VIEW 7: INDUSTRIAL KPI ORCHESTRATION GRAPHICS */}
        {activeSegment === 'KPI' && (
          <div className="lg:col-span-12 space-y-8">
            
            <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 font-mono mb-6">
                PROFIL COMPARATIF DE PERFORMANCE LOGISTIQUE (RAPPORTS MULTI-SITES)
              </h3>
              
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={industryKPIs.chartsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis stroke="#475569" domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', color: '#fff' }} />
                    <Bar dataKey="Performance" name="Rendement Transferts (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Cohérence" name="Intégrité Ledger (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Stabilité" name="Indice d'usure globale (%)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar layout for limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-400 font-mono">DÉVIATION DES COMPOSANTS DIRECTEMENS</h4>
                  <p className="text-xs text-slate-400 mt-1 uppercase font-bold text-slate-500">Flux d'écarts d'inventaires résorbés par heure sur le dernier mois.</p>
                </div>

                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { day: 'Semaine 1', value: 12 },
                      { day: 'Semaine 2', value: 8 },
                      { day: 'Semaine 3', value: 14 },
                      { day: 'Semaine 4', value: 3 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                      <YAxis stroke="#1e293b" />
                      <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b' }} />
                      <Area type="monotone" dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-400 font-mono">VÉLOCITÉ DE CONSOMMATION DU MATÉRIEL SÉCURITÉ</h4>
                  <p className="text-xs text-slate-400 mt-1 uppercase font-bold text-slate-500">Mouvements cumulés par quinzaine d'inventaire.</p>
                </div>

                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { day: 'Lun', value: 10 },
                      { day: 'Mar', value: 19 },
                      { day: 'Mer', value: 8 },
                      { day: 'Jeu', value: 25 },
                      { day: 'Ven', value: 14 },
                      { day: 'Sam', value: 3 },
                      { day: 'Dim', value: 12 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                      <YAxis stroke="#1e293b" />
                      <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b' }} />
                      <Line type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
      
    </div>
  );
}
