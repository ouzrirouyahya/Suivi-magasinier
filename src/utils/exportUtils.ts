import XLSX from 'xlsx-js-style';
import { Article, Mouvement, Transfert, SiteCode } from '../types';
import { PriceChangeRecord } from '../types/priceHistory';

export interface SheetConfig {
  name: string;
  data: any[];
  title: string;
}

// Helper to format ISO Date to clean French readable format or simple YYYY-MM-DD
function formatDate(dateVal: any): string {
  if (!dateVal) return '';
  try {
    const d = new Date(typeof dateVal.toDate === 'function' ? dateVal.toDate() : dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toISOString().replace('T', ' ').substring(0, 19);
  } catch {
    return String(dateVal);
  }
}

// Helper to format Date to simple DD/MM/YYYY
function formatDateSimple(dateVal: any): string {
  if (!dateVal) return '';
  try {
    const d = new Date(typeof dateVal.toDate === 'function' ? dateVal.toDate() : dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('fr-FR');
  } catch {
    return String(dateVal);
  }
}

/**
 * Exports data to professional Excel format
 * Leaves rows 1, 2, 3 empty for titles and Hydromines logo integration
 * Enables gridlines explicitly and auto-fits columns dynamically
 */
/**
 * Exports data to professional Excel format with customized styles
 * Leaves rows 1, 2, 3 empty for titles and Hydromines logo integration
 * Forces gridlines to be invisible and applies custom colors/borders
 */
export function exportToExcel(
  sheets: SheetConfig | SheetConfig[],
  filename: string
): void {
  const sheetsArray = Array.isArray(sheets) ? sheets : [sheets];
  const wb = XLSX.utils.book_new();

  sheetsArray.forEach(sheet => {
    // 1. Create a beautiful header header inside Excel (starting at Row 4, leaving Rows 1, 2, 3 empty)
    const titleRow = [`🔵 HYDROMINES — ${sheet.title.toUpperCase()}`];
    const dateStrFr = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const subTitleRow = [`Rapport officiel d'inventaire • Généré le ${dateStrFr} • Format Décisionnel` ];
    const decorativeRow = [`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` ];

    const ws = XLSX.utils.aoa_to_sheet([
      ['🩵🩵🩵🩵🩵🩵🩵  H Y D R O M I N E S  🟥🟥🟥🟥🟥🟥🟥'], // Row 1: Hydromines Logo Accent
      ['🌐 SYSTEME DE GESTION INTEGRAL — RAPPORT DECISIONNEL D\'INVENTAIRE'], // Row 2: Subtitle/Logo Text
      ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'], // Row 3: Double border line
      titleRow, // Row 4: Header Title
      subTitleRow, // Row 5: Metadata
      decorativeRow, // Row 6: Decorative border
      [], // Row 7: Empty space before table headers
    ]);

    // 2. Add the JSON data starting at Row 8 (origin: "A8")
    if (sheet.data.length > 0) {
      XLSX.utils.sheet_add_json(ws, sheet.data, { origin: "A8" });
    } else {
      XLSX.utils.sheet_add_aoa(ws, [['Aucune donnée correspondante']], { origin: "A8" });
    }

    // 3. Force Gridlines to be invisible for a clean, blank page look as requested
    ws['!views'] = [{ showGridLines: false }];

    // 4. Style cells manually using xlsx-js-style properties
    Object.keys(ws).forEach(key => {
      if (key.startsWith('!')) return; // skip metadata keys like !ref, !cols
      const cell = ws[key];
      if (!cell) return;

      // Default style for ALL cells:
      // Background color: White (FFFFFF) to hide all gridlines, custom font: Arial, size: 10
      const defaultStyle = {
        fill: { fgColor: { rgb: "FFFFFF" } },
        font: { name: "Calibri", sz: 10, color: { rgb: "334155" } }, // Slate-700
        alignment: { vertical: "center", horizontal: "left" },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" } }, // Slate-200 very subtle borders
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          left: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } }
        }
      };
      
      const match = key.match(/^([A-Z]+)(\d+)$/);
      if (match) {
        const col = match[1];
        const row = parseInt(match[2], 10);

        if (row === 1) {
          // Hydromines Main Title Logo banner
          cell.s = {
            fill: { fgColor: { rgb: "1E293B" } }, // Slate-800
            font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "38BDF8" } }, // Sky Blue logo text
            alignment: { vertical: "center", horizontal: "center" }
          };
        } else if (row === 2) {
          // Logo Subtitle
          cell.s = {
            fill: { fgColor: { rgb: "1E293B" } }, // Slate-800
            font: { name: "Calibri", sz: 10, italic: true, color: { rgb: "E2E8F0" } },
            alignment: { vertical: "center", horizontal: "center" }
          };
        } else if (row === 3) {
          // Gold separator line
          cell.s = {
            fill: { fgColor: { rgb: "B8860B" } }, // Gold separator!
            font: { name: "Calibri", sz: 8, color: { rgb: "FFFFFF" } },
            alignment: { vertical: "center", horizontal: "center" }
          };
        } else if (row === 4) {
          // Sheet Title
          cell.s = {
            fill: { fgColor: { rgb: "F8FAFC" } },
            font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "1B365D" } }, // Hydromines Dark Navy
            alignment: { vertical: "center", horizontal: "left" },
            border: {
              top: { style: "thin", color: { rgb: "E2E8F0" } },
              bottom: { style: "thin", color: { rgb: "E2E8F0" } }
            }
          };
        } else if (row === 5) {
          // Sheet Subtitle
          cell.s = {
            fill: { fgColor: { rgb: "F8FAFC" } },
            font: { name: "Calibri", sz: 9, color: { rgb: "64748B" } },
            alignment: { vertical: "center", horizontal: "left" }
          };
        } else if (row === 6) {
          // Divider row
          cell.s = {
            fill: { fgColor: { rgb: "F1F5F9" } },
            font: { name: "Calibri", sz: 8, color: { rgb: "CBD5E1" } },
            alignment: { vertical: "center" }
          };
        } else if (row === 7) {
          // Empty space row
          cell.s = {
            fill: { fgColor: { rgb: "FFFFFF" } },
            border: {} // no border
          };
        } else if (row === 8) {
          // PRIMARY TABLE HEADERS ("LIGNE PRINCIPALE DE DATE . ID . PIECE. REFERENCE ....")
          // Style this with a beautiful deep Slate/Navy blue background, bold white text, and thin borders!
          cell.s = {
            fill: { fgColor: { rgb: "1B365D" } }, // Deep Navy Blue
            font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
            alignment: { vertical: "center", horizontal: "center", wrapText: true },
            border: {
              top: { style: "medium", color: { rgb: "0F172A" } },
              bottom: { style: "medium", color: { rgb: "0F172A" } },
              left: { style: "thin", color: { rgb: "475569" } },
              right: { style: "thin", color: { rgb: "475569" } }
            }
          };
        } else {
          // Regular Data Rows
          cell.s = defaultStyle;

          // Align numbers right
          if (typeof cell.v === 'number') {
            cell.s.alignment.horizontal = "right";
            
            // Format monetary values if header contains (MAD)
            const headKey = Object.keys(sheet.data[0])[XLSX.utils.decode_col(col)];
            if (headKey && (headKey.includes('MAD') || headKey.includes('Prix') || headKey.includes('Montant') || headKey.includes('Valeur'))) {
              cell.z = '#,##0.00 "MAD"';
            } else {
              cell.z = '#,##0'; // Raw quantities formatted
            }
          }

          // Custom highlight rules based on contents (for totals, daily separators, etc.)
          const cellValStr = String(cell.v || '');
          if (cellValStr.includes('📊 TOTAL') || cellValStr.includes('TOTAL GÉNÉRAL') || cellValStr.includes('SYNTHÈSE') || cellValStr.includes('SYNTHESE')) {
            cell.s.fill = { fgColor: { rgb: "FEF3C7" } }; // Amber-100 Light Gold
            cell.s.font.bold = true;
            cell.s.font.color = { rgb: "78350F" }; // Amber-900 Dark Amber
            cell.s.border = {
              top: { style: "thin", color: { rgb: "F59E0B" } },
              bottom: { style: "double", color: { rgb: "F59E0B" } },
              left: { style: "thin", color: { rgb: "FEF3C7" } },
              right: { style: "thin", color: { rgb: "FEF3C7" } }
            };
          } else if (cellValStr.includes('🩵 JOURNÉE DU') || cellValStr.includes('JOURNÉE DU')) {
            cell.s.fill = { fgColor: { rgb: "E0F2FE" } }; // Sky-100 Light Blue
            cell.s.font.bold = true;
            cell.s.font.color = { rgb: "0369A1" }; // Sky-700 Blue
            cell.s.alignment.horizontal = "left";
            cell.s.border = {
              top: { style: "medium", color: { rgb: "0284C7" } },
              bottom: { style: "thin", color: { rgb: "0284C7" } },
              left: { style: "thin", color: { rgb: "E0F2FE" } },
              right: { style: "thin", color: { rgb: "E0F2FE" } }
            };
          } else if (cellValStr.includes('░░░░░')) {
            cell.s.fill = { fgColor: { rgb: "F1F5F9" } }; // Slate-100
            cell.s.font.color = { rgb: "94A3B8" }; // Slate-400
            cell.s.border = {
              top: { style: "none" },
              bottom: { style: "none" },
              left: { style: "none" },
              right: { style: "none" }
            };
          }
        }
      }
    });

    // 5. Auto-fit column widths dynamically to prevent ### and chopped texts
    if (sheet.data.length > 0) {
      const keys = Object.keys(sheet.data[0]);
      const colWidths = keys.map(key => {
        let maxLen = key.toString().length;
        sheet.data.forEach(row => {
          const val = row[key];
          if (val !== undefined && val !== null) {
            const len = val.toString().length;
            if (len > maxLen) maxLen = len;
          }
        });
        return { wch: Math.min(75, Math.max(15, maxLen + 4)) };
      });
      ws['cols'] = colWidths;
      ws['!cols'] = colWidths;

      // 6. Add Excel AutoFilter dropdown selectors on column headers (Row 8 down to last row)
      const lastRow = 8 + sheet.data.length;
      const numCols = keys.length;
      const lastColLetter = XLSX.utils.encode_col(numCols - 1);
      ws['!autofilter'] = { ref: `A8:${lastColLetter}${lastRow}` };
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
}

