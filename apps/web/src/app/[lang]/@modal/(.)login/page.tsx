import AuthModal from '@/components/AuthModal';
import { LoginPage } from '../../login/LoginForm';

/** Sign in, opened from a link on the site: a pop-up over the current page. */
export default function LoginModal() {
  return <AuthModal titleKey="login.heading"><LoginPage inModal /></AuthModal>;
}
