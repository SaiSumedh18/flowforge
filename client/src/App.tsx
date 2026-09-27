import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  AppLayout,
} from "./components/AppLayout";

import {
  ProtectedRoute,
} from "./components/ProtectedRoute";

import {
  DashboardPage,
} from "./pages/DashboardPage";

import {
  ExecutionsPage,
} from "./pages/ExecutionsPage";

import {
  JobsPage,
} from "./pages/JobsPage";

import {
  LoginPage,
} from "./pages/LoginPage";

import {
  RegisterPage,
} from "./pages/RegisterPage";


export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <LoginPage />
        }
      />

      <Route
        path="/register"
        element={
          <RegisterPage />
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <DashboardPage />
          }
        />

        <Route
          path="/jobs"
          element={
            <JobsPage />
          }
        />

        <Route
          path="/executions"
          element={
            <ExecutionsPage />
          }
        />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}