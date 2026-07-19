import { IndexedDBStorage } from '../core/indexedDBStorage';
import { articleService } from './article.service';
import { movementsService } from './movement.service';
import { transfersService } from './transfer.service';
import { maintenanceService } from './maintenance.service';
import { messagingService } from './message.service';
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
    let res: { success: boolean; error?: string } = { success: true };

    switch (type) {
      case 'addMouvement':
        res = await movementsService.addMouvement(payload);
        break;
      case 'saveInventaire':
        res = await movementsService.saveInventaire(payload);
        break;
      case 'addPurchaseRequest':
        res = await movementsService.addPurchaseRequest(payload);
        break;
      case 'updatePRStatus':
        res = await movementsService.updatePRStatus(payload.id, payload.status);
        break;
      case 'saveArticle':
        res = await articleService.saveArticle(payload);
        break;
      case 'deleteArticles':
        res = await articleService.deleteArticles(payload.ids);
        break;
      case 'addTransfert':
        res = await transfersService.addTransfert(payload);
        break;
      case 'approveTransfert':
        res = await transfersService.approveTransfert(payload.id, payload.approver, payload.comment);
        break;
      case 'expedierTransfert':
        res = await transfersService.expedierTransfert(payload.id, payload.expediteur, payload.comment);
        break;
      case 'completeTransfert':
        res = await transfersService.completeTransfert(payload.id, payload.recepteur, payload.receivedItems, payload.disputeReason);
        break;
      case 'closeTransfert':
        res = await transfersService.closeTransfert(payload.id, payload.comment);
        break;
      case 'addMaintenanceLog':
        await maintenanceService.addMaintenanceLog(payload);
        return;
      case 'sendMessage':
        await messagingService.sendMessage(payload);
        return;
      case 'replyToMessage':
        await messagingService.replyToMessage(payload.parentId, payload.threadId, payload.message);
        return;
      default:
        logger.warn(`Unknown offline retry intent type: ${type}`);
        return;
    }

    if (!res.success) {
      throw new Error(res.error || `Offline execution failed for ${type}`);
    }
  }
};
