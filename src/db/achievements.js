/**
 * 成就系统定义和检测
 */
import { getSetting, setSetting } from './database.js'

const ACHIEVEMENTS = [
  {
    id: 'first100',
    title: '初出茅庐',
    icon: '🥚',
    desc: '累计学完 100 个单词',
    tier: 'bronze', // 🥉
    check: (stats) => stats.totalLearned >= 100,
    progress: (stats) => Math.min(100, Math.round((stats.totalLearned / 100) * 100)),
  },
  {
    id: 'fiveHundred',
    title: '百词斩',
    icon: '✂️',
    desc: '累计学完 500 个单词',
    tier: 'bronze',
    check: (stats) => stats.totalLearned >= 500,
    progress: (stats) => Math.min(100, Math.round((stats.totalLearned / 500) * 100)),
  },
  {
    id: 'thousand',
    title: '千词户',
    icon: '📚',
    desc: '累计学完 1000 个单词',
    tier: 'silver',
    check: (stats) => stats.totalLearned >= 1000,
    progress: (stats) => Math.min(100, Math.round((stats.totalLearned / 1000) * 100)),
  },
  {
    id: 'master',
    title: '词汇达人',
    icon: '🏆',
    desc: '累计学完 3000 个单词',
    tier: 'gold',
    check: (stats) => stats.totalLearned >= 3000,
    progress: (stats) => Math.min(100, Math.round((stats.totalLearned / 3000) * 100)),
  },
  {
    id: 'streak7',
    title: '坚持不懈',
    icon: '🔥',
    desc: '连续学习 7 天',
    tier: 'bronze',
    check: (stats) => stats.streak >= 7,
    progress: (stats) => Math.min(100, Math.round((stats.streak / 7) * 100)),
  },
  {
    id: 'streak30',
    title: '持之以恒',
    icon: '💪',
    desc: '连续学习 30 天',
    tier: 'silver',
    check: (stats) => stats.streak >= 30,
    progress: (stats) => Math.min(100, Math.round((stats.streak / 30) * 100)),
  },
  {
    id: 'streak100',
    title: '学霸',
    icon: '👑',
    desc: '连续学习 100 天',
    tier: 'gold',
    check: (stats) => stats.streak >= 100,
    progress: (stats) => Math.min(100, Math.round((stats.streak / 100) * 100)),
  },
  {
    id: 'daily100',
    title: '一日千里',
    icon: '⚡',
    desc: '一天内学完 100 个单词',
    tier: 'silver',
    check: (stats) => stats.dailyMax >= 100,
    progress: (stats) => Math.min(100, Math.round(((stats.dailyMax || 0) / 100) * 100)),
  },
  {
    id: 'review500',
    title: '温故知新',
    icon: '🔄',
    desc: '累计复习 500 次',
    tier: 'bronze',
    check: (stats) => stats.totalReviews >= 500,
    progress: (stats) => Math.min(100, Math.round((stats.totalReviews / 500) * 100)),
  },
  {
    id: 'review2000',
    title: '精益求精',
    icon: '💎',
    desc: '累计复习 2000 次',
    tier: 'gold',
    check: (stats) => stats.totalReviews >= 2000,
    progress: (stats) => Math.min(100, Math.round((stats.totalReviews / 2000) * 100)),
  },
]

const TIER_CONFIG = {
  bronze: { label: '青铜', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-300 dark:border-amber-700' },
  silver: { label: '白银', color: 'text-gray-500 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-700', border: 'border-gray-300 dark:border-gray-600' },
  gold: { label: '黄金', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-300 dark:border-yellow-700' },
}

export { ACHIEVEMENTS, TIER_CONFIG }

/**
 * 获取已解锁的成就 ID 列表
 */
export async function getUnlockedIds() {
  const val = await getSetting('achievements')
  return val ? JSON.parse(val) : []
}

/**
 * 保存已解锁成就
 */
async function saveUnlocked(ids) {
  await setSetting('achievements', JSON.stringify(ids))
}

/**
 * 检查并解锁新成就
 * @param {Object} stats - { totalLearned, totalReviews, streak, dailyMax }
 * @returns {Array} 新解锁的成就列表
 */
export async function checkAchievements(stats) {
  const unlocked = await getUnlockedIds()
  const newlyUnlocked = []

  for (const ach of ACHIEVEMENTS) {
    if (!unlocked.includes(ach.id) && ach.check(stats)) {
      newlyUnlocked.push(ach)
      unlocked.push(ach.id)
    }
  }

  if (newlyUnlocked.length > 0) {
    await saveUnlocked(unlocked)
  }

  return newlyUnlocked
}

/**
 * 获取所有成就的状态
 */
export async function getAllAchievements(stats) {
  const unlocked = await getUnlockedIds()
  return ACHIEVEMENTS.map(ach => ({
    ...ach,
    unlocked: unlocked.includes(ach.id),
    progress: ach.progress(stats),
  }))
}
