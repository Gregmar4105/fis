import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
 
  const { onOpenChange, ...rest } = props as any

  const handleOpenChange = (open: boolean) => {
    try {
      const active = document.activeElement as HTMLElement | null
      if (open) {
        // Blur any active element outside the dialog before it opens
        if (active && !active.closest('[data-slot="dialog-content"]')) {
          try { active.blur && active.blur() } catch (e) {}
        }

        // Close any open popovers/selects that might retain focus
        try {
          const ev = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
          document.dispatchEvent(ev)
        } catch (e) {}

        // Set inert on background elements to prevent focus
        try {
          const bodyChildren = Array.from(document.body.children) as HTMLElement[]
          for (const child of bodyChildren) {
            const isDialogPortal = child.getAttribute && child.getAttribute('data-slot') === 'dialog-portal'
            const containsDialog = child.querySelector && !!child.querySelector('[data-slot="dialog-content"]')
            if (!isDialogPortal && !containsDialog) {
              try { (child as any).inert = true } catch (e) {}
            }
          }
        } catch (e) {}

        // After a short delay, ensure focus is in the dialog and not on a hidden element
        setTimeout(() => {
          try {
            const dialogContent = document.querySelector('[data-slot="dialog-content"][data-state="open"]') as HTMLElement | null
            if (dialogContent) {
              const isHidden = dialogContent.getAttribute('aria-hidden') === 'true'
              const hasFocus = dialogContent.contains(document.activeElement)
              
              // If dialog is marked as hidden but has focus, find and focus a proper element
              if (isHidden && hasFocus) {
                const focusable = dialogContent.querySelector<HTMLElement>(
                  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
                if (focusable) {
                  focusable.focus()
                }
              }
            }
          } catch (e) {
            // Ignore errors
          }
        }, 100)
      } else {
        try {
          const bodyChildren = Array.from(document.body.children) as HTMLElement[]
          for (const child of bodyChildren) {
            try { (child as any).inert = false } catch (e) {}
          }
        } catch (e) {}
      }
    } catch (e) {
      // ignore DOM access errors in SSR or unusual environments
    }

    if (typeof onOpenChange === 'function') onOpenChange(open)
  }

  return <DialogPrimitive.Root data-slot="dialog" {...rest} onOpenChange={handleOpenChange} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
