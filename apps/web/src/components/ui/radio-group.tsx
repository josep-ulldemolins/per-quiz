import * as React from 'react'
import { cn } from '@/lib/utils'

const RadioGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value?: string; onValueChange?: (v: string) => void }>(
  ({ className, value, onValueChange, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="radiogroup"
        className={cn('grid gap-2', className)}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
              checked: (child.props as any).value === value,
              onSelect: () => onValueChange?.((child.props as any).value),
            })
          }
          return child
        })}
      </div>
    )
  }
)
RadioGroup.displayName = 'RadioGroup'

interface RadioGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  checked?: boolean
  onSelect?: () => void
}

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value, checked, onSelect, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={checked}
        onClick={onSelect}
        className={cn(
          'group relative flex items-center gap-3 rounded-lg border-2 border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/30',
          checked && 'border-primary bg-primary/5 ring-2 ring-primary/20',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
RadioGroupItem.displayName = 'RadioGroupItem'

export { RadioGroup, RadioGroupItem }
