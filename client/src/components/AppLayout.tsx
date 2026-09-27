import {
  NavLink,
  Outlet,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";


export function AppLayout() {
  const {
    user,
    logout,
  } =
    useAuth();

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <span className="sidebar-logo">
              FF
            </span>

            FlowForge
          </div>

          <nav
            className="sidebar-nav"
            aria-label="Main navigation"
          >
            <NavLink
              to="/"
              end
              className={
                ({
                  isActive,
                }) =>
                  `nav-item${isActive
                    ? " active"
                    : ""
                  }`
              }
            >
              Overview
            </NavLink>

            <NavLink
              to="/jobs"
              className={
                ({
                  isActive,
                }) =>
                  `nav-item${isActive
                    ? " active"
                    : ""
                  }`
              }
            >
              Jobs
            </NavLink>

            <NavLink
              to="/executions"
              className={
                ({
                  isActive,
                }) =>
                  `nav-item${isActive
                    ? " active"
                    : ""
                  }`
              }
            >
              Executions
            </NavLink>
          </nav>
        </div>

        <div className="sidebar-footer">
          <span className="account-email">
            {user?.email}
          </span>

          <button
            className="logout-button"
            onClick={
              logout
            }
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}