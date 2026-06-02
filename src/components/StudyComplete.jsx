import React, { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { getPlan, saveDailyStat } from '../db/database.js'

export default function StudyComplete() {
  const { planId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const stats = location.state?.stats || { reviewed: 0, correct: 0, hazy: 0, forgot: 0, newLearned: 0 }

  useEffect(() => {
    getPlan(planId).then(setPlan)
    
    // 保存每日统计
    const today = new Date().toISOString().slice(0, 10)
    saveDailyStat({
      date: today,
      planId,
      reviewed: stats.reviewed,
      correct: stats.correct,
      hazy: stats.hazy,
      forgot: stats.forgot,
      newLearned: stats.newLearned,
      timestamp: Date.now()
    })
  }, [])

  const accuracy = stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : 0

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 max-w-lg mx-auto">
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
