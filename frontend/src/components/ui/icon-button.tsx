/**
 * IconButton Component
 *
 * An accessible icon-only button wrapped in a Tooltip.
 * Ensures every icon button has an aria-label and an optional
 * visible tooltip for sighted users.
 */

import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button, type ButtonProps } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  /** Lucide icon component to render */
  icon: LucideIcon;
  /** Accessible label (always set as aria-label, shown in tooltip if enabled) */
  label: string;
  /** Icon size classes (defaults to "h-4 w-4") */
  iconClassName?: string;
  /** Whether to show a tooltip on hover (defaults to true) */
  showTooltip?: boolean;
}

/**
 * Accessible icon-only button with tooltip.
 *
 * Always provides an `aria-label` for screen readers. By default,
 * wraps the button in a Tooltip so sighted users can also discover
 * the button's purpose on hover/focus.
 *
 * @example
 * ```tsx
 * <IconButton
 *   icon={ArrowLeft}
 *   label={t('common.goBack')}
 *   variant="ghost"
 *   size="icon"
 *   onClick={() => navigate(-1)}
 * />
 * ```
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, label, iconClassName = 'h-4 w-4', showTooltip = true, ...buttonProps }, ref) => {
    const button = (
      <Button ref={ref} aria-label={label} {...buttonProps}>
        <Icon className={iconClassName} />
      </Button>
    );

    if (!showTooltip) {
      return button;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  }
);

IconButton.displayName = 'IconButton';
