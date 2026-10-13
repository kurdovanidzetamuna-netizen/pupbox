import AuthModal from '@/components/AuthModal';
import { RegisterPage } from '../../register/RegisterForm';

/** Sign up, opened from a link on the site: a pop-up over the current page. */
export default function RegisterModal() {
  return <AuthModal titleKey="register.heading" size="md"><RegisterPage inModal /></AuthModal>;
}
