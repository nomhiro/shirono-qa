import { Group } from '@/types/group'

export interface GroupsResponse {
  success: boolean
  groups?: Group[]
  error?: string
}

export interface CreateGroupRequest {
  name: string
  description: string
}

export interface CreateGroupResponse {
  success: boolean
  group?: Group
  error?: string
}

// グループ一覧を取得
export async function getGroups(): Promise<GroupsResponse> {
  try {
    const response = await fetch('/api/admin/groups', {
      method: 'GET',
      credentials: 'include',
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to fetch groups'
      }
    }

    return {
      success: true,
      groups: data.groups || []
    }
  } catch (error) {
    console.error('Error fetching groups:', error)
    return {
      success: false,
      error: 'Network error occurred'
    }
  }
}

// 新しいグループを作成
export async function createGroup(groupData: CreateGroupRequest): Promise<CreateGroupResponse> {
  try {
    const response = await fetch('/api/admin/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(groupData)
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to create group'
      }
    }

    return {
      success: true,
      group: data.group
    }
  } catch (error) {
    console.error('Error creating group:', error)
    return {
      success: false,
      error: 'Network error occurred'
    }
  }
}