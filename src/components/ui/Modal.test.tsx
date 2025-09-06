import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Modal } from './Modal';

// Mock createPortal to render in the same container
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

const TestModal: React.FC<{ initialOpen?: boolean }> = ({ initialOpen = false }): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Test Modal">
        <p>Modal content</p>
        <button onClick={() => setIsOpen(false)}>Close</button>
      </Modal>
    </>
  );
};

describe('Modal', () => {
  beforeEach(() => {
    // Reset body overflow style
    document.body.style.overflow = 'unset';
  });

  afterEach(() => {
    // Clean up body overflow style
    document.body.style.overflow = 'unset';
  });

  it('does not render when closed', () => {
    render(<Modal isOpen={false} onClose={vi.fn()}>Content</Modal>);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    render(<Modal isOpen={true} onClose={vi.fn()}>Content</Modal>);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} title="Test Title">Content</Modal>);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('renders without title', () => {
    render(<Modal isOpen={true} onClose={vi.fn()}>Content</Modal>);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveAttribute('aria-labelledby');
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen={true} onClose={handleClose} title="Test">Content</Modal>);
    
    const closeButton = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeButton);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen={true} onClose={handleClose}>Content</Modal>);
    
    // Click on the overlay background (the one with onClick handler)
    const overlay = document.querySelector('.fixed.inset-0.bg-gray-500');
    if (overlay) {
      fireEvent.click(overlay);
    }
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when overlay click is disabled', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={false}>
        Content
      </Modal>
    );
    
    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      fireEvent.click(overlay);
    }
    
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen={true} onClose={handleClose}>Content</Modal>);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when Escape is disabled', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnEscape={false}>
        Content
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<Modal isOpen={true} onClose={vi.fn()} size="sm">Small</Modal>);
    const modalContent = document.querySelector('.relative.transform');
    expect(modalContent).toHaveClass('max-w-md');

    rerender(<Modal isOpen={true} onClose={vi.fn()} size="lg">Large</Modal>);
    expect(document.querySelector('.relative.transform')).toHaveClass('max-w-2xl');

    rerender(<Modal isOpen={true} onClose={vi.fn()} size="xl">Extra Large</Modal>);
    expect(document.querySelector('.relative.transform')).toHaveClass('max-w-4xl');

    rerender(<Modal isOpen={true} onClose={vi.fn()} size="full">Full</Modal>);
    expect(document.querySelector('.relative.transform')).toHaveClass('max-w-full');
  });

  it('applies custom className', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} className="custom-modal">Content</Modal>);
    
    const modalContent = document.querySelector('.relative.transform');
    expect(modalContent).toHaveClass('custom-modal');
  });

  it('has proper accessibility attributes', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} title="Accessible Modal">Content</Modal>);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('prevents body scroll when open', () => {
    const { rerender } = render(<Modal isOpen={false} onClose={vi.fn()}>Content</Modal>);
    expect(document.body.style.overflow).toBe('unset');

    rerender(<Modal isOpen={true} onClose={vi.fn()}>Content</Modal>);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<Modal isOpen={false} onClose={vi.fn()}>Content</Modal>);
    expect(document.body.style.overflow).toBe('unset');
  });

  it('handles focus management', () => {
    render(<TestModal initialOpen={true} />);
    
    // Check that focus is managed - any focusable element should be focused
    const buttons = screen.getAllByRole('button');
    const focusedElement = document.activeElement;
    const isFocusManaged = buttons.some(button => button === focusedElement);
    
    expect(isFocusManaged).toBe(true);
  });

  it('traps focus within modal', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <button>First</button>
        <button>Second</button>
      </Modal>
    );

    const buttons = screen.getAllByRole('button');
    const firstButton = buttons[0];
    const lastButton = buttons[buttons.length - 1];

    if (firstButton && lastButton) {
      // Tab from last to first
      lastButton.focus();
      fireEvent.keyDown(lastButton, { key: 'Tab' });
      expect(document.activeElement).toBe(firstButton);

      // Shift+Tab from first to last
      firstButton.focus();
      fireEvent.keyDown(firstButton, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(lastButton);
    }
  });
});