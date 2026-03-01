import { Toaster as SonnerToaster } from "sonner";
import { cn } from "@/lib/utils.js";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster({ className, ...props }: ToasterProps) {
  return (
    <SonnerToaster
      theme="dark"
      className={cn("tc [&_[data-sonner-toast]]:to [&_[data-sonner-toast]_button]:tcl", className)}
      toastOptions={{
        classNames: {
          toast: "to",
          closeButton: "tcl",
        },
      }}
      {...props}
    />
  );
}
