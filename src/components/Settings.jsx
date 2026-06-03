import React, { useState, useEffect } from 'react'
import { getSetting, setSetting } from '../db/database.js'

export default function Settings({ darkMode, toggleDark, fontSize, setFontSize }) {
  const [settings, setSettings] = useState({
    dailyNewLimit: 5000,
    dailyReviewLimit: 5000,
    autoSpeak: true,
    newOrder: 'mixed'
  })

  useEffect(() => {
    async function load() {
      const dailyNewLimit = await getSetting('dailyNewLimit') || '20'
      const dailyReviewLimit = await getSetting('dailyReviewLimit') || '100'
      const autoSpeak = await getSetting('autoSpeak')
      const newOrder = await getSetting('newOrder') || 'mixed'
      setSettings({
        dailyNewLimit: parseInt(dailyNewLimit),
        dailyReviewLimit: parseInt(dailyReviewLimit),
        autoSpeak: autoSpeak !== 'false',
        newOrder
      })
    }
    load()
  }, [])

  async function updateSetting(key, value) {
    await setSetting(key, value.toString())
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="pb-20 px-4 max-w-lg mx-auto">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold">⚙️ 设置</h1>
      </div>

      <div className="space-y-4">
        {/* 学习目标 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
          <h2 className="font-semibold mb-4">学习目标</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 block mb-1">每日新学单词上限</label>
              {/* 快捷按钮 */}
              <div className="flex gap-1.5 mb-2">
                {[20, 50, 100, 200].map(n => (
                  <button key={n} onClick={() => updateSetting('dailyNewLimit', n)}
                    className={`flex-1 py-1.5 rounded text-xs font-medium btn-press ${
                      settings.dailyNewLimit === n ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >{n} 词</button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input type="range" min="5" max="5000" step="5"
                  value={settings.dailyNewLimit}
                  onChange={e => updateSetting('dailyNewLimit', parseInt(e.target.value))}
                  className="flex-1 accent-primary-600" />
                <input type="number" min="5" max="5000"
                  value={settings.dailyNewLimit}
                  onChange={e => updateSetting('dailyNewLimit', Math.max(5, parseInt(e.target.value) || 5))}
                  className="w-16 text-center font-semibold py-1 border border-gray-200 dark:border-gray-600 rounded bg-transparent dark:text-white text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">每日复习上限</label>
              <div className="flex items-center gap-3">
                <input type="range" min="20" max="5000" step="10"
                  value={settings.dailyReviewLimit}
                  onChange={e => updateSetting('dailyReviewLimit', parseInt(e.target.value))}
                  className="flex-1 accent-primary-600" />
                <span className="font-semibold w-12 text-center">{settings.dailyReviewLimit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 发音 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
          <h2 className="font-semibold mb-4">发音</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm">自动发音</span>
            <button onClick={() => updateSetting('autoSpeak', !settings.autoSpeak)}
              className={`w-12 h-6 rounded-full transition-colors ${settings.autoSpeak ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.autoSpeak ? 'translate-x-6.5' : 'translate-x-0.5'}`}></div>
            </button>
          </div>
        </div>

        {/* 界面 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
          <h2 className="font-semibold mb-4">界面</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">深色模式</span>
              <button onClick={toggleDark}
                className={`w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-6.5' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">字体大小</label>
              <div className="flex gap-2">
                {[
                  { key: 'small', label: '小' },
                  { key: 'medium', label: '中' },
                  { key: 'large', label: '大' }
                ].map(opt => (
                  <button key={opt.key} onClick={() => setFontSize(opt.key)}
                    className={`flex-1 py-2 rounded-lg text-sm btn-press ${
                      fontSize === opt.key ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 学习顺序 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
          <h2 className="font-semibold mb-4">学习顺序</h2>
          <div className="space-y-2">
            {[
              { key: 'mixed', label: '复习+新词混合' },
              { key: 'reviewFirst', label: '优先复习' },
              { key: 'newFirst', label: '先学新词' }
            ].map(opt => (
              <label key={opt.key} className="flex items-center gap-3 py-1.5">
                <input type="radio" name="order" checked={settings.newOrder === opt.key}
                  onChange={() => updateSetting('newOrder', opt.key)}
                  className="accent-primary-600" />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 关于 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
          <h2 className="font-semibold mb-2">关于</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            PureMemo v1.0 — 纯算法版墨墨背单词复刻<br />
            100% 离线运行 · 无广告 · 无数据收集<br />
            核心算法：改良版艾宾浩斯遗忘曲线间隔重复
          </p>
        </div>
      </div>
    </div>
  )
}