/**
 * Standard CSV export
 */
export function exportToCSV(data: any[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];
  link.download = `${filename}_${dateStr}.csv`;
  link.click();
}

/**
 * Standard formatting of current stock Articles
 */
export function formatArticlesForExport(articles: Article[]): any[] {
  return articles.map(a => {
    const pmp = a.price || 0;
    const totalVal = a.quantity * pmp;
    return {
      'Référence': a.ref || '',
      'Désignation': a.designation || '',
      'Quantité en stock': a.quantity || 0,
      'Unité': a.unit || 'PIECE',
      'Prix Moyen Pondéré (MAD)': pmp,
      'Valeur Totale Stock (MAD)': totalVal,
      'Seuil d\'Alerte Min': a.minStock || 0,
      'Emplacement / Rayon': a.location || '',
      'Site / Chantier': a.site || '',
      'Type d\'article': a.type || '',
      'Catégorie fonctionnelle': a.functionalCategory || a.category || '',
      'Sous-catégorie': a.subCategory || '',
      'Composant': a.component || '',
      'Sous-composant': a.subComponent || '',
      'Fournisseur': a.supplier || '',
      'Notes / Spécifications': a.notes || '',
      'Compatibilité Equipement': a.compatibility || '',
      'Criticité': a.criticality || 'MOYENNE',
      'Statut': a.active ? 'ACTIF' : 'INACTIF',
    };
  });
}

