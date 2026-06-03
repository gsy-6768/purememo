import React from 'react'

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
    </div>
  )
}

export function ListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="pb-20 px-4 max-w-lg mx-auto animate-pulse">
      <div className="pt-6 pb-4">
        <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
      <div className="space-y-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  )
}
