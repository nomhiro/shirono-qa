'use client'

import Link from 'next/link'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex" aria-label="パンくずリスト">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRightIcon className="flex-shrink-0 h-4 w-4 text-gray-400 mx-2" />
            )}
            {item.current ? (
              <span className="text-sm font-medium text-gray-500 truncate">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href || '#'}
                className="text-sm font-medium text-blue-600 hover:text-blue-500 truncate"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}