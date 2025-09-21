export default function Page() {
  return (
    <div className="grid grid-2">
      <div className="card">
        <h2>Quick Actions</h2>
        <ul>
          <li><a href="/contacts">Manage Contacts</a></li>
          <li><a href="/calls">Launch Calls</a></li>
        </ul>
      </div>
      <div className="card">
        <h2>Info</h2>
        <p className="muted">Use Contacts to upload CSV or add patients. Then launch calls.</p>
      </div>
    </div>
  )
}


