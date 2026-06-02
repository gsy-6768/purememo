import React, { useState, useEffect } from 'react'
import { getAllDailyStats, getWordsByPlan, getAllPlans, exportAllData, importAllData, clearAllData } from '../db/database.js'
import { calculateCurrentMemoryStrength, getMasteryLevel } from '../algorithms/spaced-repetition.js'

export default function Statistics() {
  const [dailyStats, setDailyStats] = useState([])
  const [plans, setPlans] = useState([])
  const [masteryData, setMasteryData] = useState({ unlearned: 0, learning: 0, mastered: 0, forgotten: 0 })
  const [tab, setTab] = useState('daily')

  useEffect(() => {
    async function load() {
      const stats = await getAllDailyStats()
      setDailyStats(stats.sort((a, b) => a.date.localeCompare(b.date)).slice(-30))
      
      const p = await getAllPlans()
      setPlans(p)
      
      // 统计掌握程度
      let unlearned = 0, learning = 0, mastered = 0, forgotten = 0
      for (const plan of p) {
        const words = await getWordsByPlan(plan.id)
        for (const w of words) {
          const level = getMasteryLevel(w)
          if (level === 'unlearned') unlearned++
          else if (level === 'learning') learning++
          else if (level === 'mastered') mastered++
          else forgotten++
        }
      }
      setMasteryData({ unlearned, learning, mastered, forgotten })
    }
    load()
  }, [])

  async function handleExport() {
    const data = await exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `PureMemo_backup_${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const data = JSON.parse(text)
        await importAllData(data)
        alert('数据恢复成功！请刷新页面')
        window.location.reload()
      } catch { alert('文件格式错误') }
    }
    input.click()
  }

  async function handleClearData() {
    if (!confirm('确定清除所有数据？此操作不可恢复！')) return
    if (!confirm('再次确认：所有学习记录将被永久删除！')) return
    await clearAllData()
    alert('数据已清除')
    window.location.reload()
  }

  const total = masteryData.unlearned + masteryData.learning + masteryData.mastered + masteryData.forgotten
  const masteredPct = total > 0 ? Math.round((masteryData.mastered / total) * 100) : 0

  return (
    <div className="pb-20 px-4 max-w-lg mx-auto">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold">📊 数据统计</h1>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'daily', label: '每日学习' },
          { key: 'mastery', label: '掌握程度' },
          { key: 'data', label: '数据管理' }
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium btn-press ${
              tab === t.key ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'daily' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
          <h2 className="font-semibold mb-4">最近 30 天学习记录</h2>
          {dailyStats.length === 0 ? (
            <p className="text-gray-400 text-center py-8">暂无学习记录，开始学习吧！</p>
          ) : (
            <div className="space-y-2">
              {dailyStats.slice().reverse().map(stat => (
                <div key={stat.date} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <span className="text-sm text-gray-500">{stat.date}</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-primary-500">新学 {stat.newLearned || 0}</span>
                    <span className="text-gray-500">复习 {stat.reviewed || 0}</span>
                    <span className={`${(stat.correct / Math.max(1, stat.reviewed)) > 0.7 ? 'text-success-500' : 'text-warning-500'}`}>
                      {stat.reviewed > 0 ? Math.round((stat.correct / stat.reviewed) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'mastery' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
          <h2 className="font-semibold mb-4">单词掌握分布</h2>
          {total === 0 ? (
            <p className="text-gray-400 text-center py-8">暂无单词数据</p>
          ) : (
            <>
              {/* 环形进度图简化版 */}
              <div className="flex justify-center mb-6">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="10"
                      strokeDasharray={`${masteredPct * 2.51} 251`} strokeLinecap="round"
                      transform="rotate(-90 50 50)" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-success-500">{masteredPct}%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">未学习</span><span>{masteryData.unlearned}</span></div>
                <div className="flex justify-between"><span className="text-warning-500">学习中</span><span>{masteryData.learning}</span></div>
                <div className="flex justify-between"><span className="text-success-500">已掌握</span><span>{masteryData.mastered}</span></div>
                <div className="flex justify-between"><span className="text-danger-400">已遗忘</span><span>{masteryData.forgotten}</span></div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'data' && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
            <h2 className="font-semibold mb-3">备份与恢复</h2>
            <div className="flex gap-2">
              <button onClick={handleExport} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium btn-press">
                📤 导出备份
              </button>
              <button onClick={handleImport} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium btn-press">
                📥 恢复备份
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
            <h2 className="font-semibold mb-3 text-danger-500">危险操作</h2>
            <button onClick={handleClearData} className="w-full py-2.5 border border-danger-300 text-danger-500 rounded-lg text-sm font-medium btn-press">
              🗑 清除所有数据
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
