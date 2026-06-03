import React from 'react'
import { Link } from 'react-router-dom'

const navItems = [
  { path: '/', label: '学习', icon: '📖' },
  { path: '/library', label: '词库', icon: '📚' },
  { path: '/roots', label: '词根', icon: '🌱' },
  { path: '/achievements', label: '成就', icon: '🏆' },
  { path: '/reading', label: '阅读', icon: '📰' },
  { path: '/search', label: '搜索', icon: '🔍' },
  { path: '/stats', label: '统计', icon: '📊' },
  { path: '/settings', label: '设置', icon: '⚙️' },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 overflow-x-auto scrollbar-hide">
      <div className="flex justify-around min-w-max mx-auto">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className="flex flex-col items-center py-2 px-4 text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
