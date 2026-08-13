import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
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
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminLessonsPage from './pages/admin/AdminLessonsPage';
import AdminPackagesPage from './pages/admin/AdminPackagesPage';
import AdminTransactionsPage from './pages/admin/AdminTransactionsPage';
import AdminStatsPage from './pages/admin/AdminStatsPage';
import UpgradePage from './pages/UpgradePage';
import PaymentPage from './pages/PaymentPage';
import LevelPage from './pages/LevelPage';
import VocabularyPage from './pages/VocabularyPage';
import SpeakingPage from './pages/SpeakingPage';
import SpeakingHistoryPage from './pages/SpeakingHistoryPage';
import VideoTranslatePage from './pages/VideoTranslatePage';
import MyVideosPage from './pages/MyVideosPage';

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
                    <Route path="/bai-hoc/:id" element={<LessonPageRoute />} />
                    <Route
                      path="/ca-nhan"
                      element={
                        <ProtectedRoute>
                          <ProfilePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/lich-su" element={<HistoryPage />} />
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
                    <Route path="/trinh-do" element={<LevelPage />} />
                    <Route path="/tu-vung" element={<VocabularyPage />} />
                    <Route path="/luyen-noi" element={<SpeakingPage />} />
                    <Route
                      path="/luyen-noi/lich-su"
                      element={<SpeakingHistoryPage />}
                    />
                    <Route
                      path="/dich-video"
                      element={<VideoTranslatePage />}
                    />
                    <Route
                      path="/video-cua-toi"
                      element={
                        <ProtectedRoute>
                          <MyVideosPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/nang-cap" element={<UpgradePage />} />
                    <Route
                      path="/nang-cap/thanh-toan"
                      element={<PaymentPage />}
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute adminOnly>
                          <AdminOverviewPage />
                        </ProtectedRoute>
                      }
                    />
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
                    <Route
                      path="/admin/transactions"
                      element={
                        <ProtectedRoute adminOnly>
                          <AdminTransactionsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/stats"
                      element={
                        <ProtectedRoute adminOnly>
                          <AdminStatsPage />
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
