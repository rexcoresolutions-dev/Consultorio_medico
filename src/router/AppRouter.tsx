import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Spin, App as AntdApp } from 'antd';

import { AuthProvider } from '../context/auth/AuthContext';
import { useAuth } from '../hooks/useAuth';

import PublicLayout from '../layouts/PublicLayout/PublicLayout';
import PrivateLayout from '../layouts/PrivateLayout/PrivateLayout';

import Login from '../pages/Auth/Login';
import Perfil from '../pages/Perfil/Perfil';

import Dashboard from '../pages/Dashboard/Dashboard';
import DashboardMedico from '../pages/DashboardMedico/DashboardMedico';
import DashboardConsultor from '../pages/DashboardConsultor/DashboardConsultor';

import Clinicas from '../pages/clinicas/Clinicas';
import Usuarios from '../pages/Usuarios/Usuarios';
import Pacientes from '../pages/Pacientes/Pacientes';

import ConfirmarAtencion from '../pages/ConfirmarAtencion/ConfirmarAtencion';
import Procedimientos from '../pages/procedimientos/Procedimientos';
import HistorialClinico from '../pages/HistorialClinico/HistorialClinico';

import {
  ROUTES,
  getDashboardByRole,
  canAccessRoute,
} from '../router/routes';
import HistorialesDisponibles from '../pages/HistorialClinico/HistorialesDisponibles';

const LoadingScreen: React.FC = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
    }}
  >
    <Spin size="large" />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.LOGIN} replace />;
};

const RoleRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return <Navigate to={getDashboardByRole(user?.rol_id)} replace />;
};

const RoleRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;

  const allowed = canAccessRoute(user?.rol_id, location.pathname);

  if (!allowed) {
    return <Navigate to={getDashboardByRole(user?.rol_id)} replace />;
  }

  return <>{children}</>;
};

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AntdApp>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path={ROUTES.LOGIN} element={<Login />} />
              <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />
            </Route>

            <Route
              element={
                <ProtectedRoute>
                  <PrivateLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/inicio" element={<RoleRedirect />} />

              <Route
                path={ROUTES.DASHBOARD_ADMIN}
                element={
                  <RoleRoute>
                    <Dashboard />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.DASHBOARD_MEDICO}
                element={
                  <RoleRoute>
                    <DashboardMedico />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.DASHBOARD_CONSULTOR}
                element={
                  <RoleRoute>
                    <DashboardConsultor />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.USERS}
                element={
                  <RoleRoute>
                    <Usuarios />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.CLINICS}
                element={
                  <RoleRoute>
                    <Clinicas />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.CLINIC_NEW}
                element={
                  <RoleRoute>
                    <Clinicas />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.CLINIC_DETAIL}
                element={
                  <RoleRoute>
                    <Clinicas />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.PATIENTS}
                element={
                  <RoleRoute>
                    <Pacientes />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.CONFIRMAR_ATENCION}
                element={
                  <RoleRoute>
                    <ConfirmarAtencion />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.PROCEDIMIENTOS}
                element={
                  <RoleRoute>
                    <Procedimientos />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.HISTORIAL_CLINICO}
                element={
                  <RoleRoute>
                    <HistorialClinico />
                  </RoleRoute>
                }
              />

              <Route path="/historiales-disponibles" element={<HistorialesDisponibles />} />

              <Route
                path={ROUTES.PROFILE}
                element={
                  <RoleRoute>
                    <Perfil />
                  </RoleRoute>
                }
              />

              <Route path="*" element={<RoleRedirect />} />
            </Route>
          </Routes>
        </AntdApp>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRouter;