import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card';

describe('Card', () => {
  it('renders with default props', () => {
    render(<Card>Card content</Card>);

    const card = screen.getByText('Card content');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('rounded-lg', 'bg-white', 'shadow-sm', 'p-6');
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<Card variant='outlined'>Outlined</Card>);
    expect(screen.getByText('Outlined')).toHaveClass(
      'border',
      'border-gray-200'
    );

    rerender(<Card variant='elevated'>Elevated</Card>);
    expect(screen.getByText('Elevated')).toHaveClass('shadow-lg');
  });

  it('renders different padding sizes correctly', () => {
    const { rerender } = render(<Card padding='none'>No padding</Card>);
    expect(screen.getByText('No padding')).not.toHaveClass('p-4', 'p-6', 'p-8');

    rerender(<Card padding='sm'>Small padding</Card>);
    expect(screen.getByText('Small padding')).toHaveClass('p-4');

    rerender(<Card padding='lg'>Large padding</Card>);
    expect(screen.getByText('Large padding')).toHaveClass('p-8');
  });

  it('applies custom className', () => {
    render(<Card className='custom-card'>Custom</Card>);

    expect(screen.getByText('Custom')).toHaveClass('custom-card');
  });

  it('forwards additional props', () => {
    render(<Card data-testid='test-card'>Test</Card>);

    expect(screen.getByTestId('test-card')).toBeInTheDocument();
  });
});

describe('CardHeader', () => {
  it('renders with proper styling', () => {
    render(<CardHeader>Header content</CardHeader>);

    const header = screen.getByText('Header content');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('border-b', 'border-gray-200', 'pb-4', 'mb-4');
  });

  it('applies custom className', () => {
    render(<CardHeader className='custom-header'>Header</CardHeader>);

    expect(screen.getByText('Header')).toHaveClass('custom-header');
  });
});

describe('CardTitle', () => {
  it('renders as h3 by default', () => {
    render(<CardTitle>Card Title</CardTitle>);

    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Card Title');
    expect(title).toHaveClass('text-lg', 'font-semibold');
  });

  it('renders with different heading levels', () => {
    const { rerender } = render(<CardTitle as='h1'>Title H1</CardTitle>);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

    rerender(<CardTitle as='h2'>Title H2</CardTitle>);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

    rerender(<CardTitle as='h4'>Title H4</CardTitle>);
    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CardTitle className='custom-title'>Title</CardTitle>);

    expect(screen.getByRole('heading')).toHaveClass('custom-title');
  });
});

describe('CardContent', () => {
  it('renders with proper styling', () => {
    render(<CardContent>Content text</CardContent>);

    const content = screen.getByText('Content text');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('text-gray-600');
  });

  it('applies custom className', () => {
    render(<CardContent className='custom-content'>Content</CardContent>);

    expect(screen.getByText('Content')).toHaveClass('custom-content');
  });
});

describe('CardFooter', () => {
  it('renders with proper styling', () => {
    render(<CardFooter>Footer content</CardFooter>);

    const footer = screen.getByText('Footer content');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('border-t', 'border-gray-200', 'pt-4', 'mt-4');
  });

  it('applies custom className', () => {
    render(<CardFooter className='custom-footer'>Footer</CardFooter>);

    expect(screen.getByText('Footer')).toHaveClass('custom-footer');
  });
});

describe('Card composition', () => {
  it('renders complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>This is the card content.</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>
    );

    expect(
      screen.getByRole('heading', { name: /test card/i })
    ).toBeInTheDocument();
    expect(screen.getByText('This is the card content.')).toBeInTheDocument();
    expect(screen.getByText('Footer actions')).toBeInTheDocument();
  });
});
