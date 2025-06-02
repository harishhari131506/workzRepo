import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface OfflineOperation {
  id: string;
  model: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  synced: boolean;
}

export class OfflineSyncService {
  private operations: OfflineOperation[] = [];
  private isOnline: boolean = true;
  private syncInterval: NodeJS.Timeout | null = null;
  private apiClient: AxiosInstance;

  constructor(baseURL: string) {
    this.apiClient = axios.create({
      baseURL,
      timeout: 10000,
    });

    // Setup network detection
    this.setupNetworkDetection();

    // Start sync process
    this.startSyncProcess();
  }

  private setupNetworkDetection() {
    // Ping server every 30 seconds to check connectivity
    setInterval(async () => {
      try {
        await this.apiClient.get('/health');
        if (!this.isOnline) {
          logger.info('Network connection restored');
          this.isOnline = true;
          this.syncPendingOperations();
        }
      } catch (error) {
        if (this.isOnline) {
          logger.warn('Network connection lost');
          this.isOnline = false;
        }
      }
    }, 30000);
  }

  private startSyncProcess() {
    // Sync every 60 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingOperations();
      }
    }, 60000);
  }

  async executeOperation(
    model: string,
    operation: 'create' | 'update' | 'delete',
    data: any,
    id?: string
  ): Promise<any> {
    const offlineOp: OfflineOperation = {
      id: id || `offline_${Date.now()}_${Math.random()}`,
      model,
      operation,
      data,
      timestamp: new Date(),
      synced: false,
    };

    if (this.isOnline) {
      try {
        const result = await this.executeOnlineOperation(offlineOp);
        offlineOp.synced = true;
        return result;
      } catch (error) {
        logger.warn('Online operation failed, queuing for offline sync:', error);
        this.isOnline = false;
      }
    }

    // Queue operation for later sync
    this.operations.push(offlineOp);
    logger.info(`Queued offline operation: ${operation} on ${model}`);

    return { ...offlineOp, pending: true };
  }

  private async executeOnlineOperation(operation: OfflineOperation): Promise<any> {
    const { model, operation: op, data, id } = operation;

    switch (op) {
      case 'create':
        const createResponse = await this.apiClient.post(`/${model}`, data);
        return createResponse.data;

      case 'update':
        const updateResponse = await this.apiClient.put(`/${model}/${data.id}`, data);
        return updateResponse.data;

      case 'delete':
        await this.apiClient.delete(`/${model}/${data.id}`);
        return { success: true };

      default:
        throw new Error(`Unknown operation: ${op}`);
    }
  }

  private async syncPendingOperations() {
    const pendingOps = this.operations.filter((op) => !op.synced);

    if (pendingOps.length === 0) return;

    logger.info(`Syncing ${pendingOps.length} pending operations`);

    for (const operation of pendingOps) {
      try {
        await this.executeOnlineOperation(operation);
        operation.synced = true;
        logger.info(`Synced operation: ${operation.operation} on ${operation.model}`);
      } catch (error: unknown) {
        if (error instanceof Error) {
          logger.error(`Failed to sync operation ${operation.id}:`, error);

          const errCode = (error as any).code;
          if (errCode === 'ECONNREFUSED' || errCode === 'ENOTFOUND') {
            this.isOnline = false;
            break;
          }
        } else {
          logger.error(`Unknown error while syncing operation ${operation.id}:`, error);
        }
      }
    }
  }

  getPendingOperations(): OfflineOperation[] {
    return this.operations.filter((op) => !op.synced);
  }

  getOperationHistory(): OfflineOperation[] {
    return [...this.operations];
  }

  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}