/**
 * Flatten and format Mouvements for detailed export
 */
export function formatMovementsForExport(
  movements: Mouvement[], 
  articles: Article[],
  dailyGrouped: boolean = false
): any[] {
  const formatted: any[] = [];
  const articleMap = new Map(articles.map(a => [a.id, a]));

  // Sort movements by date descending
  const sortedMovements = [...movements].sort((a, b) => {
    const tA = a.date ? new Date(typeof (a.date as any).toDate === 'function' ? (a.date as any).toDate() : a.date as any).getTime() : 0;
    const tB = b.date ? new Date(typeof (b.date as any).toDate === 'function' ? (b.date as any).toDate() : b.date as any).getTime() : 0;
    return tB - tA; // descending
  });

  if (!dailyGrouped) {
    sortedMovements.forEach(m => {
      const mDate = formatDate(m.date);
      const mItems = m.items || [];
      
      if (mItems.length === 0) {
        formatted.push(buildRawMovementRow(m, mDate, '', '', 0, 0, 0, ''));
      } else {
        mItems.forEach(item => {
          const art = articleMap.get(item.articleId);
          const ref = art ? art.ref : '';
          const des = art ? art.designation : '';
          const unitPrice = Number(item.price) || (art ? Number(art.price) : 0) || 0;
          const totalPrice = (Number(item.quantity) || 0) * unitPrice;

          formatted.push(buildRawMovementRow(m, mDate, ref, des, item.quantity || 0, unitPrice, totalPrice, item.beneficiaryName || item.comment || ''));
        });
      }
    });
    return formatted;
  }

  // Group by day for visual separation and daily summaries
  let currentDay = '';
  let dayRows: any[] = [];
  let dayTotalQtyIn = 0;
  let dayTotalQtyOut = 0;
  let dayTotalValIn = 0;
  let dayTotalValOut = 0;

  const flushDay = () => {
    if (dayRows.length > 0) {
      // Add a beautifully shaded header row for the day matching the Sky Blue Hydromines color
      formatted.push({
        '🩵 Date Mouvement': `🩵 JOURNÉE DU ${currentDay} ───────────────────`,
        '🩵 ID Mouvement': '░░░░░░░░░░░',
        '🩵 Référence': '░░░░░░░░░░░',
        '🩵 Type Mouvement': '░░░░░░░░░░░',
        '🩵 Chantier Source/Actuel': '░░░░░░░░░░░',
        '🩵 Chantier Destination': '░░░░░░░░░░░',
        '🩵 Statut': '░░░░░░░░░░░',
        '🩵 Référence Article': '░░░░░░░░░░░',
        '🩵 Désignation Article': '░░░░░░░░░░░',
        '🩵 Quantité': '░░░░░',
        '🟥 Prix Unitaire (MAD)': '░░░░░░░░░░░',
        '🟥 Montant Total (MAD)': '░░░░░░░░░░░',
        '🟥 Bénéficiaire': '░░░░░░░░░░░',
        '🟥 Demandeur': '░░░░░░░░░░░',
        '🟥 Mécanicien': '░░░░░░░░░░░',
        '🟥 Foreur': '░░░░░░░░░░░',
        '🟥 Engin': '░░░░░░░░░░░',
        '🟥 Perforateur': '░░░░░░░░░░░',
        '🟥 Créé Par (Opérateur)': '░░░░░░░░░░░',
        '🟥 Notes / Motif': '░░░░░░░░░░░░░░░░░░░░░',
      });

      // Add actual data rows
      formatted.push(...dayRows);

      // Add a summary row for this day
      formatted.push({
        '🩵 Date Mouvement': `📊 TOTAL DU ${currentDay}`,
        '🩵 ID Mouvement': '',
        '🩵 Référence': '',
        '🩵 Type Mouvement': 'SYNTHESE',
        '🩵 Chantier Source/Actuel': '',
        '🩵 Chantier Destination': '',
        '🩵 Statut': '',
        '🩵 Référence Article': '',
        '🩵 Désignation Article': `ENTREES: +${dayTotalQtyIn} pces (${dayTotalValIn.toFixed(2)} MAD) | SORTIES: -${dayTotalQtyOut} pces (${dayTotalValOut.toFixed(2)} MAD)`,
        '🩵 Quantité': dayTotalQtyIn - dayTotalQtyOut,
        '🟥 Prix Unitaire (MAD)': '',
        '🟥 Montant Total (MAD)': dayTotalValIn - dayTotalValOut,
        '🟥 Bénéficiaire': '',
        '🟥 Demandeur': '',
        '🟥 Mécanicien': '',
        '🟥 Foreur': '',
        '🟥 Engin': '',
        '🟥 Perforateur': '',
        '🟥 Créé Par (Opérateur)': '',
        '🟥 Notes / Motif': 'Solde net de la journée',
      });

      // Shaded spacer row to prevent unformatted empty cells
      formatted.push({
        '🩵 Date Mouvement': '░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░',
        '🩵 ID Mouvement': '░░░░░░░░░░░',
        '🩵 Référence': '░░░░░░░░░░░',
        '🩵 Type Mouvement': '░░░░░░░░░░░',
        '🩵 Chantier Source/Actuel': '░░░░░░░░░░░',
        '🩵 Chantier Destination': '░░░░░░░░░░░',
        '🩵 Statut': '░░░░░░░░░░░',
        '🩵 Référence Article': '░░░░░░░░░░░',
        '🩵 Désignation Article': '░░░░░░░░░░░',
        '🩵 Quantité': '░░░░░',
        '🟥 Prix Unitaire (MAD)': '░░░░░░░░░░░',
        '🟥 Montant Total (MAD)': '░░░░░░░░░░░',
        '🟥 Bénéficiaire': '░░░░░░░░░░░',
        '🟥 Demandeur': '░░░░░░░░░░░',
        '🟥 Mécanicien': '░░░░░░░░░░░',
        '🟥 Foreur': '░░░░░░░░░░░',
        '🟥 Engin': '░░░░░░░░░░░',
        '🟥 Perforateur': '░░░░░░░░░░░',
        '🟥 Créé Par (Opérateur)': '░░░░░░░░░░░',
        '🟥 Notes / Motif': '░░░░░░░░░░░░░░░░░░░░░',
      });

      // Reset
      dayRows = [];
      dayTotalQtyIn = 0;
      dayTotalQtyOut = 0;
      dayTotalValIn = 0;
      dayTotalValOut = 0;
    }
  };

  sortedMovements.forEach(m => {
    const dayStr = formatDateSimple(m.date);
    if (dayStr !== currentDay) {
      flushDay();
      currentDay = dayStr;
    }

    const mDate = formatDate(m.date);
    const mItems = m.items || [];
    
    if (mItems.length === 0) {
      const row = buildRawMovementRow(m, mDate, '', '', 0, 0, 0, '');
      dayRows.push(row);
    } else {
      mItems.forEach(item => {
        const art = articleMap.get(item.articleId);
        const ref = art ? art.ref : '';
        const des = art ? art.designation : '';
        const unitPrice = Number(item.price) || (art ? Number(art.price) : 0) || 0;
        const totalPrice = (Number(item.quantity) || 0) * unitPrice;

        const row = buildRawMovementRow(
          m, mDate, ref, des, item.quantity || 0, unitPrice, totalPrice, 
          item.beneficiaryName || item.comment || ''
        );
        dayRows.push(row);

        if (m.type === 'ENTREE' || m.type === 'RETOUR' || m.type === 'TRANSFERT_IN') {
          dayTotalQtyIn += item.quantity || 0;
          dayTotalValIn += totalPrice;
        } else if (m.type === 'SORTIE' || m.type === 'AJUSTEMENT' || m.type === 'TRANSFERT_OUT') {
          dayTotalQtyOut += item.quantity || 0;
          dayTotalValOut += totalPrice;
        }
      });
    }
  });

  flushDay();
  return formatted;
}

