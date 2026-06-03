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

// ==================== 易错词 ====================

/**
 * 获取易错词列表 — 基于 reviewHistory 判断
 * 条件：连续忘记≥2次 或 忘记+模糊占比≥40% 或 最近3次中≥2次忘记
 */
export async function getWeakWords(planId) {
  const d = await getDB();
  const all = await d.getAllFromIndex('words', 'planId', planId);
  
  return all.filter(w => {
    const history = w.reviewHistory || [];
    if (history.length < 2) return false;
    
    const recent = history.slice(-5);
    const forgotCount = recent.filter(r => r.rating === 'forgot').length;
    const hazyCount = recent.filter(r => r.rating === 'hazy').length;
    const totalRecent = recent.length;
    
    // 条件1: 连续忘记 ≥ 2 次
    let consecutiveForgot = 0;
    for (let i = recent.length - 1; i >= 0; i--) {
      if (recent[i].rating === 'forgot') consecutiveForgot++;
      else break;
    }
    if (consecutiveForgot >= 2) return true;
    
    // 条件2: 最近忘记 + 模糊占比 ≥ 40%
    if ((forgotCount + hazyCount) / totalRecent >= 0.4) return true;
    
    // 条件3: 最近 3 次中 ≥ 2 次忘记
    const last3 = recent.slice(-3);
    if (last3.length >= 2 && last3.filter(r => r.rating === 'forgot').length >= 2) return true;
    
    return false;
  });
}

/**
 * 获取单词的易错标签
 */
export function getWordWeakness(word) {
  const history = word.reviewHistory || [];
  if (history.length < 2) return { weak: false, level: 'none', reason: '' };
  
  const recent = history.slice(-5);
  const forgot = recent.filter(r => r.rating === 'forgot').length;
  const hazy = recent.filter(r => r.rating === 'hazy').length;
  const total = recent.length;
  
  let consecutiveForgot = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].rating === 'forgot') consecutiveForgot++;
    else break;
  }
  
  if (consecutiveForgot >= 3) return { weak: true, level: 'severe', reason: '连续 3 次忘记' };
  if (consecutiveForgot >= 2) return { weak: true, level: 'warning', reason: '连续 2 次忘记' };
  if (total >= 3 && forgot >= 2) return { weak: true, level: 'warning', reason: '最近多次忘记' };
  if ((forgot + hazy) / total >= 0.4) return { weak: true, level: 'mild', reason: '正确率偏低' };
  
  return { weak: false, level: 'none', reason: '' };
}

// ==================== 复习预测 ====================

/**
 * 获取未来 N 天每天到期复习数
 */
export async function getReviewForecast(planId, days = 60) {
  const d = await getDB();
  const all = await d.getAllFromIndex('words', 'planId', planId);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const forecast = {};
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    forecast[key] = 0;
  }
  
  for (const w of all) {
    if (!w.nextReviewTime || w.isPaused) continue;
    const reviewDate = new Date(w.nextReviewTime);
    reviewDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((reviewDate - today) / 86400000);
    if (diffDays >= 0 && diffDays < days) {
      const key = reviewDate.toISOString().slice(0, 10);
      forecast[key] = (forecast[key] || 0) + 1;
    }
  }
  
  return forecast;
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

/**
 * 增量更新每日统计（每次学习一个单词后调用）
 */
export async function accumulateDailyStat(planId, wordRating, isNew) {
  const d = await getDB();
  const today = new Date().toISOString().slice(0, 10);
  const existing = await d.get('dailyStats', today) || { date: today, planId, reviewed: 0, correct: 0, hazy: 0, forgot: 0, newLearned: 0, timestamp: Date.now() };
  existing.reviewed += 1;
  existing.correct += wordRating === 'known' ? 1 : 0;
  existing.hazy += wordRating === 'hazy' ? 1 : 0;
  existing.forgot += wordRating === 'forgot' ? 1 : 0;
  existing.newLearned += isNew ? 1 : 0;
  existing.timestamp = Date.now();
  return d.put('dailyStats', existing);
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
