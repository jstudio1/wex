import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthDialogProvider, useAuthDialog } from '../AuthDialogContext';

// Test component that uses the hook
function TestComponent() {
  const { openLoginDialog, openRegisterDialog, isLoginOpen, isRegisterOpen } = useAuthDialog();

  return (
    <div>
      <button onClick={openLoginDialog}>Open Login</button>
      <button onClick={openRegisterDialog}>Open Register</button>
      <div data-testid="login-status">{isLoginOpen ? 'login-open' : 'login-closed'}</div>
      <div data-testid="register-status">{isRegisterOpen ? 'register-open' : 'register-closed'}</div>
    </div>
  );
}

describe('AuthDialogContext', () => {
  it('ควรให้ context ทำงานได้ถูกต้อง', () => {
    render(
      <AuthDialogProvider>
        <TestComponent />
      </AuthDialogProvider>
    );

    expect(screen.getByTestId('login-status')).toHaveTextContent('login-closed');
    expect(screen.getByTestId('register-status')).toHaveTextContent('register-closed');
  });

  it('ควรเปิด login dialog เมื่อเรียก openLoginDialog', () => {
    render(
      <AuthDialogProvider>
        <TestComponent />
      </AuthDialogProvider>
    );

    const loginButton = screen.getByText('Open Login');
    
    act(() => {
      loginButton.click();
    });

    expect(screen.getByTestId('login-status')).toHaveTextContent('login-open');
    expect(screen.getByTestId('register-status')).toHaveTextContent('register-closed');
  });

  it('ควรเปิด register dialog เมื่อเรียก openRegisterDialog', () => {
    render(
      <AuthDialogProvider>
        <TestComponent />
      </AuthDialogProvider>
    );

    const registerButton = screen.getByText('Open Register');
    
    act(() => {
      registerButton.click();
    });

    expect(screen.getByTestId('register-status')).toHaveTextContent('register-open');
    expect(screen.getByTestId('login-status')).toHaveTextContent('login-closed');
  });

  it('ควรปิด login dialog เมื่อเปิด register dialog', () => {
    render(
      <AuthDialogProvider>
        <TestComponent />
      </AuthDialogProvider>
    );

    const loginButton = screen.getByText('Open Login');
    const registerButton = screen.getByText('Open Register');
    
    act(() => {
      loginButton.click();
    });

    expect(screen.getByTestId('login-status')).toHaveTextContent('login-open');

    act(() => {
      registerButton.click();
    });

    expect(screen.getByTestId('login-status')).toHaveTextContent('login-closed');
    expect(screen.getByTestId('register-status')).toHaveTextContent('register-open');
  });

  it('ควร throw error เมื่อใช้ hook นอก provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // ใช้ try-catch เพื่อจับ error ที่เกิดขึ้น
    try {
      render(<TestComponent />);
      // ถ้าไม่ throw error ให้ fail test
      expect.fail('Expected error to be thrown');
    } catch (error: any) {
      expect(error.message).toContain('useAuthDialog must be used within AuthDialogProvider');
    }

    consoleSpy.mockRestore();
  });
});

