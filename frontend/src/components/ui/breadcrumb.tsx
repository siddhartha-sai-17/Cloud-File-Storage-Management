import * as React from "react"
import { Link } from "react-router"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/utils/utils"

export interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbProps extends React.HtmlHTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items, className, ...props }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm font-medium text-muted-foreground", className)}
      {...props}
    >
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        <li className="inline-flex items-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} className="inline-flex items-center">
              <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/60 shrink-0" />
              {isLast || !item.path ? (
                <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-[200px]" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-[200px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
