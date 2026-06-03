import React, { useState, useEffect } from 'react'
import { getAllPlans, getWordsByPlan, getAllDailyStats } from '../db/database.js'
import { ACHIEVEMENTS, TIER_CONFIG, getAllAchievements } from '../db/achievements.js'
import { PageSkeleton } from './Skeleton.jsx'

export default function Achievements() {
  const [achievements, setAchievements] = useState([])
  const [stats, setStats] = useState({ totalLearned: 0, totalReviews: 0, streak: 0, dailyMax: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const p = await getAllPlans()
      let totalLearned = 0, totalReviews = 0

      for (const plan of p) {
        const words = await getWordsByPlan(plan.id)
        totalLearned += words.filter(w => w.lastReviewTime).length
        totalReviews += words.reduce((s, w) => s + (w.totalReviews || 0), 0)
      }

      // Calculate streak
      const allStats = await getAllDailyStats()
      const dateSet = new Set(allStats.map(s => s.date))
      let streak = 0
      const d = new Date()
      while (true) {
        if (dateSet.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
        else break
      }

      // Daily max
      const dailyMax = allStats.reduce((m, s) => Math.max(m, (s.newLearned || 0) + (s.reviewed || 0)), 0)

      const s = { totalLearned, totalReviews, streak, dailyMax }
      setStats(s)

      const ach = await getAllAchievements(s)
      setAchievements(ach)
      setLoading(false)
    }
    load()
  }, [])

  const unlockedCount = achievements.filter(a => a.unlocked).length

  if (loading) return <PageSkeleton />

  return (
    <div className="pb-20 px-4 max-w-lg mx-auto">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold">🏆 成就</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          已解锁 {unlockedCount} / {achievements.length}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-3 text-center">
          <div className="text-xl font-bold text-primary-600">{stats.totalLearned}</div>
          <div className="text-xs text-gray-400">已学单词</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-3 text-center">
          <div className="text-xl font-bold text-success-500">{stats.totalReviews}</div>
          <div className="text-xs text-gray-400">累计复习</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-3 text-center">
          <div className="text-xl font-bold text-orange-500">{stats.streak}</div>
          <div className="text-xs text-gray-400">连续天数</div>
        </div>
      </div>

      {/* 成就列表 */}
      <div className="space-y-2">
        {achievements.map(ach => {
          const tier = TIER_CONFIG[ach.tier]
          return (
            <div key={ach.id} className={`bg-white dark:bg-gray-800 rounded-xl card-shadow p-4 border-l-4 ${ach.unlocked ? 'border-success-500' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ach.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{ach.title}</span>
                    {ach.unlocked && <span className="text-xs text-success-500">✅ 已解锁</span>}
                  </div>
                  <div className="text-xs text-gray-400">{ach.desc}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${ach.unlocked ? 'bg-success-500' : 'bg-primary-500'}`}
                        style={{ width: `${ach.progress}%` }} />
                    </div>
                    <span className={`text-[10px] font-medium ${ach.unlocked ? 'text-success-500' : 'text-gray-400'}`}>
                      {ach.progress}%
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tier.bg} ${tier.color} ${tier.border} border`}>
                  {tier.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
