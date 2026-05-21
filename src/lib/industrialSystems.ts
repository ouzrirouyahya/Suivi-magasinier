import { Article, Mouvement, AuditLog, Transfert, AnomalyReport, SiteCode } from '../types';

/**
 * 1. Inventory Replay & Stock Reconstruction Algorithm
 * Computes historical stock levels for any past timestamp by replaying movements backward.
 * PastStock = CurrentStock - Sum(Additions after Target) + Sum(Subtractions after Target)
 */
export function reconstructStockAtDate(
  articles: Article[],
  mouvements: Mouvement[],
  targetDate: Date,
  filterSite?: SiteCode
): { [articleId: string]: { ref: string; designation: string; quantity: number } } {
  const result: { [articleId: string]: { ref: string; designation: string; quantity: number } } = {};

  // Start with current active state
  articles.forEach((art) => {
    if (filterSite && art.site !== filterSite) return;
    result[art.id] = {
      ref: art.ref,
      designation: art.designation,
      quantity: art.quantity,
    };
  });

  const targetTime = targetDate.getTime();

  // Filter movements that happened *after* the target date
  const futureMovements = mouvements.filter((m) => {
    if (filterSite && m.site !== filterSite) return false;
    const mTime = new Date(m.date as string).getTime();
    return mTime > targetTime;
  });

  // Sort future movements descending to replay backward
  futureMovements.sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

  // Replay backwards
  futureMovements.forEach((m) => {
    const isAddition = m.type === 'ENTREE' || m.type === 'TRANSFERT_IN' || m.type === 'RETOUR';
    
    m.items.forEach((item) => {
      if (result[item.articleId]) {
        if (isAddition) {
          // Subtract the additions that happened in the future
          result[item.articleId].quantity -= item.quantity;
        } else {
          // Add back the withdrawals that happened in the future
          result[item.articleId].quantity += item.quantity;
        }
      }
    });
  });

  return result;
}

/**
 * 2. Static / Rules-based Anomaly Engine
 * Scans all transactions and stock states to output high-severity industrial anomalies.
 */