function buildRawMovementRow(
  m: Mouvement, 
  mDate: string, 
  ref: string, 
  des: string, 
  qty: number, 
  unitPrice: number, 
  totalPrice: number,
  itemNotes: string
) {
  return {
    '🩵 Date Mouvement': mDate,
    '🩵 ID Mouvement': m.id || '',
    '🩵 Référence': m.reference || '',
    '🩵 Type Mouvement': m.type === 'ENTREE' ? '🩵 ENTRÉE' : m.type === 'SORTIE' ? '🟥 SORTIE' : m.type === 'RETOUR' ? '🔹 RETOUR' : '🛑 AJUSTEMENT',
    '🩵 Chantier Source/Actuel': m.site || '',
    '🩵 Chantier Destination': m.targetSite || '',
    '🩵 Statut': m.status || 'VALIDE',
    '🩵 Référence Article': ref,
    '🩵 Désignation Article': des,
    '🩵 Quantité': qty,
    '🟥 Prix Unitaire (MAD)': unitPrice,
    '🟥 Montant Total (MAD)': totalPrice,
    '🟥 Bénéficiaire': m.beneficiaire || '',
    '🟥 Demandeur': m.demandeur || m.effectiveDemandeur || '',
    '🟥 Mécanicien': m.mecanicien || '',
    '🟥 Foreur': m.foreur || '',
    '🟥 Engin': m.engin || '',
    '🟥 Perforateur': m.perforateur || '',
    '🟥 Créé Par (Opérateur)': m.createdBy || '',
    '🟥 Notes / Motif': m.notes || m.motif || itemNotes || '',
  };
}

/**
 * Generate a Consolidated Summary Sheet for movements
 * Sums entries and exits grouped by article
 */
export function formatMovementsConsolidated(movements: Mouvement[], articles: Article[]): any[] {
  const summaryMap = new Map<string, {
    ref: string;
    designation: string;
    unit: string;
    category: string;
    totalQtyIn: number;
    totalValIn: number;
    totalQtyOut: number;
    totalValOut: number;
  }>();

  const articleMap = new Map(articles.map(a => [a.id, a]));

  movements.forEach(m => {
    const mItems = m.items || [];
    mItems.forEach(item => {
      const art = articleMap.get(item.articleId);
      const articleId = item.articleId;
      if (!articleId) return;

      const ref = art ? art.ref : '';
      const des = art ? art.designation : 'Article inconnu';
      const unit = art ? art.unit : 'PIECE';
      const category = art ? (art.functionalCategory || art.category || 'Non classé') : 'Non classé';

      const unitPrice = Number(item.price) || (art ? Number(art.price) : 0) || 0;
      const totalPrice = (Number(item.quantity) || 0) * unitPrice;

      if (!summaryMap.has(articleId)) {
        summaryMap.set(articleId, {
          ref,
          designation: des,
          unit,
          category,
          totalQtyIn: 0,
          totalValIn: 0,
          totalQtyOut: 0,
          totalValOut: 0,
        });
      }

      const summary = summaryMap.get(articleId)!;
      if (m.type === 'ENTREE' || m.type === 'RETOUR' || m.type === 'TRANSFERT_IN') {
        summary.totalQtyIn += item.quantity || 0;
        summary.totalValIn += totalPrice;
      } else if (m.type === 'SORTIE' || m.type === 'AJUSTEMENT' || m.type === 'TRANSFERT_OUT') {
        summary.totalQtyOut += item.quantity || 0;
        summary.totalValOut += totalPrice;
      }
    });
  });

  return Array.from(summaryMap.values()).map(s => ({
    'Référence': s.ref,
    'Désignation Article': s.designation,
    'Catégorie': s.category,
    'Unité': s.unit,
    'Total Entrées (Quantité)': s.totalQtyIn,
    'Total Entrées (MAD)': s.totalValIn,
    'Total Sorties (Quantité)': s.totalQtyOut,
    'Total Sorties (MAD)': s.totalValOut,
    'Flux Net (Quantité)': s.totalQtyIn - s.totalQtyOut,
    'Flux Net (MAD)': s.totalValIn - s.totalValOut,
  })).sort((a, b) => b['Total Sorties (Quantité)'] - a['Total Sorties (Quantité)']);
}

