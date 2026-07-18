import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LessonAccessProvider } from './contexts/LessonAccessContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { HistoryProvider } from './contexts/HistoryContext';
import { LevelProvider } from './contexts/LevelContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import LessonPage from './pages/LessonPage';
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminLessonsPage from './pages/admin/AdminLessonsPage';
import AdminPackagesPage from './pages/admin/AdminPackagesPage';
import UpgradePage from './pages/UpgradePage';
import PaymentPage from './pages/PaymentPage';
import LevelPage from './pages/LevelPage';
import VocabularyPage from './pages/VocabularyPage';
import SpeakingPage from './pages/SpeakingPage';
import VideoTranslatePage from './pages/VideoTranslatePage';

function LessonPageRoute() {
  const { id } = useParams<{ id: string }>();
  return <LessonPage key={id} />;
}

export default function App() {
  return (
    <AuthProvider>
      <LessonAccessProvider>
      <ThemeProvider>
      <FavoritesProvider>
      <HistoryProvider>
      <LevelProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/kham-pha" element={<ExplorePage />} />
          <Route
            path="/bai-hoc/:id"
            element={
              <ProtectedRoute>
                <LessonPageRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ca-nhan"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lich-su"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dang-nhap"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/dang-ky"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route
            path="/xac-thuc-google"
            element={
              <GuestRoute>
                <GoogleCallbackPage />
              </GuestRoute>
            }
          />
          <Route
            path="/quen-mat-khau"
            element={
              <GuestRoute>
                <ForgotPasswordPage />
              </GuestRoute>
            }
          />
          <Route
            path="/quen-mat-khau/xac-nhan"
            element={
              <GuestRoute>
                <VerifyOtpPage />
              </GuestRoute>
            }
          />
          <Route
            path="/quen-mat-khau/dat-lai"
            element={
              <GuestRoute>
                <ResetPasswordPage />
              </GuestRoute>
            }
          />
          <Route
            path="/trinh-do"
            element={
              <ProtectedRoute>
                <LevelPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tu-vung"
            element={
              <ProtectedRoute>
                <VocabularyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/luyen-noi"
            element={
              <ProtectedRoute>
                <SpeakingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dich-video"
            element={
              <ProtectedRoute>
                <VideoTranslatePage />
              </ProtectedRoute>
            }
          />
          <Route path="/nang-cap" element={<UpgradePage />} />
          <Route path="/nang-cap/thanh-toan" element={<PaymentPage />} />
          <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/content"
            element={
              <ProtectedRoute adminOnly>
                <AdminLessonsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/packages"
            element={
              <ProtectedRoute adminOnly>
                <AdminPackagesPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      </LevelProvider>
      </HistoryProvider>
      </FavoritesProvider>
      </ThemeProvider>
      </LessonAccessProvider>
    </AuthProvider>
  );
}
