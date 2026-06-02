/**
 * 改良版艾宾浩斯遗忘曲线间隔重复算法
 * 完全复刻墨墨背单词核心记忆算法
 * 
 * 核心参数：
 * - ef (Ease Factor): 熟练度因子，范围 1.3~3.0，初始 2.5
 * - interval: 当前复习间隔（小时）
 * - repetitions: 连续"认识"次数
 * - memoryStrength: 记忆持久度 (0~1)
 */

const MIN_EF = 1.3;
const MAX_EF = 3.0;
const INITIAL_EF = 2.5;

// 首次学习的间隔阶梯（小时）
const FIRST_INTERVAL = 0.167;   // 10 分钟
const SECOND_INTERVAL = 24;     // 1 天
const THIRD_INTERVAL = 72;      // 3 天
const FOURTH_INTERVAL = 168;    // 7 天

/**
 * 根据三个反馈按钮更新单词记忆状态
 * @param {Object} word - 单词当前学习状态
 * @param {string} rating - 'forgot' | 'hazy' | 'known'
 * @param {number} reactionTime - 反应时间（毫秒）
 * @returns {Object} 更新后的单词状态
 */
export function calculateNextReview(word, rating, reactionTime = 0) {
  const now = Date.now();
  let {
    ef = INITIAL_EF,
    interval = 0,
    repetitions = 0,
    memoryStrength = 0,
    totalReviews = 0,
    correctStreak = 0,
    lastReviewTime = null,
    reviewHistory = []
  } = word;

  totalReviews++;
  const newHistory = {
    timestamp: now,
    rating,
    reactionTime,
    intervalBefore: interval,
    efBefore: ef
  };

  switch (rating) {
    case 'forgot':  // 忘记 - 红色
      repetitions = 0;
      interval = FIRST_INTERVAL;
      ef = Math.max(MIN_EF, ef - 0.2);
      correctStreak = 0;
      memoryStrength = Math.max(0, memoryStrength - 0.3);
      break;

    case 'hazy':    // 模糊 - 黄色
      interval = Math.max(FIRST_INTERVAL, interval * 0.5);
      ef = Math.max(MIN_EF, ef - 0.15);
      correctStreak = 0;
      memoryStrength = Math.max(0.1, memoryStrength - 0.1);
      break;

    case 'known':   // 认识 - 绿色
      repetitions++;
      correctStreak++;

      // 根据连续正确次数计算间隔
      if (repetitions === 1) interval = SECOND_INTERVAL;
      else if (repetitions === 2) interval = THIRD_INTERVAL;
      else if (repetitions === 3) interval = FOURTH_INTERVAL;
      else interval = Math.round(interval * ef);

      ef = Math.min(MAX_EF, ef + 0.1);
      // 记忆持久度根据反应时间调整
      const timeBonus = reactionTime > 0 ? Math.min(0.15, reactionTime / 10000) : 0.05;
      memoryStrength = Math.min(1, memoryStrength + 0.1 + timeBonus);
      break;
  }

  const nextReviewTime = now + (interval * 3600 * 1000);

  newHistory.intervalAfter = interval;
  newHistory.efAfter = ef;

  return {
    ef,
    interval,
    repetitions,
    memoryStrength,
    totalReviews,
    correctStreak,
    lastReviewTime: now,
    nextReviewTime,
    reviewHistory: [...reviewHistory, newHistory]
  };
}

/**
 * 获取今日待复习的单词列表
 * @param {Array} words - 所有学习中的单词
 * @returns {Array} 今日需要复习的单词
 */
export function getTodayReviews(words) {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return words.filter(w => {
    if (!w.nextReviewTime) return false;
    // 已到期或今天内到期的
    return w.nextReviewTime <= now || 
      (w.nextReviewTime >= todayStart.getTime() && w.nextReviewTime <= now + 86400000);
  });
}

/**
 * 获取今日新学配额
 * @param {Array} learnedWords - 已学过的单词列表
 * @param {number} dailyNewLimit - 每日新学上限
 * @returns {number} 今日还可新学几个
 */
export function getTodayNewCount(learnedWords, dailyNewLimit) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayLearned = learnedWords.filter(w => 
    w.learnedDate && w.learnedDate >= todayStart.getTime()
  ).length;
  return Math.max(0, dailyNewLimit - todayLearned);
}

/**
 * 计算记忆持久度（基于当前时间）
 * 使用指数衰减模型: strength * e^(-daysSinceLastReview / halflife)
 */
export function calculateCurrentMemoryStrength(word) {
  if (!word.lastReviewTime || !word.memoryStrength) return 0;
  const daysSinceReview = (Date.now() - word.lastReviewTime) / 86400000;
  // 半衰期 = interval / 24（天），至少1天
  const halfLife = Math.max(1, (word.interval || 24) / 24);
  return word.memoryStrength * Math.exp(-daysSinceReview / halfLife);
}

/**
 * 获取单词掌握状态
 */
export function getMasteryLevel(word) {
  if (!word || !word.lastReviewTime) return 'unlearned';
  const strength = calculateCurrentMemoryStrength(word);
  if (strength >= 0.7) return 'mastered';
  if (strength >= 0.3) return 'learning';
  if (word.totalReviews > 2) return 'forgotten';
  return 'learning';
}
