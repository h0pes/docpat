/**
 * HelpSearch Component Tests
 *
 * Tests for the help search input component with debounce functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelpSearch, highlightText } from '../HelpSearch';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('HelpSearch', () => {
  describe('Rendering', () => {
    it('renders search input with default placeholder', () => {
      render(<HelpSearch onSearch={vi.fn()} />);

      expect(screen.getByPlaceholderText('help.search_placeholder')).toBeInTheDocument();
    });

    it('renders search input with custom placeholder', () => {
      render(<HelpSearch onSearch={vi.fn()} placeholder="Search help topics..." />);

      expect(screen.getByPlaceholderText('Search help topics...')).toBeInTheDocument();
    });

    it('renders with initial value', () => {
      render(<HelpSearch onSearch={vi.fn()} initialValue="test query" />);

      expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <HelpSearch onSearch={vi.fn()} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Search Functionality', () => {
    it('calls onSearch with debounce', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<HelpSearch onSearch={onSearch} debounceMs={50} />);

      const input = screen.getByPlaceholderText('help.search_placeholder');
      await user.type(input, 'test');

      // Wait for debounce
      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith('test');
      });
    });

    it('debounces multiple keystrokes', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<HelpSearch onSearch={onSearch} debounceMs={50} />);

      const input = screen.getByPlaceholderText('help.search_placeholder');
      await user.type(input, 'abc');

      await waitFor(() => {
        // Should call with the final value
        expect(onSearch).toHaveBeenLastCalledWith('abc');
      });
    });

    it('uses custom debounce delay', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<HelpSearch onSearch={onSearch} debounceMs={50} />);

      const input = screen.getByPlaceholderText('help.search_placeholder');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith('test');
      });
    });
  });

  describe('Clear Button', () => {
    it('shows clear button when input has value', async () => {
      const user = userEvent.setup();
      render(<HelpSearch onSearch={vi.fn()} />);

      const input = screen.getByPlaceholderText('help.search_placeholder');
      await user.type(input, 'test');

      expect(screen.getByRole('button', { name: 'common.clear' })).toBeInTheDocument();
    });

    it('hides clear button when input is empty', () => {
      render(<HelpSearch onSearch={vi.fn()} />);

      expect(screen.queryByRole('button', { name: 'common.clear' })).not.toBeInTheDocument();
    });

    it('clears input and calls onSearch with empty string', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<HelpSearch onSearch={onSearch} initialValue="test" />);

      const clearButton = screen.getByRole('button', { name: 'common.clear' });
      await user.click(clearButton);

      expect(screen.getByDisplayValue('')).toBeInTheDocument();
      expect(onSearch).toHaveBeenCalledWith('');
    });
  });

  describe('Input Changes', () => {
    it('updates value on input change', async () => {
      const user = userEvent.setup();
      render(<HelpSearch onSearch={vi.fn()} />);

      const input = screen.getByPlaceholderText('help.search_placeholder');
      await user.type(input, 'new value');

      expect(input).toHaveValue('new value');
    });
  });
});

describe('highlightText', () => {
  it('returns original text when query is empty', () => {
    const result = highlightText('Hello world', '');
    expect(result).toBe('Hello world');
  });

  it('returns original text when query is whitespace', () => {
    const result = highlightText('Hello world', '   ');
    expect(result).toBe('Hello world');
  });

  it('highlights matching text', () => {
    const { container } = render(<>{highlightText('Hello world', 'world')}</>);
    const mark = container.querySelector('mark');
    expect(mark).toBeInTheDocument();
    expect(mark).toHaveTextContent('world');
  });

  it('highlights case-insensitively', () => {
    const { container } = render(<>{highlightText('Hello World', 'WORLD')}</>);
    const mark = container.querySelector('mark');
    expect(mark).toBeInTheDocument();
    expect(mark).toHaveTextContent('World');
  });

  it('highlights multiple matches', () => {
    const { container } = render(<>{highlightText('hello hello hello', 'hello')}</>);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(3);
  });

  it('escapes special regex characters in query', () => {
    const { container } = render(<>{highlightText('Test (value)', '(value)')}</>);
    const mark = container.querySelector('mark');
    expect(mark).toBeInTheDocument();
    expect(mark).toHaveTextContent('(value)');
  });
});
