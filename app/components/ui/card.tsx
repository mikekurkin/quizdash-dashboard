import { cn } from "~/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  width?: string
  className?: string
}

export default function Card({ children, width = '350px', className }: CardProps) {
  return <div className={cn(`p-4 border rounded-lg min-w-[${width}] flex flex-1 flex-col`, className)}>{children}</div>
}
