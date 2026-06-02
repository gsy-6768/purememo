/**
 * IndexedDB 数据库操作封装
 * 使用 idb 库提供简洁的异步 API
 */
import { openDB } from 'idb';

const DB_NAME = 'PureMemoDB';
const DB_VERSION = 1;

let db = null;

export async function getDB() {
  if (db) return db;
  
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion, newVersion, transaction) {
      // 单词库表：存储所有词库的原始单词
      if (!database.objectStoreNames.contains('libraries')) {
        const libStore = database.createObjectStore('libraries', { keyPath: 'id' });
        libStore.createIndex('name', 'name', { unique: false });
      }

      // 学习计划表
      if (!database.objectStoreNames.contains('plans')) {
        const planStore = database.createObjectStore('plans', { keyPath: 'id' });
        planStore.createIndex('name', 'name', { unique: true });
      }

      // 学习记录表：存储每个单词的学习状态
      if (!database.objectStoreNames.contains('words')) {
        const wordStore = database.createObjectStore('words', { keyPath: 'id' });
        wordStore.createIndex('planId', 'planId', { unique: false });
        wordStore.createIndex('word', 'word', { unique: false });
        wordStore.createIndex('nextReviewTime', 'nextReviewTime', { unique: false });
      }

      // 每日统计表
      if (!database.objectStoreNames.contains('dailyStats')) {
        const statsStore = database.createObjectStore('dailyStats', { keyPath: 'date' });
      }

      // 设置表
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
    }
  });
  
  return db;
}

// ==================== 词库管理 ====================

export async function getAllLibraries() {
  const d = await getDB();
  return d.getAll('libraries');
}

export async function getLibrary(id) {
  const d = await getDB();
  return d.get('libraries', id);
}

export async function saveLibrary(library) {
  const d = await getDB();
  return d.put('libraries', library);
}

export async function deleteLibrary(id) {
  const d = await getDB();
  return d.delete('libraries', id);
}

// ==================== 学习计划 ====================

export async function getAllPlans() {
  const d = await getDB();
  return d.getAll('plans');
}

export async function getPlan(id) {
  const d = await getDB();
  return d.get('plans', id);
}

export async function savePlan(plan) {
  const d = await getDB();
  return d.put('plans', plan);
}

export async function deletePlan(id) {
  const d = await getDB();
  await d.delete('plans', id);
  // 同时删除该计划下的所有单词记录
  const tx = d.transaction('words', 'readwrite');
  const words = await tx.store.index('planId').getAll(id);
  for (const w of words) {
    await tx.store.delete(w.id);
  }
  await tx.done;
}

// ==================== 单词学习记录 ====================

export async function getWordsByPlan(planId) {
  const d = await getDB();
  return d.getAllFromIndex('words', 'planId', planId);
}

export async function getWord(id) {
  const d = await getDB();
  return d.get('words', id);
}

export async function saveWord(word) {
  const d = await getDB();
  return d.put('words', word);
}

export async function saveWordsBulk(words) {
  const d = await getDB();
  const tx = d.transaction('words', 'readwrite');
  for (const w of words) {
    await tx.store.put(w);
  }
  await tx.done;
}

export async function deleteWord(id) {
  const d = await getDB();
  return d.delete('words', id);
}

export async function getDueWords(planId) {
  const d = await getDB();
  const all = await d.getAllFromIndex('words', 'planId', planId);
  const now = Date.now();
  // 筛选已到期需要复习的
  return all.filter(w => w.nextReviewTime && w.nextReviewTime <= now && !w.isPaused);
}

export async function getNewWords(planId, limit) {
  const d = await getDB();
  const all = await d.getAllFromIndex('words', 'planId', planId);
  // 从未学习过的（没有 nextReviewTime 或没有 reviewHistory）
  const newWords = all.filter(w => !w.nextReviewTime && !w.isPaused);
  return newWords.slice(0, limit);
}

// ==================== 每日统计 ====================

export async function getDailyStat(date) {
  const d = await getDB();
  return d.get('dailyStats', date);
}

export async function getAllDailyStats() {
  const d = await getDB();
  return d.getAll('dailyStats');
}

export async function saveDailyStat(stat) {
  const d = await getDB();
  return d.put('dailyStats', stat);
}

// ==================== 设置 ====================

export async function getSetting(key) {
  const d = await getDB();
  const result = await d.get('settings', key);
  return result ? result.value : null;
}

export async function setSetting(key, value) {
  const d = await getDB();
  return d.put('settings', { key, value });
}

export async function getAllSettings() {
  const d = await getDB();
  return d.getAll('settings');
}

// ==================== 数据导出/恢复 ====================

export async function exportAllData() {
  const d = await getDB();
  const data = {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    libraries: await d.getAll('libraries'),
    plans: await d.getAll('plans'),
    words: await d.getAll('words'),
    dailyStats: await d.getAll('dailyStats'),
    settings: await d.getAll('settings')
  };
  return data;
}

export async function importAllData(data) {
  const d = await getDB();
  const tx = d.transaction(['libraries', 'plans', 'words', 'dailyStats', 'settings'], 'readwrite');
  
  for (const lib of data.libraries || []) await tx.objectStore('libraries').put(lib);
  for (const plan of data.plans || []) await tx.objectStore('plans').put(plan);
  for (const word of data.words || []) await tx.objectStore('words').put(word);
  for (const stat of data.dailyStats || []) await tx.objectStore('dailyStats').put(stat);
  for (const setting of data.settings || []) await tx.objectStore('settings').put(setting);
  
  await tx.done;
}

export async function clearAllData() {
  const d = await getDB();
  const stores = ['libraries', 'plans', 'words', 'dailyStats', 'settings'];
  const tx = d.transaction(stores, 'readwrite');
  for (const store of stores) {
    await tx.objectStore(store).clear();
  }
  await tx.done;
}
