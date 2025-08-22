export default function TestHistoryPage() {
  return (
    <div style={{ padding: '50px', background: 'red', color: 'white', fontSize: '30px', textAlign: 'center' }}>
      🔥 TEST VERSION - IF YOU SEE THIS, ROUTING WORKS! 🔥
      <br />
      <br />
      Current time: {new Date().toLocaleString()}
    </div>
  )
}
