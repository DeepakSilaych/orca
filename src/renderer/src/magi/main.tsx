import '../assets/main.css'
import '@xterm/xterm/css/xterm.css'
import './shell.css'
import { createRoot } from 'react-dom/client'
import { MagiShell } from './shell'
createRoot(document.getElementById('root')!).render(<MagiShell />)
