import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { recordAttendanceScan, type ScanResultResponse } from "@/lib/actions/attendance";

export interface OfflineAttendanceScan {
  id: string;
  sessionId: string;
  groupId: string;
  qrToken: string;
  source: "camera" | "scanner" | "manual";
  scannedAt: string;
  status: "pending" | "syncing" | "synced" | "failed";
  createdAt: number;
}

interface FulkOfflineDB extends DBSchema {
  attendance_queue: {
    key: string;
    value: OfflineAttendanceScan;
    indexes: {
      by_session: string;
      by_status: string;
      by_session_token: [string, string];
    };
  };
}

const DB_NAME = "fulk_academy_offline";
const DB_VERSION = 1;
const STORE_NAME = "attendance_queue";

let dbPromise: Promise<IDBPDatabase<FulkOfflineDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<FulkOfflineDB>> | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!dbPromise) {
    dbPromise = openDB<FulkOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("by_session", "sessionId");
          store.createIndex("by_status", "status");
          store.createIndex("by_session_token", ["sessionId", "qrToken"]);
        }
      },
    });
  }

  return dbPromise;
}

/**
 * Add a scan to offline queue with local duplicate check
 */
export async function enqueueOfflineScan(scan: {
  sessionId: string;
  groupId: string;
  qrToken: string;
  source: "camera" | "scanner" | "manual";
  scannedAt?: string;
}): Promise<{
  success: boolean;
  duplicate?: boolean;
  message: string;
  item?: OfflineAttendanceScan;
}> {
  const db = await getOfflineDB();
  if (!db) {
    return { success: false, message: "قاعدة البيانات المحلية غير مدعومة في هذه البيئة" };
  }

  const cleanToken = scan.qrToken.trim();
  if (!cleanToken) {
    return { success: false, message: "رمز المسح فارغ" };
  }

  // 1. Check local conflict / duplicate in same session
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const tokenIndex = store.index("by_session_token");

  const existing = await tokenIndex.get([scan.sessionId, cleanToken]);
  if (existing && existing.status !== "failed") {
    await tx.done;
    return {
      success: false,
      duplicate: true,
      message: "تم تسجيل هذا الكود مسبقاً في قائمة الانتظار بدون اتصال",
      item: existing,
    };
  }

  const now = new Date().toISOString();
  const newScan: OfflineAttendanceScan = {
    id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    sessionId: scan.sessionId,
    groupId: scan.groupId,
    qrToken: cleanToken,
    source: scan.source,
    scannedAt: scan.scannedAt || now,
    status: "pending",
    createdAt: Date.now(),
  };

  await store.put(newScan);
  await tx.done;

  return {
    success: true,
    message: "تم حفظ السجل محلياً في قائمة الانتظار",
    item: newScan,
  };
}

/**
 * Get count of pending scans for a session or globally
 */
export async function getPendingScansCount(sessionId?: string): Promise<number> {
  const db = await getOfflineDB();
  if (!db) return 0;

  try {
    const all = await db.getAll(STORE_NAME);
    return all.filter((item) => {
      const matchSession = sessionId ? item.sessionId === sessionId : true;
      return matchSession && (item.status === "pending" || item.status === "failed");
    }).length;
  } catch {
    return 0;
  }
}

/**
 * Get all pending scans sorted chronologically
 */
export async function getPendingScans(sessionId?: string): Promise<OfflineAttendanceScan[]> {
  const db = await getOfflineDB();
  if (!db) return [];

  try {
    const all = await db.getAll(STORE_NAME);
    return all
      .filter((item) => {
        const matchSession = sessionId ? item.sessionId === sessionId : true;
        return matchSession && (item.status === "pending" || item.status === "failed");
      })
      .sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

/**
 * Delete a single scan from the queue
 */
export async function removeScanFromQueue(id: string): Promise<void> {
  const db = await getOfflineDB();
  if (!db) return;

  try {
    await db.delete(STORE_NAME, id);
  } catch (err) {
    console.error("Failed to delete item from offline queue:", err);
  }
}

/**
 * Synchronize offline queue to server
 */
export async function syncOfflineQueue(
  sessionId?: string,
  onProgress?: (synced: number, total: number) => void
): Promise<{
  total: number;
  synced: number;
  duplicates: number;
  errors: number;
  results: Array<{
    scanId: string;
    token: string;
    result: ScanResultResponse;
  }>;
}> {
  const db = await getOfflineDB();
  if (!db) {
    return { total: 0, synced: 0, duplicates: 0, errors: 0, results: [] };
  }

  const pending = await getPendingScans(sessionId);
  if (pending.length === 0) {
    return { total: 0, synced: 0, duplicates: 0, errors: 0, results: [] };
  }

  let syncedCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  const results: Array<{
    scanId: string;
    token: string;
    result: ScanResultResponse;
  }> = [];

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    if (!item) continue;

    try {
      // Mark as syncing in IndexedDB
      await db.put(STORE_NAME, { ...item, status: "syncing" });

      const response = await recordAttendanceScan({
        sessionId: item.sessionId,
        groupId: item.groupId,
        qrToken: item.qrToken,
        source: item.source,
        scannedAt: item.scannedAt,
      });

      results.push({
        scanId: item.id,
        token: item.qrToken,
        result: response,
      });

      if (response.success) {
        syncedCount++;
        // Remove successfully synced item from IndexedDB
        await removeScanFromQueue(item.id);
      } else if (response.status === "already_recorded") {
        duplicateCount++;
        // If already recorded on server, remove from queue so it does not persist
        await removeScanFromQueue(item.id);
      } else {
        // Blocked, wrong group, or not found on server
        errorCount++;
        // Remove to avoid endless retry loop of invalid codes
        await removeScanFromQueue(item.id);
      }
    } catch {
      errorCount++;
      // Mark as failed for next attempt
      await db.put(STORE_NAME, { ...item, status: "failed" });
    }

    if (onProgress) {
      onProgress(i + 1, pending.length);
    }
  }

  return {
    total: pending.length,
    synced: syncedCount,
    duplicates: duplicateCount,
    errors: errorCount,
    results,
  };
}
