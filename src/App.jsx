import { Toaster } from 'react-hot-toast'
import Router from './routes/Router'

export default function App() {
  return (
    <>
      <Router />
      <Toaster
        position="bottom-left"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#30382e',
            color: '#e4e8e3',
            border: '1px solid #485445',
            borderRadius: '10px',
            fontFamily: 'IRANSansX, sans-serif',
            fontSize: '14px',
            direction: 'rtl',
          },
          success: {
            iconTheme: {
              primary: '#798c73',
              secondary: '#111410',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#111410',
            },
          },
        }}
      />
    </>
  )
}