export function scanForAnomalies(
  articles: Article[],
  mouvements: Mouvement[],
  auditLogs: AuditLog[],
  transferts: Transfert[]
): AnomalyReport[] {
  const anomalies: AnomalyReport[] = [];
  const now = new Date();

  // A. Check for Negative Stocks
  articles.forEach((art) => {
    if (art.quantity < 0) {
      anomalies.push({
        id: `anom_neg_${art.id}`,
        site: art.site,
        timestamp: new Date().toISOString(),
        type: 'STOCK_INCOHERENCE',
        severity: 'CRITICAL',
        description: `Le stock de '${art.designation}' (${art.ref}) est négatif : ${art.quantity} un.`,
        articleId: art.id,
        suggestedAction: `Planifier d'urgence un inventaire de contrôle physique sur le site ${art.site}.`,
        status: 'NEW',
      });
    }
  });

  // B. Check for Massive Out-of-bounds Withdrawals (> 100 items or value > 80k MAD in one entry)
  mouvements.forEach((m) => {
    const isOutflow = m.type === 'SORTIE' || m.type === 'TRANSFERT_OUT';
    if (!isOutflow) return;

    let totalVal = 0;
    let maxQty = 0;
    let worstArticleId = '';

    m.items.forEach((it) => {
      if (it.quantity > maxQty) {
        maxQty = it.quantity;
        worstArticleId = it.articleId;
      }
      // find article price
      const art = articles.find((a) => a.id === it.articleId);
      totalVal += it.quantity * (art?.price || it.price || 0);
    });

    if (maxQty > 100) {
      anomalies.push({
        id: `anom_mass_qty_${m.id}`,
        site: m.site,
        timestamp: m.date,
        type: 'CONSUMPTION_PATTERN',
        severity: 'HIGH',
        description: `Sortie massive détectée : ${maxQty} unités de matériel en une seule opération. Ref: ${m.reference || 'N/A'}.`,
        articleId: worstArticleId,
        suggestedAction: "Vérifier l'ordre de sortie papier signé par le chef de chantier.",
        status: 'NEW',
      });
    }

    if (totalVal > 80000) {
      anomalies.push({
        id: `anom_mass_val_${m.id}`,
        site: m.site,
        timestamp: m.date,
        type: 'CONSUMPTION_PATTERN',
        severity: 'CRITICAL',
        description: `Dispersement de valeur critique : flux de ${totalVal.toLocaleString('fr-MA')} MAD en un seul coup.`,
        articleId: worstArticleId,
        suggestedAction: "Exiger une approbation du Directeur des Opérations pour justifier cette sortie.",
        status: 'NEW',
      });
    }
  });

  // C. Suspect Double-Click / Duplicate Entries
  // Same site, same article, same quantity, within 2 minutes of each other
  mouvements.forEach((m1, idx1) => {
    mouvements.forEach((m2, idx2) => {
      if (idx1 >= idx2) return; // avoid duplicates
      if (m1.site !== m2.site) return;
      if (m1.type !== m2.type) return;

      const t1 = new Date(m1.date as string).getTime();
      const t2 = new Date(m2.date as string).getTime();
      if (Math.abs(t1 - t2) > 120000) return; // more than 2 mins apart

      // check if items match
      m1.items.forEach((it1) => {
        m2.items.forEach((it2) => {
          if (it1.articleId === it2.articleId && it1.quantity === it2.quantity) {
            anomalies.push({
              id: `anom_dup_${m1.id}_${m2.id}`,
              site: m1.site,
              timestamp: m2.date,
              type: 'STOCK_INCOHERENCE',
              severity: 'MEDIUM',
              description: `Alerte doublon suspect : Deux mouvements '${m1.type}' identiques de ${it1.quantity} un. saisis dans un intervalle de 2min.`,
              articleId: it1.articleId,
              suggestedAction: "Inspecter s'il s'agit d'une double soumission involontaire du magasinier.",
              status: 'NEW',
            });
          }
        });
      });
    });
  });

  // D. Nocturnal Operations (Saisies suspectes entre 22:00 et 06:00)
  mouvements.forEach((m) => {
    const dateObj = new Date(m.date as string);
    const hour = dateObj.getHours();

    if (hour >= 22 || hour < 6) {
      anomalies.push({
        id: `anom_night_${m.id}`,
        site: m.site,
        timestamp: m.date,
        type: 'FREQUENT_CHANGE',
        severity: 'HIGH',
        description: `Activité nocturne suspecte à ${hour}h${dateObj.getMinutes().toString().padStart(2, '0')} par '${m.vendeur || 'un utilisateur'}'`,
        suggestedAction: "Confirmer si l'intervention était programmée d'urgence ou s'il s'agit d'une tentative de soustraction dérobée.",
        status: 'NEW',
      });
    }
  });

  // E. Incoherent Transfers
  transferts.forEach((t) => {
    if (t.sourceSite === t.targetSite) {
      anomalies.push({
        id: `anom_trans_self_${t.id}`,
        site: t.sourceSite,
        timestamp: t.dateEnvoi,
        type: 'STOCK_INCOHERENCE',
        severity: 'MEDIUM',
        description: `Transfert incohérent : Le site de destination est identique au site d'envoi (${t.sourceSite}).`,
        suggestedAction: "Annuler ce transfert et réassigner la destination finale correcte.",
        status: 'NEW',
      });
    }

    if (t.status === 'LITIGE') {
      anomalies.push({
        id: `anom_trans_litig_${t.id}`,
        site: t.targetSite,
        timestamp: t.dateReception || t.dateEnvoi,
        type: 'STOCK_INCOHERENCE',
        severity: 'HIGH',
        description: `Litige réglementaire sur le transfert ${t.reference} expédié par ${t.expediteur}.`,
        suggestedAction: "Diligenter une enquête forensic pour réconcilier les écarts de pièces.",
        status: 'NEW',
      });
    }
  });

  // F. Consumption Explosion per Machine in the past 7 days (> 50,000 MAD cumulative cost)
  const machinesStats: { [machineId: string]: { cost: number; partsCount: number; site: SiteCode } } = {};

  mouvements.forEach((m) => {
    const mTime = new Date(m.date as string).getTime();
    const isRecent = (now.getTime() - mTime) <= 7 * 24 * 60 * 60 * 1000;
    if (!isRecent) return;

    const mId = m.engin || m.perforateur;
    if (!mId) return;

    let cost = 0;
    let count = 0;

    m.items.forEach((it) => {
      const art = articles.find((a) => a.id === it.articleId);
      cost += it.quantity * (art?.price || it.price || 0);
      count += it.quantity;
    });

    if (!machinesStats[mId]) {
      machinesStats[mId] = { cost: 0, partsCount: 0, site: m.site };
    }
    machinesStats[mId].cost += cost;
    machinesStats[mId].partsCount += count;
  });

  Object.entries(machinesStats).forEach(([mId, stat]) => {
    if (stat.cost > 50000) {
      anomalies.push({
        id: `anom_machine_leak_${mId}`,
        site: stat.site,
        timestamp: new Date().toISOString(),
        type: 'CONSUMPTION_PATTERN',
        severity: 'CRITICAL',
        description: `Explosion de consommation sur la machine [${mId}] : ${stat.cost.toLocaleString('fr-MA')} MAD injectés en 7 jours.`,
        suggestedAction: "Évaluer si la machine doit être déclassée ou si les pièces de rechange ont été surfacturées/volées.",
        status: 'NEW',
      });
    }
  });

  return anomalies;
}
