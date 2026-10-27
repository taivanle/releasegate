import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Disabled buttons drop their fill and take a dashed outline so they read as unavailable
// while keeping legible text. aria-busy marks "disabled because saving" and keeps the fill.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-semibold tracking-[-0.005em] whitespace-nowrap transition-[background-color,border-color,color,scale] duration-300 ease-out-expo select-none motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:not-aria-busy:border-dashed disabled:not-aria-busy:border-line-strong disabled:not-aria-busy:bg-transparent disabled:not-aria-busy:text-muted-foreground aria-busy:cursor-progress aria-busy:opacity-80 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline: "border-line-strong text-foreground hover:border-primary/50 hover:bg-primary/6",
        secondary: "bg-raised text-foreground hover:bg-accent",
        ghost: "text-foreground hover:bg-accent",
        destructive: "border-danger-line text-danger hover:bg-danger-surface",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 gap-2 px-4",
        xs: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-5",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
