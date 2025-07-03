'use client'

import { Suspense } from 'react'
import { Container, Box, CircularProgress } from '@mui/material'
import ResetPasswordContent from './ResetPasswordContent'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}