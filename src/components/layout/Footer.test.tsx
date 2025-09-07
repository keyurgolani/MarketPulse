import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Footer,
  FooterSection,
  FooterLink,
  FooterCopyright,
  FooterSocialLinks,
} from './Footer';

describe('Footer', () => {
  it('renders with default styling', () => {
    render(<Footer>Footer content</Footer>);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('bg-white', 'border-t', 'border-gray-200');
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Footer className='custom-footer'>Content</Footer>);

    expect(screen.getByRole('contentinfo')).toHaveClass('custom-footer');
  });

  it('has proper container styling', () => {
    render(<Footer>Content</Footer>);

    const footer = screen.getByRole('contentinfo');
    const container = footer.querySelector('div');
    expect(container).toHaveClass('max-w-7xl', 'mx-auto', 'px-4', 'py-8');
  });
});

describe('FooterSection', () => {
  it('renders without title', () => {
    render(
      <FooterSection>
        <div>Section content</div>
      </FooterSection>
    );

    expect(screen.getByText('Section content')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <FooterSection title='Section Title'>
        <div>Section content</div>
      </FooterSection>
    );

    expect(screen.getByText('Section Title')).toBeInTheDocument();
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });

  it('has proper title styling', () => {
    render(<FooterSection title='Title'>Content</FooterSection>);

    const title = screen.getByText('Title');
    expect(title).toHaveClass(
      'text-sm',
      'font-semibold',
      'uppercase',
      'tracking-wider'
    );
  });

  it('applies custom className', () => {
    render(<FooterSection className='custom-section'>Content</FooterSection>);

    const section = screen.getByText('Content').parentElement;
    expect(section).toHaveClass('custom-section');
  });

  it('has proper spacing', () => {
    render(<FooterSection>Content</FooterSection>);

    const section = screen.getByText('Content').parentElement;
    expect(section).toHaveClass('space-y-4');
  });
});

describe('FooterLink', () => {
  it('renders internal link', () => {
    render(<FooterLink href='/about'>About Us</FooterLink>);

    const link = screen.getByRole('link', { name: /about us/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/about');
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  it('renders external link', () => {
    render(
      <FooterLink href='https://example.com' external>
        External Link
      </FooterLink>
    );

    const link = screen.getByRole('link', { name: /external link/i });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows external link icon', () => {
    render(
      <FooterLink href='https://example.com' external>
        External
      </FooterLink>
    );

    const link = screen.getByRole('link');
    const svg = link.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('inline-block', 'ml-1', 'h-3', 'w-3');
  });

  it('has proper styling', () => {
    render(<FooterLink href='/test'>Test Link</FooterLink>);

    const link = screen.getByRole('link');
    expect(link).toHaveClass(
      'text-sm',
      'text-gray-600',
      'hover:text-gray-900',
      'transition-colors',
      'block'
    );
  });

  it('applies custom className', () => {
    render(
      <FooterLink href='/test' className='custom-link'>
        Link
      </FooterLink>
    );

    expect(screen.getByRole('link')).toHaveClass('custom-link');
  });
});

describe('FooterCopyright', () => {
  it('renders with current year by default', () => {
    const currentYear = new Date().getFullYear();
    render(<FooterCopyright company='Test Company' />);

    const copyright = screen.getByText(
      `© ${currentYear} Test Company. All rights reserved.`
    );
    expect(copyright).toBeInTheDocument();
  });

  it('renders with custom year', () => {
    render(<FooterCopyright year={2020} company='Test Company' />);

    const copyright = screen.getByText(
      '© 2020 Test Company. All rights reserved.'
    );
    expect(copyright).toBeInTheDocument();
  });

  it('has proper styling', () => {
    render(<FooterCopyright company='Test' />);

    const container = screen.getByText(
      /© \d+ Test\. All rights reserved\./
    ).parentElement;
    expect(container).toHaveClass(
      'border-t',
      'border-gray-200',
      'pt-6',
      'mt-8'
    );

    const text = screen.getByText(/© \d+ Test\. All rights reserved\./);
    expect(text).toHaveClass('text-sm', 'text-gray-500', 'text-center');
  });

  it('applies custom className', () => {
    render(<FooterCopyright company='Test' className='custom-copyright' />);

    const container = screen.getByText(
      /© \d+ Test\. All rights reserved\./
    ).parentElement;
    expect(container).toHaveClass('custom-copyright');
  });
});

describe('FooterSocialLinks', () => {
  const socialLinks = [
    {
      name: 'Twitter',
      href: 'https://twitter.com/company',
      icon: <span data-testid='twitter-icon'>T</span>,
    },
    {
      name: 'Facebook',
      href: 'https://facebook.com/company',
      icon: <span data-testid='facebook-icon'>F</span>,
    },
  ];

  it('renders all social links', () => {
    render(<FooterSocialLinks links={socialLinks} />);

    expect(
      screen.getByRole('link', { name: /follow us on twitter/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /follow us on facebook/i })
    ).toBeInTheDocument();
  });

  it('renders social link icons', () => {
    render(<FooterSocialLinks links={socialLinks} />);

    expect(screen.getByTestId('twitter-icon')).toBeInTheDocument();
    expect(screen.getByTestId('facebook-icon')).toBeInTheDocument();
  });

  it('has proper link attributes', () => {
    render(<FooterSocialLinks links={socialLinks} />);

    const twitterLink = screen.getByRole('link', {
      name: /follow us on twitter/i,
    });
    expect(twitterLink).toHaveAttribute('href', 'https://twitter.com/company');
    expect(twitterLink).toHaveAttribute('target', '_blank');
    expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('has proper styling', () => {
    render(<FooterSocialLinks links={socialLinks} />);

    const container =
      screen.getByTestId('twitter-icon').parentElement?.parentElement
        ?.parentElement;
    expect(container).toHaveClass('flex', 'space-x-4');

    const link = screen.getByRole('link', { name: /follow us on twitter/i });
    expect(link).toHaveClass(
      'text-gray-400',
      'hover:text-gray-500',
      'transition-colors'
    );
  });

  it('applies custom className', () => {
    render(<FooterSocialLinks links={socialLinks} className='custom-social' />);

    const container =
      screen.getByTestId('twitter-icon').parentElement?.parentElement
        ?.parentElement;
    expect(container).toHaveClass('custom-social');
  });

  it('handles empty links array', () => {
    render(<FooterSocialLinks links={[]} />);

    const container = document.querySelector('.flex.space-x-4');
    expect(container).toBeEmptyDOMElement();
  });

  it('has proper icon container styling', () => {
    render(<FooterSocialLinks links={socialLinks} />);

    const iconContainer = screen.getByTestId('twitter-icon').parentElement;
    expect(iconContainer).toHaveClass('h-5', 'w-5');
  });
});
