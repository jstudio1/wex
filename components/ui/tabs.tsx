import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{
  currentValue: string
  onValueChange?: (value: string) => void
} | null>(null);

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string
    onValueChange?: (value: string) => void
    defaultValue?: string
  }
>(({ className, value, onValueChange, defaultValue, children, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '')
  const currentValue = value !== undefined ? value : internalValue
  const handleChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ currentValue, onValueChange: handleChange }}>
      <div
        ref={ref}
        className={cn("w-full", className)}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
  )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-gray-900/50 p-1 text-gray-300",
      className
    )}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string
    active?: boolean
  }
>(({ className, value, active, onClick, ...props }, ref) => {
  const context = React.useContext(TabsContext);
  const isActive = active ?? (context?.currentValue === value);
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (context) {
      context.onValueChange?.(value);
    }
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-purple-900/40 text-white shadow-sm"
          : "text-gray-400 hover:text-white hover:bg-gray-800",
        className
      )}
      onClick={handleClick}
      {...props}
    />
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
    active?: boolean
  }
>(({ className, value, active, ...props }, ref) => {
  const context = React.useContext(TabsContext);
  const isActive = active ?? (context?.currentValue === value);
  
  if (!isActive) return null
  return (
    <div
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }

