import { IndexedDBStorage } from '../core/indexedDBStorage';
import { articleService } from './article.service';
import { movementsService } from './movement.service';
import { transfersService } from './transfer.service';
import { maintenanceService } from './maintenance.service';
import { logger } from '../lib/utils';

export const offlineService = {
  async saveCollection(colName: string, data: any[]): Promise<void> {
    await IndexedDBStorage.saveCollection(colName, data);
  },

  async getCollection<T>(colName: string): Promise<T[]> {
    return await IndexedDBStorage.getCollection<T>(colName);
  },

  async processItem(item: { intentId: string; type: string; payload: any }): Promise<void> {
    const { type, payload } = item;
    switch (type) {
      case 'addMouvement':
        await movementsService.addMouvement(payload);
        break;
      case 'saveInventaire':
        await movementsService.saveInventaire(payload);
        break;
      case 'addPurchaseRequest':
        await movementsService.addPurchaseRequest(payload);
        break;
      case 'updatePRStatus':
        await movementsService.updatePRStatus(payload.id, payload.status);
        break;
      case 'saveArticle':
        await articleService.saveArticle(payload);
        break;
      case 'deleteArticles':
        await articleService.deleteArticles(payload.ids);
        break;
      case 'addTransfert':
        await transfersService.addTransfert(payload);
        break;
      case 'approveTransfert':
        await transfersService.approveTransfert(payload.id, payload.approver, payload.comment);
        break;
      case 'expedierTransfert':
        await transfersService.expedierTransfert(payload.id, payload.expediteur, payload.comment);
        break;
      case 'completeTransfert':
        await transfersService.completeTransfert(payload.id, payload.recepteur, payload.receivedItems, payload.disputeReason);
        break;
      case 'closeTransfert':
        await transfersService.closeTransfert(payload.id, payload.comment);
        break;
      case 'addMaintenanceLog':
        await maintenanceService.addMaintenanceLog(payload);
        break;
      default:
        logger.warn(`Unknown offline retry intent type: ${type}`);
    }
  }
};
