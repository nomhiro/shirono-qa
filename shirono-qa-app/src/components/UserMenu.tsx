'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  UserCircleIcon, 
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  UserGroupIcon 
} from '@heroicons/react/24/outline'

interface User {
  id: string
  username: string
  email: string
  isAdmin: boolean
  groupId: string
}

interface UserMenuProps {
  user: User
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      })
      
      if (response.ok) {
        router.push('/')
      } else {
        console.error('サインアウトに失敗しました')
      }
    } catch (error) {
      console.error('サインアウトエラー:', error)
    }
  }

  const menuItems = [
    ...(user.isAdmin ? [
      {
        label: 'ユーザー管理',
        icon: UserGroupIcon,
        href: '/admin/users'
      },
      {
        label: 'グループ管理', 
        icon: Cog6ToothIcon,
        href: '/admin/groups'
      }
    ] : []),
    {
      label: 'サインアウト',
      icon: ArrowRightOnRectangleIcon,
      onClick: handleSignOut,
      className: 'text-red-600 hover:text-red-700'
    }
  ]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-2"
      >
        <UserCircleIcon className="h-6 w-6" />
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium">{user.username}</div>
          <div className="text-xs text-gray-500">
            {user.isAdmin ? '管理者' : '一般ユーザー'}
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {/* ユーザー情報表示 */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center">
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">{user.username}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                  <div className="text-xs text-gray-500">
                    {user.isAdmin ? '管理者' : '一般ユーザー'}
                  </div>
                </div>
              </div>
            </div>

            {/* メニュー項目 */}
            {menuItems.map((item, index) => {
              const Icon = item.icon
              
              if (item.onClick) {
                return (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center ${
                      item.className || 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </button>
                )
              }

              return (
                <a
                  key={index}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2 text-sm hover:bg-gray-100 flex items-center ${
                    item.className || 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}