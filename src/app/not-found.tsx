export default function NotFound() {
  return (
    <html lang="en">
      <body style={{
        fontFamily: 'PT Sans, Arial, Helvetica, sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0f172a', color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 48, marginBottom: 12 }}>404</h1>
          <p style={{ fontSize: 18, opacity: 0.8 }}>Page not found.</p>
        </div>
      </body>
    </html>
  )
}