/**
 * Detailed Transfers export
 */
export function formatTransfersForExport(transfers: Transfert[], articles: Article[]): any[] {
  const formatted: any[] = [];
  const articleMap = new Map(articles.map(a => [a.id, a]));

  const sortedTransfers = [...transfers].sort((a, b) => {
    const tA = a.dateEnvoi ? new Date(typeof (a.dateEnvoi as any).toDate === 'function' ? (a.dateEnvoi as any).toDate() : a.dateEnvoi as any).getTime() : 0;
    const tB = b.dateEnvoi ? new Date(typeof (b.dateEnvoi as any).toDate === 'function' ? (b.dateEnvoi as any).toDate() : b.dateEnvoi as any).getTime() : 0;
    return tB - tA;
  });

  sortedTransfers.forEach(t => {
    const dateEnv = formatDate(t.dateEnvoi);
    const dateRec = t.dateReception ? formatDate(t.dateReception) : '';
    const tItems = t.items || [];

    if (tItems.length === 0) {
      formatted.push({
        'Date Envoi': dateEnv,
        'ID Transfert': t.id || '',
        'Référence Transfert': t.reference || '',
        'Statut': `✈️ ${t.status || 'EN_COURS'}`,
        'Site Source': t.sourceSite || '',
        'Site Cible': t.targetSite || '',
        'Date Réception': dateRec,
        'Expéditeur': t.expediteur || t.creatorEmail || '',
        'Récepteur': t.recepteur || t.receiverEmail || '',
        'Litige / Motif': t.disputeReason || '',
        'Référence Article': '',
        'Désignation': '',
        'Quantité Envoyée': 0,
        'Quantité Reçue': 0,
        'Prix Unitaire (MAD)': 0,
        'Montant Total (MAD)': 0,
      });
    } else {
      tItems.forEach(item => {
        const art = articleMap.get(item.articleId);
        const ref = art ? art.ref : '';
        const des = art ? art.designation : '';
        const unitPrice = Number(item.price) || (art ? Number(art.price) : 0) || 0;
        const totalVal = (Number(item.quantity) || 0) * unitPrice;

        const recItem = t.receivedItems?.find(ri => ri.articleId === item.articleId);
        const qtyRec = recItem ? (recItem.quantityReceived ?? recItem.quantity) : (t.status === 'RECEPTIONNE' || t.status === 'ACCEPTE' || t.status === 'RECU' ? item.quantity : 0);

        formatted.push({
          'Date Envoi': dateEnv,
          'ID Transfert': t.id || '',
          'Référence Transfert': t.reference || '',
          'Statut': t.status === 'RECU' || t.status === 'RECEPTIONNE' ? '🟢 REÇU COMPLET' : (t.status === 'EXPEDIE' || t.status === 'IN_TRANSIT' || t.status === 'EN_TRANSIT' ? '🟡 EXPÉDIÉ / EN TRANSIT' : '🔴 LITIGE'),
          'Site Source': t.sourceSite || '',
          'Site Cible': t.targetSite || '',
          'Date Réception': dateRec,
          'Expéditeur': t.expediteur || t.creatorEmail || '',
          'Récepteur': t.recepteur || t.receiverEmail || '',
          'Litige / Motif': t.disputeReason || '',
          'Référence Article': ref,
          'Désignation': des,
          'Quantité Envoyée': item.quantity || 0,
          'Quantité Reçue': qtyRec || 0,
          'Prix Unitaire (MAD)': unitPrice,
          'Montant Total (MAD)': totalVal,
        });
      });
    }
  });

  return formatted;
}

