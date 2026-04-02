/**
 * oblio-client-e4.ts — Adapter Oblio Client pentru E4 Post-Sale
 *
 * Re-exportă oblioClient din e3-ai-sales pentru utilizare în workerii E4.
 *
 * STUB: Toate metodele sunt STUB în faza curentă.
 * Implementarea HTTP reală va fi în FAZA 13 (external-integrations).
 *
 * NOTE: Deoarece oblio-client.ts este definit în workers/e3-ai-sales (pachet separat),
 * e4-postsale reimplementează un adapter local cu aceeași interfață STUB.
 * Motivul: pachetele worker sunt independente și nu se importă cross-package.
 */

const LOG = "[oblio-client-e4]";

export interface OblioStockItem {
  sku: string;
  quantity: number;
  name?: string;
}

export interface OblioStockSyncResult {
  synced: number;
  errors: number;
  note: string;
}

/**
 * oblioClient — interfață simplificată pentru operațiile de stoc Oblio API (E4).
 * STUB: returnează date simulate. Implementarea reală va fi în FAZA 13.
 */
export const oblioClient = {
  /**
   * Sincronizează stocul cu Oblio (bidirecțional, stock_inventory source of truth).
   * STUB — returnează date simulate cu quantity=0 per item.
   */
  async syncStock(tenantId: string, items: OblioStockItem[]): Promise<OblioStockSyncResult> {
    console.info(`${LOG} STUB syncStock tenantId=${tenantId} items=${items.length}`);
    return {
      synced: items.length,
      errors: 0,
      note: "oblio-stock-sync-stub-e4",
    };
  },
};

export type OblioClient = typeof oblioClient;
