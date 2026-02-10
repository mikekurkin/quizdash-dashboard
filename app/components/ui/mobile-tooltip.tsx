import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'

import { cn } from '~/lib/utils'

const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>

type HoverPopoverContextValue = {
  isTouch: boolean
  open: boolean
  setOpen: (open: boolean) => void
}

const HoverPopoverContext = React.createContext<HoverPopoverContextValue | null>(null)

const Tooltip = ({ children, ...props }: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>) => {
  const [isTouch, setIsTouch] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(pointer: coarse)')
    const update = () => setIsTouch(media.matches)
    update()
    if (media.addEventListener) {
      media.addEventListener('change', update)
    } else {
      media.addListener(update)
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', update)
      } else {
        media.removeListener(update)
      }
    }
  }, [])

  return (
    <HoverPopoverContext.Provider value={{ isTouch, open, setOpen }}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen} {...props}>
        {children}
      </PopoverPrimitive.Root>
    </HoverPopoverContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ onPointerEnter, onPointerLeave, onFocus, onBlur, onClick, ...props }, ref) => {
  const ctx = React.useContext(HoverPopoverContext)

  return (
    <PopoverPrimitive.Trigger
      ref={ref}
      onPointerEnter={(event) => {
        if (!ctx?.isTouch) ctx?.setOpen(true)
        onPointerEnter?.(event)
      }}
      onPointerLeave={(event) => {
        if (!ctx?.isTouch) ctx?.setOpen(false)
        onPointerLeave?.(event)
      }}
      onFocus={(event) => {
        if (!ctx?.isTouch) ctx?.setOpen(true)
        onFocus?.(event)
      }}
      onBlur={(event) => {
        if (!ctx?.isTouch) ctx?.setOpen(false)
        onBlur?.(event)
      }}
      onClick={(event) => {
        if (ctx?.isTouch) {
          event.preventDefault()
          ctx.setOpen(!ctx.open)
        }
        onClick?.(event)
      }}
      {...props}
    />
  )
})
TooltipTrigger.displayName = PopoverPrimitive.Trigger.displayName

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
TooltipContent.displayName = PopoverPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
