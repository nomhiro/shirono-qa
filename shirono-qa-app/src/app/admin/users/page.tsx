'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material'
import { User, Group } from '@/types/auth'
import { validateSession } from '@/lib/auth'
import { getUsers, createUser, updateUser, deleteUser, getGroups, UserCreateData, UserUpdateData } from '@/lib/admin'

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // フィルタリング・検索
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  // ダイアログ状態
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // フォームデータ
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    groupId: '',
    isAdmin: false
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // 認証チェック
      const authResult = await validateSession(
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('session='))
          ?.split('=')[1] || ''
      )
      
      if (!authResult.valid || !authResult.user) {
        router.push('/')
        return
      }

      if (!authResult.user.isAdmin) {
        router.push('/questions')
        return
      }

      setCurrentUser(authResult.user)

      // ユーザーとグループデータ取得
      const [usersResult, groupsResult] = await Promise.all([
        getUsers(),
        getGroups()
      ])

      if (!usersResult.success) {
        setError(usersResult.error || 'Failed to load users')
        return
      }

      if (!groupsResult.success) {
        setError(groupsResult.error || 'Failed to load groups')
        return
      }

      setUsers(usersResult.users || [])
      setGroups(groupsResult.groups || [])
      
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesGroup = !selectedGroup || user.groupId === selectedGroup
    const matchesRole = !selectedRole || 
                       (selectedRole === 'admin' && user.isAdmin) ||
                       (selectedRole === 'user' && !user.isAdmin)
    
    return matchesSearch && matchesGroup && matchesRole
  })

  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    return group ? group.name : 'Unknown'
  }

  const resetFormData = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      groupId: groups.length > 0 ? groups[0].id : '',
      isAdmin: false
    })
  }

  const handleCreateUser = () => {
    resetFormData()
    setIsCreateDialogOpen(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      groupId: user.groupId,
      isAdmin: user.isAdmin
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return
    }

    try {
      setSubmitting(true)
      const result = await deleteUser(user.id)
      
      if (result.success) {
        setUsers(users.filter(u => u.id !== user.id))
      } else {
        setError(result.error || 'Failed to delete user')
      }
    } catch (err) {
      console.error('Error deleting user:', err)
      setError('Failed to delete user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitCreate = async () => {
    if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Username, email, and password are required')
      return
    }

    try {
      setSubmitting(true)
      const userData: UserCreateData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        groupId: formData.groupId,
        isAdmin: formData.isAdmin
      }

      const result = await createUser(userData)
      
      if (result.success) {
        setUsers([...users, result.user!])
        setIsCreateDialogOpen(false)
        resetFormData()
      } else {
        setError(result.error || 'Failed to create user')
      }
    } catch (err) {
      console.error('Error creating user:', err)
      setError('Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitEdit = async () => {
    if (!editingUser || !formData.username.trim() || !formData.email.trim()) {
      setError('Username and email are required')
      return
    }

    try {
      setSubmitting(true)
      const updateData: UserUpdateData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        groupId: formData.groupId,
        isAdmin: formData.isAdmin
      }

      const result = await updateUser(editingUser.id, updateData)
      
      if (result.success) {
        setUsers(users.map(u => u.id === editingUser.id ? result.user! : u))
        setIsEditDialogOpen(false)
        setEditingUser(null)
        resetFormData()
      } else {
        setError(result.error || 'Failed to update user')
      }
    } catch (err) {
      console.error('Error updating user:', err)
      setError('Failed to update user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseDialogs = () => {
    setIsCreateDialogOpen(false)
    setIsEditDialogOpen(false)
    setEditingUser(null)
    resetFormData()
    setError(null)
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading...</Typography>
      </Box>
    )
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateUser}
        >
          Add User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* フィルタリング・検索 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              label="Search Users"
              placeholder="Search by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Filter by Group</InputLabel>
              <Select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                label="Filter by Group"
              >
                <MenuItem value="">All Groups</MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Filter by Role</InputLabel>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                label="Filter by Role"
              >
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="user">User</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* ユーザーテーブル */}
      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Group</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {user.isAdmin ? <AdminIcon sx={{ mr: 1, color: 'primary.main' }} /> : <PersonIcon sx={{ mr: 1 }} />}
                      {user.username}
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getGroupName(user.groupId)}</TableCell>
                  <TableCell>
                    {user.isAdmin ? (
                      <Chip label="Admin" color="primary" size="small" />
                    ) : (
                      <Chip label="User" color="default" size="small" />
                    )}
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit User">
                      <IconButton onClick={() => handleEditUser(user)} size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete User">
                      <IconButton 
                        onClick={() => handleDeleteUser(user)} 
                        size="small"
                        disabled={submitting}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredUsers.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No users found matching the current filters.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ユーザー作成ダイアログ */}
      <Dialog open={isCreateDialogOpen} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <TextField
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Group</InputLabel>
              <Select
                value={formData.groupId}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                label="Group"
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.isAdmin ? 'admin' : 'user'}
                onChange={(e) => setFormData({ ...formData, isAdmin: e.target.value === 'admin' })}
                label="Role"
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button 
            onClick={handleSubmitCreate} 
            variant="contained"
            disabled={submitting}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* ユーザー編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <TextField
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Group</InputLabel>
              <Select
                value={formData.groupId}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                label="Group"
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.isAdmin ? 'admin' : 'user'}
                onChange={(e) => setFormData({ ...formData, isAdmin: e.target.value === 'admin' })}
                label="Role"
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button 
            onClick={handleSubmitEdit} 
            variant="contained"
            disabled={submitting}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}