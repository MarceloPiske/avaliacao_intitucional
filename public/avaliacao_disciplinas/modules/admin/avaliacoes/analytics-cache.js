// analytics-cache.js

// Importamos o 'idb' de um CDN, tal como você faz com o Firebase
import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@7/build/index.js';

const DB_NAME = 'analytics-cache';
const STORE_NAME = 'data-store';
const CACHE_KEY = 'full-analytics-data';
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 horas

export class AnalyticsCache {
  constructor() {
    this.dbPromise = null;
  }

  getDB() {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, 1, {
        upgrade(db) {
          db.createObjectStore(STORE_NAME);
        },
      });
    }
    return this.dbPromise;
  }

  async getCachedAnalyticsData() {
    try {
      const db = await this.getDB();
      const cached = await db.get(STORE_NAME, CACHE_KEY);
      
      if (!cached) {
        console.log('Cache (IDB): Vazio.');
        return null;
      }
      
      const isStale = (Date.now() - cached.timestamp) > CACHE_DURATION_MS;
      if (isStale) {
        console.log('Cache (IDB): Expirado.');
        return null;
      }

      console.log('Cache (IDB): Dados carregados com sucesso.');
      return cached.data;
    } catch (error) {
      console.error('Cache (IDB): Erro ao ler:', error);
      return null;
    }
  }

  async setCachedAnalyticsData(data) {
    try {
      const db = await this.getDB();
      const item = {
        data: data,
        timestamp: Date.now()
      };
      await db.put(STORE_NAME, item, CACHE_KEY);
      console.log('Cache (IDB): Dados frescos salvos.');
    } catch (error) {
      console.error('Cache (IDB): Erro ao salvar:', error);
    }
  }
}