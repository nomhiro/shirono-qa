'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  onUserLoaded?: (user: User) => void
}

export default function AppHeader({ title, breadcrumbItems = [], onUserLoaded }: AppHeaderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        router.push('/')
        return
      }
      const userData = await response.json()
      setUser(userData.user)
    } catch {
      router.push('/')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 初回のみ実行

  // ユーザーが変更されたときにonUserLoadedを呼び出す
  useEffect(() => {
    if (user && onUserLoaded) {
      onUserLoaded(user)
    }
  }, [user, onUserLoaded])

  // 自動的にパンくずリストを生成
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (breadcrumbItems.length > 0) {
      return breadcrumbItems
    }

    const items: BreadcrumbItem[] = [
      { label: 'ホーム', href: '/questions' }
    ]

    if (pathname.startsWith('/questions/new')) {
      items.push({ label: '新規投稿', current: true })
    } else if (pathname.startsWith('/questions/') && pathname !== '/questions') {
      items.push({ label: '投稿詳細', current: true })
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
              shiro Assistant
            </Link>

            <div className="hidden md:block">
              <Breadcrumb items={breadcrumbs} />
            </div>
          </div>

          {/* 右側: ブログリンク・ユーザーメニュー */}
          <div className="flex items-center space-x-3">
            {/* 技術ブログリンク */}
            <a
              href="https://zenn.dev/nomhiro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1"
              title="技術ブログ (Zenn)"
            >
              <Image
                src="/icons/blog-icon.svg"
                alt="ブログ"
                width={20}
                height={20}
                className="w-5 h-5"
              />
            </a>
            
            {/* Azure Update情報サイトリンク */}
            <a
              href="https://azure.koudaiii.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-500 transition-colors duration-200 p-1"
              title="Azure Update情報"
            >
              <Image
                src="/icons/azure-icon.svg"
                alt="Azure"
                width={20}
                height={20}
                className="w-5 h-5"
              />
            </a>
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