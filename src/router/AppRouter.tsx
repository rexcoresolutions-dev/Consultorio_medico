import React, { lazy, Suspense } from 'react';
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
const Perfil = lazy(() => import('../pages/Perfil/Perfil'));
const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'));
const DashboardMedico = lazy(() => import('../pages/DashboardMedico/DashboardMedico'));
const DashboardAuditor = lazy(() => import('../pages/DashboardAuditor/DashboardAuditor'));
const Auditoria = lazy(() => import('../pages/Auditoria/Auditoria'));
const Clinicas = lazy(() => import('../pages/clinicas/Clinicas'));
const Usuarios = lazy(() => import('../pages/Usuarios/Usuarios'));
const Pacientes = lazy(() => import('../pages/Pacientes/Pacientes'));
const ConfirmarAtencion = lazy(() => import('../pages/ConfirmarAtencion/ConfirmarAtencion'));
const Procedimientos = lazy(() => import('../pages/procedimientos/Procedimientos'));
const HistorialClinico = lazy(() => import('../pages/HistorialClinico/HistorialClinico'));
const HistorialesDisponibles = lazy(() => import('../pages/HistorialClinico/HistorialesDisponibles'));
const NotaEvolucion = lazy(() => import('../pages/NotaEvolucion/NotaEvolucion'));
const HistoricoPaciente = lazy(() => import('../pages/HistoricoPaciente/HistoricoPaciente'));
const OpcionesHojaReferencia = lazy(() => import('../pages/HojaReferencia/OpcionesHojaReferencia'));
const HojaReferencia = lazy(() => import('../pages/HojaReferencia/HojaReferencia'));
const EstudiosClinicos = lazy(() => import('../pages/EstudiosClinicos/EstudiosClinicos'));
const CertificadoMedico = lazy(() => import('../pages/CertificadoMedico/CertificadoMedico'));
const ControlDiarioPacientes = lazy(() => import('../pages/ControlDiarioPacientes/ControlDiarioPacientes'));
const Citas = lazy(() => import('../pages/Citas/Citas'));
const Recetas = lazy(() => import('../pages/Recetas/Recetas'));
const Inventario = lazy(() => import('../pages/Inventario/Inventario'));
const ConfiguracionSistema = lazy(() => import('../pages/ConfiguracionSistema/ConfiguracionSistema'));
const Plataforma = lazy(() => import('../pages/Plataforma/Plataforma'));
const Permisos = lazy(() => import('../pages/Permisos/Permisos'));
const Documentos = lazy(() => import('../pages/Documentos/Documentos'));
const ConsentimientoInformado = lazy(() => import('../pages/ConsentimientoInformado/ConsentimientoInformado'));
const FarmacoVigilancia = lazy(() => import('../pages/FarmacoVigilancia/FarmacoVigilancia'));
const AvisoPrivacidad = lazy(() => import('../pages/AvisoPrivacidad/AvisoPrivacidad'));
const AvisoMedicoComodatario = lazy(() => import('../pages/AvisoMedicoComodatario/AvisoMedicoComodatario'));
const Notificaciones = lazy(() => import('../pages/Notificaciones/Notificaciones'));
const Sincronizacion = lazy(() => import('../pages/Sincronizacion/Sincronizacion'));

import {
  ROUTES,
  getDashboardByRole,
  canAccessRoute,
} from '../router/routes';
import { getUserRoleId } from '../utils/role.utils';
import { getWorkSucursal } from '../services/work-context/work-context.service';

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

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to={ROUTES.LOGIN} replace />
  );
};

const RoleRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return <Navigate to={getDashboardByRole(getUserRoleId(user))} replace />;
};

const RoleRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;

  const roleId = getUserRoleId(user);
  const isSuperAdmin = roleId === 4;
  const hasCompanyContext = Number(sessionStorage.getItem('empresa_contexto_id')) > 0;
  const hasBranchContext = Boolean(getWorkSucursal()?.id);
  const companyOnlyRoute = [
    ROUTES.SETTINGS,
    ROUTES.NOTIFICATIONS,
    ROUTES.USERS,
    ROUTES.PERMISSIONS,
    ROUTES.CLINICS,
    ROUTES.CLINIC_NEW,
  ].includes(location.pathname as any) || location.pathname.startsWith('/clinicas/');

  if (
    isSuperAdmin &&
    location.pathname !== ROUTES.PLATFORM &&
    location.pathname !== ROUTES.PROFILE &&
    (!hasCompanyContext || (!companyOnlyRoute && !hasBranchContext))
  ) {
    return <Navigate to={ROUTES.PLATFORM} replace />;
  }
  const allowed = canAccessRoute(roleId, location.pathname);

  if (!allowed) {
    return <Navigate to={getDashboardByRole(getUserRoleId(user))} replace />;
  }

  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
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
                path={ROUTES.DASHBOARD_AUDITOR}
                element={
                  <RoleRoute>
                    <DashboardAuditor />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.AUDIT}
                element={
                  <RoleRoute>
                    <Auditoria />
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

              <Route
                path={ROUTES.HISTORIALES_DISPONIBLES}
                element={
                  <RoleRoute>
                    <HistorialesDisponibles />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.NOTA_EVOLUCION}
                element={
                  <RoleRoute>
                    <NotaEvolucion />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.HISTORICO_PACIENTE}
                element={
                  <RoleRoute>
                    <HistoricoPaciente />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.HOJA_REFERENCIA}
                element={
                  <RoleRoute>
                    <OpcionesHojaReferencia />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.HOJA_REFERENCIA_CREAR}
                element={
                  <RoleRoute>
                    <HojaReferencia />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.ESTUDIOS_CLINICOS}
                element={
                  <RoleRoute>
                    <EstudiosClinicos />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.CERTIFICADO_MEDICO}
                element={
                  <RoleRoute>
                    <CertificadoMedico />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.CONTROL_DIARIO_PACIENTES}
                element={
                  <RoleRoute>
                    <ControlDiarioPacientes />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.APPOINTMENTS}
                element={
                  <RoleRoute>
                    <Citas />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.PRESCRIPTIONS}
                element={
                  <RoleRoute>
                    <Recetas />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.INVENTORY}
                element={
                  <RoleRoute>
                    <Inventario />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.DOCUMENTOS}
                element={
                  <RoleRoute>
                    <Documentos />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.CONSENTIMIENTO_INFORMADO}
                element={
                  <RoleRoute>
                    <ConsentimientoInformado />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.FARMACO_VIGILANCIA}
                element={
                  <RoleRoute>
                    <FarmacoVigilancia />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.AVISO_PRIVACIDAD}
                element={
                  <RoleRoute>
                    <AvisoPrivacidad />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.AVISO_MEDICO_COMODATARIO}
                element={
                  <RoleRoute>
                    <AvisoMedicoComodatario />
                  </RoleRoute>
                }
              />


              <Route
                path={ROUTES.PERMISSIONS}
                element={<RoleRoute><Permisos /></RoleRoute>}
              />

              <Route
                path={ROUTES.PLATFORM}
                element={<RoleRoute><Plataforma /></RoleRoute>}
              />

              <Route
                path={ROUTES.SETTINGS}
                element={
                  <RoleRoute>
                    <ConfiguracionSistema />
                  </RoleRoute>
                }
              />

              <Route
                path={ROUTES.PROFILE}
                element={
                  <RoleRoute>
                    <Perfil />
                  </RoleRoute>
                }
              />
              <Route path={ROUTES.NOTIFICATIONS} element={<RoleRoute><Notificaciones /></RoleRoute>} />
              <Route path={ROUTES.INITIAL_PASSWORD} element={<RoleRedirect />} />
              <Route path={ROUTES.SYNC} element={<RoleRoute><Sincronizacion /></RoleRoute>} />

              <Route path="*" element={<RoleRedirect />} />
            </Route>
          </Routes>
        </AntdApp>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRouter;
