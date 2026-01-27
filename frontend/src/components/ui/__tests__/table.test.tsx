/**
 * Table Component Tests
 *
 * Tests for the table component with header, body, footer, and cells.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '../table';

describe('Table', () => {
  describe('Table (root)', () => {
    it('renders table element', () => {
      render(<Table />);

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('wraps table in scrollable container', () => {
      const { container } = render(<Table />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('overflow-auto');
    });

    it('applies table styles', () => {
      render(<Table />);

      const table = screen.getByRole('table');
      expect(table).toHaveClass('w-full');
      expect(table).toHaveClass('text-sm');
    });

    it('applies custom className', () => {
      render(<Table className="custom-table" />);

      expect(screen.getByRole('table')).toHaveClass('custom-table');
    });
  });

  describe('TableHeader', () => {
    it('renders thead element', () => {
      render(
        <Table>
          <TableHeader data-testid="header" />
        </Table>
      );

      expect(screen.getByTestId('header').tagName).toBe('THEAD');
    });

    it('applies header styles', () => {
      render(
        <Table>
          <TableHeader data-testid="header" />
        </Table>
      );

      expect(screen.getByTestId('header')).toHaveClass('[&_tr]:border-b');
    });

    it('applies custom className', () => {
      render(
        <Table>
          <TableHeader className="custom-header" data-testid="header" />
        </Table>
      );

      expect(screen.getByTestId('header')).toHaveClass('custom-header');
    });
  });

  describe('TableBody', () => {
    it('renders tbody element', () => {
      render(
        <Table>
          <TableBody data-testid="body" />
        </Table>
      );

      expect(screen.getByTestId('body').tagName).toBe('TBODY');
    });

    it('applies body styles', () => {
      render(
        <Table>
          <TableBody data-testid="body" />
        </Table>
      );

      expect(screen.getByTestId('body')).toHaveClass('[&_tr:last-child]:border-0');
    });

    it('applies custom className', () => {
      render(
        <Table>
          <TableBody className="custom-body" data-testid="body" />
        </Table>
      );

      expect(screen.getByTestId('body')).toHaveClass('custom-body');
    });
  });

  describe('TableFooter', () => {
    it('renders tfoot element', () => {
      render(
        <Table>
          <TableFooter data-testid="footer" />
        </Table>
      );

      expect(screen.getByTestId('footer').tagName).toBe('TFOOT');
    });

    it('applies footer styles', () => {
      render(
        <Table>
          <TableFooter data-testid="footer" />
        </Table>
      );

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('border-t');
      expect(footer).toHaveClass('bg-muted/50');
      expect(footer).toHaveClass('font-medium');
    });

    it('applies custom className', () => {
      render(
        <Table>
          <TableFooter className="custom-footer" data-testid="footer" />
        </Table>
      );

      expect(screen.getByTestId('footer')).toHaveClass('custom-footer');
    });
  });

  describe('TableRow', () => {
    it('renders tr element', () => {
      render(
        <Table>
          <TableBody>
            <TableRow data-testid="row" />
          </TableBody>
        </Table>
      );

      expect(screen.getByTestId('row').tagName).toBe('TR');
    });

    it('applies row styles', () => {
      render(
        <Table>
          <TableBody>
            <TableRow data-testid="row" />
          </TableBody>
        </Table>
      );

      const row = screen.getByTestId('row');
      expect(row).toHaveClass('border-b');
      expect(row).toHaveClass('transition-colors');
    });

    it('applies custom className', () => {
      render(
        <Table>
          <TableBody>
            <TableRow className="custom-row" data-testid="row" />
          </TableBody>
        </Table>
      );

      expect(screen.getByTestId('row')).toHaveClass('custom-row');
    });
  });

  describe('TableHead', () => {
    it('renders th element', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      expect(screen.getByRole('columnheader')).toBeInTheDocument();
    });

    it('displays header text', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('applies head styles', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead data-testid="head">Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      const head = screen.getByTestId('head');
      expect(head).toHaveClass('h-10');
      expect(head).toHaveClass('font-medium');
      expect(head).toHaveClass('text-muted-foreground');
    });

    it('applies custom className', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="custom-head" data-testid="head">Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      expect(screen.getByTestId('head')).toHaveClass('custom-head');
    });
  });

  describe('TableCell', () => {
    it('renders td element', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByRole('cell')).toBeInTheDocument();
    });

    it('displays cell text', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('applies cell styles', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell data-testid="cell">Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const cell = screen.getByTestId('cell');
      expect(cell).toHaveClass('p-2');
      expect(cell).toHaveClass('align-middle');
    });

    it('applies custom className', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="custom-cell" data-testid="cell">Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByTestId('cell')).toHaveClass('custom-cell');
    });
  });

  describe('TableCaption', () => {
    it('renders caption element', () => {
      render(
        <Table>
          <TableCaption>A list of users</TableCaption>
        </Table>
      );

      expect(screen.getByText('A list of users')).toBeInTheDocument();
    });

    it('applies caption styles', () => {
      render(
        <Table>
          <TableCaption data-testid="caption">Caption</TableCaption>
        </Table>
      );

      const caption = screen.getByTestId('caption');
      expect(caption).toHaveClass('mt-4');
      expect(caption).toHaveClass('text-sm');
      expect(caption).toHaveClass('text-muted-foreground');
    });

    it('applies custom className', () => {
      render(
        <Table>
          <TableCaption className="custom-caption" data-testid="caption">Caption</TableCaption>
        </Table>
      );

      expect(screen.getByTestId('caption')).toHaveClass('custom-caption');
    });
  });

  describe('Complete Table', () => {
    it('renders a complete table with all parts', () => {
      render(
        <Table>
          <TableCaption>User List</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
              <TableCell>john@example.com</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Jane Smith</TableCell>
              <TableCell>jane@example.com</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Total: 2 users</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('User List')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('Total: 2 users')).toBeInTheDocument();
    });
  });
});
