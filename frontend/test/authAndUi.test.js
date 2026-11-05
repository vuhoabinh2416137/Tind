import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

test('Auth & UI Audit: AuthModal has Gmail OTP verification, Forgot Password, and no demo/avatar picker', () => {
  const authContent = fs.readFileSync(path.join(srcDir, 'components/AuthModal.jsx'), 'utf8');

  // Verify PRESET_AVATARS and avatar selection are completely removed
  assert.equal(authContent.includes('PRESET_AVATARS'), false, 'PRESET_AVATARS must be removed');
  assert.equal(authContent.includes('Chọn ảnh đại diện'), false, 'Avatar selector label must be removed');

  // Verify Demo quick access is completely removed
  assert.equal(authContent.includes('Hoặc đăng nhập nhanh bằng tài khoản có sẵn'), false, 'Demo quick access must be removed');
  assert.equal(authContent.includes('switchUser'), false, 'switchUser must be removed from AuthModal');

  // Verify Gmail verification & Forgot password flows exist
  assert.equal(authContent.includes('verify-register'), true, 'Gmail registration OTP step must exist');
  assert.equal(authContent.includes('forgot'), true, 'Forgot password step must exist');
  assert.equal(authContent.includes('reset-password'), true, 'Reset password step must exist');
  assert.equal(authContent.includes('Quên mật khẩu?'), true, 'Forgot password button must exist');
  assert.equal(authContent.includes('sendGmailOtp'), true, 'sendGmailOtp must be wired in AuthModal');
  assert.equal(authContent.includes('resetPasswordWithGmail'), true, 'resetPasswordWithGmail must be wired in AuthModal');
});

test('Auth & UI Audit: Sidebar and App have no Demo switcher or Demo badges', () => {
  const sidebarContent = fs.readFileSync(path.join(srcDir, 'components/Sidebar.jsx'), 'utf8');
  const appContent = fs.readFileSync(path.join(srcDir, 'App.jsx'), 'utf8');

  assert.equal(sidebarContent.includes('setIsUserSwitcherOpen'), false, 'UserSwitcher trigger must be removed from Sidebar');
  assert.equal(sidebarContent.includes('Đổi tài khoản kiểm thử'), false, 'Demo switcher tooltip must be removed');
  assert.equal(appContent.includes('<UserSwitcherModal'), false, 'UserSwitcherModal must not be rendered in App.jsx');
  assert.equal(appContent.includes('NavigationRail'), true, 'Messenger NavigationRail must be present in App.jsx');
});

test('Auth & UI Audit: ChatContext provides Gmail OTP and password reset methods', () => {
  const ctxContent = fs.readFileSync(path.join(srcDir, 'context/ChatContext.jsx'), 'utf8');

  assert.equal(ctxContent.includes('DEMO_USER_IDS'), true, 'ChatContext must filter out legacy demo user IDs');
  assert.equal(ctxContent.includes('sendGmailOtp'), true, 'ChatContext must provide sendGmailOtp');
  assert.equal(ctxContent.includes('verifyGmailOtp'), true, 'ChatContext must provide verifyGmailOtp');
  assert.equal(ctxContent.includes('resetPasswordWithGmail'), true, 'ChatContext must provide resetPasswordWithGmail');
});

test('Backend Audit: EmailOtpService and AuthController support Gmail OTP & reset-password', () => {
  const otpServicePath = path.resolve(__dirname, '../../backend/src/main/java/com/messenger/service/EmailOtpService.java');
  const authCtrlPath = path.resolve(__dirname, '../../backend/src/main/java/com/messenger/controller/AuthController.java');

  assert.equal(fs.existsSync(otpServicePath), true, 'EmailOtpService.java must exist');
  const ctrlContent = fs.readFileSync(authCtrlPath, 'utf8');
  assert.equal(ctrlContent.includes('/send-otp'), true, '/api/auth/send-otp endpoint must exist');
  assert.equal(ctrlContent.includes('/verify-otp'), true, '/api/auth/verify-otp endpoint must exist');
  assert.equal(ctrlContent.includes('/reset-password'), true, '/api/auth/reset-password endpoint must exist');
});
