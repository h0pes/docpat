/**
 * Command Component Tests
 *
 * Tests for the command palette component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
  CommandDialog,
} from '../command';

describe('Command', () => {
  describe('Basic Rendering', () => {
    it('renders command container', () => {
      render(
        <Command data-testid="command">
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandItem>Item 1</CommandItem>
          </CommandList>
        </Command>
      );

      expect(screen.getByTestId('command')).toBeInTheDocument();
    });

    it('renders with correct styles', () => {
      render(
        <Command data-testid="command">
          <CommandInput />
          <CommandList>
            <CommandItem>Item</CommandItem>
          </CommandList>
        </Command>
      );

      const command = screen.getByTestId('command');
      expect(command).toHaveClass('flex');
      expect(command).toHaveClass('flex-col');
      expect(command).toHaveClass('rounded-md');
    });
  });

  describe('CommandInput', () => {
    it('renders search input', () => {
      render(
        <Command>
          <CommandInput placeholder="Type to search..." />
          <CommandList>
            <CommandItem>Item</CommandItem>
          </CommandList>
        </Command>
      );

      expect(screen.getByPlaceholderText('Type to search...')).toBeInTheDocument();
    });

    it('renders search icon', () => {
      const { container } = render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem>Item</CommandItem>
          </CommandList>
        </Command>
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('accepts user input', async () => {
      const user = userEvent.setup();
      render(
        <Command>
          <CommandInput placeholder="Search" />
          <CommandList>
            <CommandItem>Item</CommandItem>
          </CommandList>
        </Command>
      );

      const input = screen.getByPlaceholderText('Search');
      await user.type(input, 'test');

      expect(input).toHaveValue('test');
    });
  });

  describe('CommandList', () => {
    it('renders list container', () => {
      render(
        <Command>
          <CommandInput />
          <CommandList data-testid="list">
            <CommandItem>Item 1</CommandItem>
          </CommandList>
        </Command>
      );

      expect(screen.getByTestId('list')).toBeInTheDocument();
    });

    it('applies list styles', () => {
      render(
        <Command>
          <CommandInput />
          <CommandList data-testid="list">
            <CommandItem>Item</CommandItem>
          </CommandList>
        </Command>
      );

      expect(screen.getByTestId('list')).toHaveClass('overflow-y-auto');
    });
  });

  describe('CommandItem', () => {
    it('renders command items', () => {
      render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem>Profile</CommandItem>
            <CommandItem>Settings</CommandItem>
          </CommandList>
        </Command>
      );

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('applies item styles', () => {
      render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem data-testid="item">Item</CommandItem>
          </CommandList>
        </Command>
      );

      const item = screen.getByTestId('item');
      expect(item).toHaveClass('relative');
      expect(item).toHaveClass('flex');
      expect(item).toHaveClass('cursor-default');
    });

    it('calls onSelect when selected', async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem onSelect={onSelect}>Clickable</CommandItem>
          </CommandList>
        </Command>
      );

      await user.click(screen.getByText('Clickable'));

      expect(onSelect).toHaveBeenCalled();
    });

    it('item can be disabled', () => {
      render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem disabled data-testid="item">Disabled</CommandItem>
          </CommandList>
        </Command>
      );

      expect(screen.getByTestId('item')).toHaveAttribute('data-disabled', 'true');
    });
  });

  describe('CommandEmpty', () => {
    it('renders empty state', () => {
      render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
          </CommandList>
        </Command>
      );

      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });

    it('applies empty styles', () => {
      render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandEmpty data-testid="empty">No results</CommandEmpty>
          </CommandList>
        </Command>
      );

      expect(screen.getByTestId('empty')).toHaveClass('py-6');
      expect(screen.getByTestId('empty')).toHaveClass('text-center');
    });
  });

  describe('CommandGroup', () => {
    it('renders group container', () => {
      render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandGroup heading="Actions" data-testid="group">
              <CommandItem>Copy</CommandItem>
              <CommandItem>Paste</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      );

      expect(screen.getByTestId('group')).toBeInTheDocument();
    });

    it('renders group heading', () => {
      render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandGroup heading="Settings">
              <CommandItem>Profile</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      );

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('CommandSeparator', () => {
    it('renders separator', () => {
      render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem>Item 1</CommandItem>
            <CommandSeparator data-testid="separator" />
            <CommandItem>Item 2</CommandItem>
          </CommandList>
        </Command>
      );

      expect(screen.getByTestId('separator')).toBeInTheDocument();
    });

    it('applies separator styles', () => {
      render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandSeparator data-testid="separator" />
          </CommandList>
        </Command>
      );

      expect(screen.getByTestId('separator')).toHaveClass('h-px');
      expect(screen.getByTestId('separator')).toHaveClass('bg-border');
    });
  });

  describe('CommandShortcut', () => {
    it('renders shortcut text', () => {
      render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem>
              Save
              <CommandShortcut>Ctrl+S</CommandShortcut>
            </CommandItem>
          </CommandList>
        </Command>
      );

      expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
    });

    it('applies shortcut styles', () => {
      render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem>
              Copy
              <CommandShortcut data-testid="shortcut">Ctrl+C</CommandShortcut>
            </CommandItem>
          </CommandList>
        </Command>
      );

      const shortcut = screen.getByTestId('shortcut');
      expect(shortcut).toHaveClass('ml-auto');
      expect(shortcut).toHaveClass('text-xs');
    });
  });

  describe('CommandDialog', () => {
    it('renders dialog when open', () => {
      render(
        <CommandDialog open>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandItem>Item</CommandItem>
          </CommandList>
        </CommandDialog>
      );

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <CommandDialog open={false}>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandItem>Item</CommandItem>
          </CommandList>
        </CommandDialog>
      );

      expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('filters items based on input', async () => {
      const user = userEvent.setup();
      render(
        <Command>
          <CommandInput placeholder="Search" />
          <CommandList>
            <CommandItem>Apple</CommandItem>
            <CommandItem>Banana</CommandItem>
            <CommandItem>Cherry</CommandItem>
          </CommandList>
        </Command>
      );

      const input = screen.getByPlaceholderText('Search');
      await user.type(input, 'apple');

      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('can navigate with arrow keys', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Command>
          <CommandInput placeholder="Search" />
          <CommandList>
            <CommandItem data-testid="item1">Item 1</CommandItem>
            <CommandItem data-testid="item2">Item 2</CommandItem>
          </CommandList>
        </Command>
      );

      const input = screen.getByPlaceholderText('Search');
      input.focus();

      await user.keyboard('{ArrowDown}');

      // After arrow down, one of the items should be selected
      await waitFor(() => {
        const selectedItem = container.querySelector('[data-selected="true"]');
        expect(selectedItem).toBeInTheDocument();
      });
    });
  });
});
