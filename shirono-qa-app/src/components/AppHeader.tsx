'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import Breadcrumb, { BreadcrumbItem } from './Breadcrumb'
import UserMenu from './UserMenu'

interface User {
  id: string
  username: string
  email: string
  isAdmin: boolean
  groupId: string
}

interface AppHeaderProps {
  title?: string
  breadcrumbItems?: BreadcrumbItem[]
}

export default function AppHeader({ title, breadcrumbItems = [] }: AppHeaderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        router.push('/')
        return
      }
      const userData = await response.json()
      setUser(userData.user)
    } catch (error) {
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  // 自動的にパンくずリストを生成
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (breadcrumbItems.length > 0) {
      return breadcrumbItems
    }

    const items: BreadcrumbItem[] = [
      { label: 'ホーム', href: '/questions' }
    ]

    if (pathname.startsWith('/questions/new')) {
      items.push({ label: '新規質問', current: true })
    } else if (pathname.startsWith('/questions/') && pathname !== '/questions') {
      items.push({ label: '質問詳細', current: true })
    } else if (pathname.startsWith('/admin/users')) {
      items.push({ label: '管理', href: '/admin' })
      items.push({ label: 'ユーザー管理', current: true })
    } else if (pathname.startsWith('/admin/groups')) {
      items.push({ label: '管理', href: '/admin' })
      items.push({ label: 'グループ管理', current: true })
    } else if (pathname === '/questions') {
      items[0].current = true
      delete items[0].href
    }

    return items
  }

  if (loading) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="animate-pulse flex space-x-4">
              <div className="h-6 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded-full w-8"></div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  if (!user) {
    return null
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* 左側: ロゴ・タイトル・パンくずリスト */}
          <div className="flex items-center space-x-4">
            <Link
              href="/questions"
              className="text-xl font-bold text-blue-600 hover:text-blue-700"
            >
              shiro no QA
            </Link>

            <div className="hidden md:block">
              <Breadcrumb items={breadcrumbs} />
            </div>
          </div>

          {/* 右側: ユーザーメニュー */}
          <div className="flex items-center space-x-4">
            <UserMenu user={user} />
          </div>
        </div>

        {/* モバイル用パンくずリスト */}
        <div className="md:hidden pb-3">
          <Breadcrumb items={breadcrumbs} />
        </div>

        {/* ページタイトル */}
        {title && (
          <div className="pb-4">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
        )}
      </div>
    </header>
  )
}