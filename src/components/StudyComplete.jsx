import React, { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { getPlan, getAllPlans, getWordsByPlan, getAllDailyStats } from '../db/database.js'
import { checkAchievements } from '../db/achievements.js'

export default function StudyComplete() {
  const { planId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [newAchievements, setNewAchievements] = useState([])
  const stats = location.state?.stats || { reviewed: 0, correct: 0, hazy: 0, forgot: 0, newLearned: 0 }

  useEffect(() => {
    getPlan(planId).then(setPlan)
    
    async function onComplete() {
      const p = await getPlan(planId)
      setPlan(p)
      
      // 每日统计已由 StudyView 的 accumulateDailyStat 实时记录
      // 这里只检测成就
      const all = await getAllPlans()
      let totalLearned = 0, totalReviews = 0
      for (const pl of all) {
        const words = await getWordsByPlan(pl.id)
        totalLearned += words.filter(w => w.lastReviewTime).length
        totalReviews += words.reduce((s, w) => s + (w.totalReviews || 0), 0)
      }
      const allStats = await getAllDailyStats()
      const dateSet = new Set(allStats.map(s => s.date))
      let streak = 0
      const d = new Date()
      while (true) {
        if (dateSet.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
        else break
      }
      const dailyMax = allStats.reduce((m, s) => Math.max(m, (s.newLearned || 0) + (s.reviewed || 0)), 0)
      
      const newAch = await checkAchievements({ totalLearned, totalReviews, streak, dailyMax })
      if (newAch.length > 0) setNewAchievements(newAch)
    }
    onComplete()
  }, [])

  const accuracy = stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : 0

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 max-w-lg mx-auto">
      {/* 新成就弹窗 */}
      {newAchievements.length > 0 && (
        <div className="w-full bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl card-shadow p-4 mb-4 text-center border border-yellow-200 dark:border-yellow-700">
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-sm font-bold text-yellow-700 dark:text-yellow-400 mb-2">成就解锁！</div>
          {newAchievements.map(ach => (
            <div key={ach.id} className="flex items-center gap-2 justify-center text-sm mb-1 last:mb-0">
              <span>{ach.icon}</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{ach.title}</span>
              <span className="text-xs text-gray-400">— {ach.desc}</span>
            </div>
          ))}
        </div>
      )}

      <div className="text-5xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold mb-2">学习完成！</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">{plan?.name || ''}</p>

      <div className="w-full bg-white dark:bg-gray-800 rounded-xl card-shadow p-6 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">今日新学</span>
          <span className="font-semibold text-lg">{stats.newLearned}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">今日复习</span>
          <span className="font-semibold text-lg">{stats.reviewed - stats.newLearned}</span>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">正确率</span>
            <span className="font-semibold text-lg text-success-500">{accuracy}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-2">
            <div className="bg-success-500 h-2 rounded-full" style={{ width: `${accuracy}%` }}></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 text-center text-sm">
          <div>
            <div className="text-success-500 font-bold text-lg">{stats.correct}</div>
            <div className="text-gray-400">认识</div>
          </div>
          <div>
            <div className="text-warning-500 font-bold text-lg">{stats.hazy}</div>
            <div className="text-gray-400">模糊</div>
          </div>
          <div>
            <div className="text-danger-500 font-bold text-lg">{stats.forgot}</div>
            <div className="text-gray-400">忘记</div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8 w-full">
        <button onClick={() => navigate(`/study/${planId}`)} className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium btn-press">
          继续学习
        </button>
        <button onClick={() => navigate('/')} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium btn-press">
          返回首页
        </button>
      </div>
    </div>
  )
}
