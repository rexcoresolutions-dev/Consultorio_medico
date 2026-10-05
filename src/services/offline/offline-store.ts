export type OfflineOperation = {
  id: string; empresaId: number; sucursalId: number | null; usuarioId: number;
  type: string; state: 'PENDING' | 'SYNCING' | 'ERROR' | 'CONFLICT';
  createdAt: string; attempts: number; iv: string; ciphertext: string; error?: string;
  localId: string; dependencies: string[]; deviceId: string; version: number;
};

const DB_NAME = 'consultorio-offline-v1';
const STORE = 'operations';
const META = 'meta';
const MAPPINGS = 'mappings';
const CACHE = 'cache';
const toBase64 = (value: Uint8Array) => btoa(String.fromCharCode(...value));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 3);
  request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }); if (!db.objectStoreNames.contains(META)) db.createObjectStore(META); if (!db.objectStoreNames.contains(MAPPINGS)) db.createObjectStore(MAPPINGS); if (!db.objectStoreNames.contains(CACHE)) db.createObjectStore(CACHE); };
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
});
const transaction = async <T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) => { const db = await openDb(); return new Promise<T>((resolve, reject) => { const tx = db.transaction(storeName, mode); const request = action(tx.objectStore(storeName)); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); tx.oncomplete = () => db.close(); }); };
const cryptoKey = async (): Promise<CryptoKey> => { const current = await transaction<any>(META, 'readonly', (store) => store.get('encryption-key')); if (current) return current; const created = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); await transaction(META, 'readwrite', (store) => store.put(created, 'encryption-key')); return created; };

export const saveOfflineOperation = async (input: { type: string; payload: unknown; empresaId: number; sucursalId: number | null; usuarioId: number; deviceId: string; dependencies?: string[] }) => {
  const id = crypto.randomUUID(); const iv = crypto.getRandomValues(new Uint8Array(12)); const encoded = new TextEncoder().encode(JSON.stringify(input.payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cryptoKey(), encoded);
  const row: OfflineOperation = { id, localId: `local:${id}`, dependencies: input.dependencies ?? [], deviceId: input.deviceId, version: 1, empresaId: input.empresaId, sucursalId: input.sucursalId, usuarioId: input.usuarioId, type: input.type, state: 'PENDING', createdAt: new Date().toISOString(), attempts: 0, iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
  await transaction(STORE, 'readwrite', (store) => store.put(row)); window.dispatchEvent(new Event('offline-queue-changed')); return row;
};
export const listOfflineOperations = async (): Promise<OfflineOperation[]> => transaction<any[]>(STORE, 'readonly', (store) => store.getAll());
export const decryptOfflinePayload = async (row: OfflineOperation) => JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(row.iv) }, await cryptoKey(), fromBase64(row.ciphertext))));
export const updateOfflineOperation = async (row: OfflineOperation) => { await transaction(STORE, 'readwrite', (store) => store.put(row)); window.dispatchEvent(new Event('offline-queue-changed')); };
export const removeOfflineOperation = async (id: string) => { await transaction(STORE, 'readwrite', (store) => store.delete(id)); window.dispatchEvent(new Event('offline-queue-changed')); };
export const saveOfflineMapping = async (localId: string, serverId: string | number) => transaction(MAPPINGS, 'readwrite', (store) => store.put(serverId, localId));
export const getOfflineMapping = async (localId: string): Promise<string | number | undefined> => transaction<any>(MAPPINGS, 'readonly', (store) => store.get(localId));

const encryptValue = async (value: unknown) => { const iv = crypto.getRandomValues(new Uint8Array(12)); const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cryptoKey(), new TextEncoder().encode(JSON.stringify(value))); return { iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)), updatedAt: new Date().toISOString() }; };
export const saveOfflineCache = async (key: string, value: unknown) => { const encrypted = await encryptValue(value); return transaction(CACHE, 'readwrite', (store) => store.put(encrypted, key)); };
export const readOfflineCache = async (key: string): Promise<{ value: any; updatedAt: string } | null> => { const row: any = await transaction(CACHE, 'readonly', (store) => store.get(key)); if (!row) return null; const value = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(row.iv) }, await cryptoKey(), fromBase64(row.ciphertext)))); return { value, updatedAt: row.updatedAt }; };
