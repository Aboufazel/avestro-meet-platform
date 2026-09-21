import { Toaster } from 'react-hot-toast'
import Router from './routes/Router'
import QueryProvider from "./providers/QueryProvider.jsx";

export default function App() {
  return (
    <QueryProvider>
      <Router />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#101a2a',
            color: '#f5f8ff',
            border: '1px solid rgba(255,255,255,.10)',
            borderRadius: '10px',
            fontFamily: 'IRANSansX, sans-serif',
            fontSize: '14px',
            direction: 'rtl',
          },
          success: {
            iconTheme: {
              primary: '#4d7dff',
              secondary: '#080f1b',
            },
          },
          error: {
            iconTheme: {
              primary: '#ff5068',
              secondary: '#080f1b',
            },
          },
        }}
      />
    </QueryProvider>
  )
}
