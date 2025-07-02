import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getCosmosService } from '@/lib/cosmos'
import { Group } from '@/types/group'
import { v4 as uuidv4 } from 'uuid'

interface CreateGroupRequest {
  name: string
  description: string
}

export async function GET(request: NextRequest) {
  try {
    // Extract session token from cookies
    const sessionToken = request.cookies.get('session')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Validate session
    const authResult = await validateSession(sessionToken)
    if (!authResult.valid) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } },
        { status: 401 }
      )
    }

    // Check admin privileges
    if (!authResult.user?.isAdmin) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      )
    }

    // Fetch all groups from database
    const cosmosService = getCosmosService()
    const groups = await cosmosService.queryItems<Group>(
      'groups',
      'SELECT * FROM c ORDER BY c.createdAt ASC'
    )

    return NextResponse.json({
      success: true,
      groups
    })

  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract session token from cookies
    const sessionToken = request.cookies.get('session')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Validate session
    const authResult = await validateSession(sessionToken)
    if (!authResult.valid) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } },
        { status: 401 }
      )
    }

    // Check admin privileges
    if (!authResult.user?.isAdmin) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      )
    }

    // Parse request body
    let body: CreateGroupRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Invalid JSON in request body' } },
        { status: 500 }
      )
    }

    // Validate required fields
    const { name, description } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Group name is required' } },
        { status: 400 }
      )
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Group description is required' } },
        { status: 400 }
      )
    }

    // Validate field lengths
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Group name must be at least 2 characters long' } },
        { status: 400 }
      )
    }

    if (description.trim().length > 500) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Group description must be 500 characters or less' } },
        { status: 400 }
      )
    }

    // Check for duplicate group names
    const cosmosService = getCosmosService()
    const existingGroups = await cosmosService.queryItems<Group>(
      'groups',
      'SELECT * FROM c WHERE c.name = @name',
      [{ name: '@name', value: name.trim() }]
    )

    if (existingGroups.length > 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Group name already exists' } },
        { status: 400 }
      )
    }

    // Create new group
    const newGroup: Group = {
      id: uuidv4(),
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date()
    }

    await cosmosService.createItem('groups', newGroup)

    return NextResponse.json({
      success: true,
      group: newGroup
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}