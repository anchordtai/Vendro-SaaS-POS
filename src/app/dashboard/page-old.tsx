export default function DashboardPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Dashboard</h1>
      <p>Welcome to your dashboard!</p>
      <div style={{ marginTop: '20px' }}>
        <h2>Stats</h2>
        <p>Today&apos;s Sales: $4,520.50</p>
        <p>Today&apos;s Orders: 89</p>
        <p>Total Products: 156</p>
        <p>Low Stock Items: 12</p>
      </div>
    </div>
  );
}
