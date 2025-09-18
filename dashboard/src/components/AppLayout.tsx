import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__header">
          <h1>Yield Dashboard</h1>
        </div>
        <nav className="sidebar__nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/records">Records</NavLink>
        </nav>
        <div className="sidebar__footer">
          {user && (
            <>
              <p className="sidebar__user">{user.fullName}</p>
              <button type="button" onClick={logout} className="sidebar__logout">
                Log out
              </button>
            </>
          )}
        </div>
      </aside>
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
