import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from './utils';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// A component that always throws for testing error capture
function ThrowOnMount({ message = 'Test Error' }: { message?: string }) {
  if (message) {
    throw new Error(message);
  }
  return null;
}

// A component that renders normally for the positive path test
function SafeComponent() {
  return <div data-testid="safe-content">All systems nominal</div>;
}

describe('ErrorBoundary', () => {
  it('renders children normally when no error occurs', () => {
    render(
      <ErrorBoundary name="TestBoundary">
        <SafeComponent />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('safe-content')).toBeInTheDocument();
  });

  it('renders fallback UI when an error is thrown', () => {
    // Suppress console.error from React's error boundary output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary name="TestBoundary">
        <ThrowOnMount />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry Operation/i })).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('shows an error ID in the fallback UI', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowOnMount message="ID test error" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Error ID:/i)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('renders custom fallback when provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error Page</div>}>
        <ThrowOnMount />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('retries successfully when retry button is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let shouldThrow = true;
    function ConditionalThrow() {
      if (shouldThrow) throw new Error('Conditional error');
      return <div data-testid="recovered">Recovered!</div>;
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

    // Fix the throwing condition before retry
    shouldThrow = false;

    fireEvent.click(screen.getByRole('button', { name: /Retry Operation/i }));

    // After retry click, boundary state resets — re-render should show recovered component
    rerender(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('recovered')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