/**
 * Detailed Price History Export
 */
export function formatPriceHistoryForExport(
  records: PriceChangeRecord[],
  dailyGrouped: boolean = false
): any[] {
  const sortedRecords = [...records].sort((a, b) => {
    const tA = a.changedAt ? new Date(a.changedAt).getTime() : 0;
    const tB = b.changedAt ? new Date(b.changedAt).getTime() : 0;
    return tB - tA;
  });

  if (!dailyGrouped) {
    return sortedRecords.map(r => buildRawPriceRow(r));
  }

  // Group by day for visual separation
  const formatted: any[] = [];
  let currentDay = '';
  let dayRows: any[] = [];

  const flushDay = () => {
    if (dayRows.length > 0) {
      formatted.push({
        'Date Changement': `📅 JOURNÉE DU ${currentDay} ━━━━━━━━━━━━━━━━━━━━━━━━`,
        'ID Enregistrement': '',
        'Référence Article': '',
        'Désignation Article': '',
        'Catégorie': '',
        'Ancien Prix (MAD)': '',
        'Nouveau Prix (MAD)': '',
        'Variation (MAD)': '',
        'Variation (%)': '',
        'Modifié Par': '',
        'Raison / Motif': '',
      });
      formatted.push(...dayRows);
      formatted.push({}); // Space row
      dayRows = [];
    }
  };

  sortedRecords.forEach(r => {
    const dayStr = formatDateSimple(r.changedAt);
    if (dayStr !== currentDay) {
      flushDay();
      currentDay = dayStr;
    }
    dayRows.push(buildRawPriceRow(r));
  });

  flushDay();
  return formatted;
}

function buildRawPriceRow(r: PriceChangeRecord) {
  const variation = r.newPrice - r.oldPrice;
  const variationPercent = r.oldPrice > 0 
    ? ((variation / r.oldPrice) * 100).toFixed(1) + '%'
    : '100.0%';

  return {
    'Date Changement': formatDate(r.changedAt),
    'ID Enregistrement': r.id || '',
    'Référence Article': r.itemReference || '',
    'Désignation Article': r.itemDesignation || '',
    'Catégorie': r.category || 'Non classé',
    'Ancien Prix (MAD)': r.oldPrice,
    'Nouveau Prix (MAD)': r.newPrice,
    'Variation (MAD)': variation,
    'Variation (%)': variationPercent,
    'Modifié Par': r.changedByName || r.changedBy || '',
    'Raison / Motif': r.reason || '',
  };
}

/**
 * Creates a professional general stock inventory overview dashboard comparing all 5 sites
 */
export function formatArticlesSummaryDashboard(articles: Article[]): any[] {
  const sites: SiteCode[] = ['SMI', 'OUMEJRANE', 'BOU-AZZER', 'OUANSIMI', 'KOUDIA'];
  
  const siteKPIs = sites.map(site => {
    const siteArts = articles.filter(a => a.site === site);
    const activeRefs = siteArts.filter(a => (a.quantity || 0) > 0);
    const totalQty = siteArts.reduce((acc, a) => acc + (a.quantity || 0), 0);
    const totalVal = siteArts.reduce((acc, a) => acc + (a.quantity || 0) * (a.price || 0), 0);
    const alertCount = siteArts.filter(a => (a.quantity || 0) > 0 && (a.quantity || 0) <= (a.minStock || 0)).length;
    const ruptureCount = siteArts.filter(a => (a.quantity || 0) === 0 && (a.minStock || 0) > 0).length;

    return {
      'Site / Chantier': `🏭 SITE ${site}`,
      'Nombre de Références Actives': activeRefs.length,
      'Quantité Totale en Stock': totalQty,
      'Valeur Estimée du Stock (MAD)': totalVal,
      'Articles en Alerte (Quantité Basse)': alertCount,
      'Articles en Rupture Critique': ruptureCount,
    };
  });

  // Calculate totals across all sites
  const totalRefs = articles.filter(a => (a.quantity || 0) > 0).length;
  const grandQty = articles.reduce((acc, a) => acc + (a.quantity || 0), 0);
  const grandVal = articles.reduce((acc, a) => acc + (a.quantity || 0) * (a.price || 0), 0);
  const totalAlerts = articles.filter(a => (a.quantity || 0) > 0 && (a.quantity || 0) <= (a.minStock || 0)).length;
  const totalRuptures = articles.filter(a => (a.quantity || 0) === 0 && (a.minStock || 0) > 0).length;

  siteKPIs.push({
    'Site / Chantier': '📊 TOTAL GÉNÉRAL CONSOLIDÉ',
    'Nombre de Références Actives': totalRefs,
    'Quantité Totale en Stock': grandQty,
    'Valeur Estimée du Stock (MAD)': grandVal,
    'Articles en Alerte (Quantité Basse)': totalAlerts,
    'Articles en Rupture Critique': totalRuptures,
  });

  return siteKPIs;
}

