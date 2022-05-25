import * as React from 'react'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'

function Copyright() {
  return (
    <Typography variant="body2" color="text.secondary" align="center">
      {'Copyright © '}
      <Link color="inherit" href="https://github.com/microsoft/msagljs">
        Microsoft MSAGL JavaScript
      </Link>{' '}
      {new Date().getFullYear()}.
    </Typography>
  )
}

export default function App() {
  return (
    <Container maxWidth="xl">
      <h1>MSGAL</h1>
      <Copyright />
    </Container>
  )
}
