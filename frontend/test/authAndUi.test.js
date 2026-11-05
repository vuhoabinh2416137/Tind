import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

test('Auth & UI Audit: AuthModal has no avatar picker or demo quick login', () => {
  const authContent = fs.readFileSync(path.join(srcDir, 'components/AuthModal.jsx'), 'utf8');

  // Verify PRESET_AVATARS and avatar selection are completely removed
  assert.equal(authContent.includes('PRESET_AVATARS'), false, 'PRESET_AVATARS must be removed');
  assert.equal(authContent.includes('Chọn ảnh đại diện'), false, 'Avatar selector label must be removed');

  // Verify Demo quick access is completely removed
  assert.equal(authContent.includes('Hoặc đăng nhập nhanh bằng tài khoản có sẵn'), false, 'Demo quick access must be removed');
  assert.equal(authContent.includes('switchUser'), false, 'switchUser must be removed from AuthModal');

  // Verify password authentication fields exist
  assert.equal(authContent.includes('type={showPassword ? \'text\' : \'password\'}'), true, 'Password input must exist');
  assert.equal(authContent.includes('confirmPassword'), true, 'Confirm password field must exist for registration');
});

test('Auth & UI Audit: Sidebar and App have no Demo switcher or Demo badges', () => {
  const sidebarContent = fs.readFileSync(path.join(srcDir, 'components/Sidebar.jsx'), 'utf8');
  const appContent = fs.readFileSync(path.join(srcDir, 'App.jsx'), 'utf8');

  assert.equal(sidebarContent.includes('setIsUserSwitcherOpen'), false, 'UserSwitcher trigger must be removed from Sidebar');
  assert.equal(sidebarContent.includes('Đổi tài khoản kiểm thử'), false, 'Demo switcher tooltip must be removed');
  assert.equal(appContent.includes('<UserSwitcherModal'), false, 'UserSwitcherModal must not be rendered in App.jsx');
  assert.equal(appContent.includes('NavigationRail'), true, 'Messenger NavigationRail must be present in App.jsx');
});

test('Auth & UI Audit: ChatContext blocks legacy demo accounts and generates default avatars', () => {
  const ctxContent = fs.readFileSync(path.join(srcDir, 'context/ChatContext.jsx'), 'utf8');

  assert.equal(ctxContent.includes('DEMO_USER_IDS'), true, 'ChatContext must filter out legacy demo user IDs');
  assert.equal(ctxContent.includes('getDefaultAvatar'), true, 'ChatContext must provide getDefaultAvatar');
  assert.equal(ctxContent.includes('password'), true, 'ChatContext login/register must handle password');
});

test('Backend Audit: DataInitializer purges demo accounts instead of seeding them', () => {
  const initializerPath = path.resolve(__dirname, '../../backend/src/main/java/com/messenger/config/DataInitializer.java');
  const initializerContent = fs.readFileSync(initializerPath, 'utf8');

  assert.equal(initializerContent.includes('Initializing seed data'), false, 'Seed data initialization must be removed');
  assert.equal(initializerContent.includes('userRepository.deleteById'), true, 'Demo users must be purged');
});
