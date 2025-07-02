'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Grid,
  Chip,
} from '@mui/material'
import { Add as AddIcon, Group as GroupIcon } from '@mui/icons-material'
import { Group } from '@/types/group'
import { User } from '@/types/auth'
import { GroupCreateData } from '@/lib/admin'

export default function GroupManagementPage() {
  const router = useRouter()
  
  const [_user, setUser] = useState<User | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<GroupCreateData>({
    name: '',
    description: ''
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 認証チェック - APIエンドポイントを使用
      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include'
      })
      
      if (!authResponse.ok) {
        router.push('/')
        return
      }
      
      const authResult = await authResponse.json()
      
      // 管理者権限チェック
      if (!authResult.user?.isAdmin) {
        router.push('/')
        return
      }
      
      setUser(authResult.user)

      // グループデータ取得
      const response = await fetch('/api/admin/groups', {
        credentials: 'include'
      })

      if (!response.ok) {
        setError('Failed to load groups')
        return
      }

      const groupsResult = await response.json()
      if (!groupsResult.success) {
        setError(groupsResult.error?.message || 'Failed to load groups')
        return
      }
      
      setGroups(groupsResult.groups || [])
      
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load page data')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Group name is required'
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Group name must be at least 2 characters long'
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required'
    } else if (formData.description.trim().length > 500) {
      errors.description = 'Description must be 500 characters or less'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateGroup = async () => {
    if (!validateForm()) {
      return
    }
    
    try {
      setCreating(true)
      setError(null)
      
      const response = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim()
        })
      })

      if (!response.ok) {
        const result = await response.json()
        setError(result.error?.message || 'Failed to create group')
        return
      }
      
      // 成功時の処理
      setShowCreateDialog(false)
      setFormData({ name: '', description: '' })
      setFormErrors({})
      
      // グループリストを再読み込み
      await loadData()
      
    } catch (err) {
      console.error('Error creating group:', err)
      setError('Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  const handleCancelCreate = () => {
    setShowCreateDialog(false)
    setFormData({ name: '', description: '' })
    setFormErrors({})
    setError(null)
  }

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading...</Typography>
      </Box>
    )
  }

  if (error && !showCreateDialog) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  const breadcrumbItems = [
    { label: 'ホーム', href: '/questions' },
    { label: 'グループ管理', current: true }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader breadcrumbItems={breadcrumbItems} />
      
      <Box p={3}>
        {/* ページヘッダー */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            グループ管理
          </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateDialog(true)}
        >
          Add Group
        </Button>
      </Box>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* グループリスト */}
      <Grid container spacing={3}>
        {groups.map((group) => (
          <Grid item xs={12} sm={6} md={4} key={group.id}>
            <Card 
              elevation={2} 
              sx={{ height: '100%' }}
              data-testid={`group-card-${group.id}`}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <GroupIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="h2">
                    {group.name}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {group.description}
                </Typography>
                
                <Chip
                  label={formatDate(group.createdAt)}
                  size="small"
                  variant="outlined"
                  color="default"
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* グループが存在しない場合 */}
      {groups.length === 0 && (
        <Box textAlign="center" py={8}>
          <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No groups found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Create your first group to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
          >
            Add Group
          </Button>
        </Box>
      )}

      {/* グループ作成ダイアログ */}
      <Dialog 
        open={showCreateDialog} 
        onClose={handleCancelCreate}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={!!formErrors.name}
            helperText={formErrors.name}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={!!formErrors.description}
            helperText={formErrors.description}
          />
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={handleCancelCreate}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateGroup}
            variant="contained"
            disabled={creating}
          >
            {creating ? <CircularProgress size={20} /> : 'Create Group'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </div>
  )
}