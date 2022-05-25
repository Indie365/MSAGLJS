import * as React from 'react'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import {useState} from 'react'
import {Grid} from '@mui/material'
import HighlightTextField, {Annotation} from './HighlightTextField'

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
  const [source, setSource] = useState('{}')
  const [annotations, setAnnotations] = useState<Annotation[]>([])

  return (
    <Container maxWidth="xl">
      <h1>MSGAL</h1>
      <Grid container spacing={1}>
        <Grid item xs={12}>
            <HighlightTextField code={source} language={'json'} onChange={setSource} annotations={annotations} />
        </Grid>
      </Grid>
      <Copyright />
    </Container>
  )
}
