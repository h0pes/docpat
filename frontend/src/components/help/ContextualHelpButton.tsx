/**
 * ContextualHelpButton Component
 *
 * A reusable help button that displays contextual help content
 * via tooltip or popover. Can be placed next to form fields or
 * section headers to provide inline help.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type HelpVariant = 'tooltip' | 'popover';
type HelpSize = 'sm' | 'md' | 'lg';
type HelpSide = 'top' | 'right' | 'bottom' | 'left';

interface ContextualHelpButtonProps {
  /** Translation key for the help content (under help.contextual.*) */
  helpKey: string;
  /** How to display the help content */
  variant?: HelpVariant;
  /** Size of the help icon */
  size?: HelpSize;
  /** Position of the tooltip/popover */
  side?: HelpSide;
  /** Additional className */
  className?: string;
  /** Custom help content (overrides helpKey) */
  content?: string;
  /** Title for popover variant */
  title?: string;
}

const sizeMap: Record<HelpSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const buttonSizeMap: Record<HelpSize, string> = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-7 w-7',
};

/**
 * ContextualHelpButton Component
 *
 * Displays a small help icon that shows contextual help on hover (tooltip)
 * or click (popover). Use this to provide inline help for form fields,
 * complex features, or any UI element that needs explanation.
 *
 * @example
 * // Tooltip variant (default) - shows on hover
 * <ContextualHelpButton helpKey="patients_list" />
 *
 * @example
 * // Popover variant - shows on click, good for longer content
 * <ContextualHelpButton helpKey="prescription_interactions" variant="popover" />
 *
 * @example
 * // Custom content
 * <ContextualHelpButton content="Enter patient's date of birth" />
 */
export function ContextualHelpButton({
  helpKey,
  variant = 'tooltip',
  size = 'md',
  side = 'top',
  className,
  content,
  title,
}: ContextualHelpButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Get the help content from translations or use custom content
  const helpContent = content || t(`help.contextual.${helpKey}`);
  const helpTitle = title || t('help.title');

  const iconClassName = cn(
    sizeMap[size],
    'text-muted-foreground hover:text-foreground transition-colors'
  );

  const buttonClassName = cn(
    buttonSizeMap[size],
    'p-0 rounded-full',
    className
  );

  if (variant === 'popover') {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={buttonClassName}
            aria-label={helpTitle}
          >
            <HelpCircle className={iconClassName} />
          </Button>
        </PopoverTrigger>
        <PopoverContent side={side} className="w-80">
          {title && (
            <h4 className="font-medium text-sm mb-2">{helpTitle}</h4>
          )}
          <p className="text-sm text-muted-foreground">{helpContent}</p>
        </PopoverContent>
      </Popover>
    );
  }

  // Default: Tooltip variant
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={buttonClassName}
            aria-label={helpTitle}
          >
            <HelpCircle className={iconClassName} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p className="text-sm">{helpContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ContextualHelpButton;