/**
 * Creates a professional stock movements overview dashboard comparing flow metrics for all 5 sites
 */
export function formatMovementsSummaryDashboard(movements: Mouvement[], articles: Article[]): any[] {
  const sites: SiteCode[] = ['SMI', 'OUMEJRANE', 'BOU-AZZER', 'OUANSIMI', 'KOUDIA'];
  const articleMap = new Map(articles.map(a => [a.id, a]));

  const siteKPIs = sites.map(site => {
    // Filter movements where site source OR site target is the current site
    const siteMovs = movements.filter(m => m.site === site || m.targetSite === site);
    
    let totalQtyIn = 0;
    let totalValIn = 0;
    let totalQtyOut = 0;
    let totalValOut = 0;

    siteMovs.forEach(m => {
      const items = m.items || [];
      items.forEach(item => {
        const art = articleMap.get(item.articleId);
        const price = item.price || (art ? art.price : 0) || 0;
        const total = (item.quantity || 0) * price;

        // Determine if it is IN or OUT from this site's perspective
        if (m.site === site) {
          if (m.type === 'ENTREE' || m.type === 'RETOUR' || m.type === 'TRANSFERT_IN') {
            totalQtyIn += item.quantity || 0;
            totalValIn += total;
          } else {
            totalQtyOut += item.quantity || 0;
            totalValOut += total;
          }
        } else if (m.targetSite === site) {
          totalQtyIn += item.quantity || 0;
          totalValIn += total;
        }
      });
    });

    return {
      'Site / Chantier': `🏭 SITE ${site}`,
      'Nombre de Mouvements': siteMovs.length,
      'Total Entrées (Quantité)': totalQtyIn,
      'Valeur des Entrées (MAD)': totalValIn,
      'Total Sorties (Quantité)': totalQtyOut,
      'Valeur des Sorties (MAD)': totalValOut,
      'Solde Net (Quantité)': totalQtyIn - totalQtyOut,
      'Solde Net (Valeur MAD)': totalValIn - totalValOut,
    };
  });

  // Grand totals
  const totalMovs = movements.length;
  let grandQtyIn = 0;
  let grandValIn = 0;
  let grandQtyOut = 0;
  let grandValOut = 0;

  movements.forEach(m => {
    const items = m.items || [];
    items.forEach(item => {
      const art = articleMap.get(item.articleId);
      const price = item.price || (art ? art.price : 0) || 0;
      const total = (item.quantity || 0) * price;

      if (m.type === 'ENTREE' || m.type === 'RETOUR' || m.type === 'TRANSFERT_IN') {
        grandQtyIn += item.quantity || 0;
        grandValIn += total;
      } else {
        grandQtyOut += item.quantity || 0;
        grandValOut += total;
      }
    });
  });

  siteKPIs.push({
    'Site / Chantier': '📊 TOTAL GÉNÉRAL CONSOLIDÉ',
    'Nombre de Mouvements': totalMovs,
    'Total Entrées (Quantité)': grandQtyIn,
    'Valeur des Entrées (MAD)': grandValIn,
    'Total Sorties (Quantité)': grandQtyOut,
    'Valeur des Sorties (MAD)': grandValOut,
    'Solde Net (Quantité)': grandQtyIn - grandQtyOut,
    'Solde Net (Valeur MAD)': grandValIn - grandValOut,
  });

  return siteKPIs;
}
