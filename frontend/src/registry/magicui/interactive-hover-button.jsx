import React from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export const InteractiveHoverButton = React.forwardRef(
  ({ children, icon: Icon, showArrow = true, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "group bg-background relative w-auto cursor-pointer overflow-hidden rounded-full border p-2 px-6 text-center font-semibold",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2">
          <div className="bg-primary h-2 w-2 rounded-full transition-all duration-300 group-hover:scale-[100.8]"></div>
          {Icon && <Icon className="h-5 w-5" />}
          <span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
            {children}
          </span>
        </div>
        <div className="text-primary-foreground absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:-translate-x-6 group-hover:opacity-100">
          {Icon && <Icon className="h-5 w-5" />}
          <span>{children}</span>
          {showArrow && <ArrowRight />}
        </div>
      </button>
    );
  },
);

InteractiveHoverButton.displayName = "InteractiveHoverButton";
