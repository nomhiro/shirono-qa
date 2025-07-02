import { Box, CircularProgress, Typography } from '@mui/material'

export default function Loading() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
      <CircularProgress />
      <Typography variant="body1" sx={{ ml: 2 }}>Loading...</Typography>
    </Box>
  )
}