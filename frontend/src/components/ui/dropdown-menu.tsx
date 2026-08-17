"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownContext = React.createContext<DropdownContextType | undefined>(undefined);

function useDropdown() {
  const context = React.useContext(DropdownContext);
  if (!context) {
    throw new Error("Dropdown components must be used within a DropdownMenu");
  }
  return context;
}

interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={containerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

function DropdownMenuTrigger({ children, className, asChild, ...props }: DropdownMenuTriggerProps) {
  const { open, setOpen } = useDropdown();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
      onClick: (e: React.MouseEvent) => {
        (children as any).props?.onClick?.(e);
        setOpen((prev) => !prev);
      },
    });
  }

  return (
    <button
      type="button"
      onClick={() => setOpen((prev) => !prev)}
      className={cn("outline-none", className)}
      {...props}
    >
      {children}
    </button>
  );
}

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  sideOffset?: number;
}

function DropdownMenuContent({ className, children, sideOffset, ...props }: DropdownMenuContentProps) {
  const { open } = useDropdown();

  if (!open) return null;

  return (
    <div
      data-slot="dropdown-menu-content"
      style={sideOffset ? { marginTop: `${sideOffset}px` } : undefined}
      className={cn(
        "absolute right-0 mt-2 z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-xl transition-all animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  disabled?: boolean;
}

function DropdownMenuItem({ className, inset, onClick, children, ...props }: DropdownMenuItemProps) {
  const { setOpen } = useDropdown();

  return (
    <div
      data-slot="dropdown-menu-item"
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn("px-2.5 py-1.5 text-xs font-bold text-foreground", inset && "pl-8", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1.5 h-px bg-border", className)}
      {...props}
    />
  );
}

function DropdownMenuGroup({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>;
}

function DropdownMenuPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DropdownMenuSub({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DropdownMenuRadioGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
};