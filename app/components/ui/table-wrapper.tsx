import { cn } from '~/lib/utils'

interface TableWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  wrapperClassName?: string
  heightClassName?: string
}

export function TableWrapper({
  children,
  className,
  wrapperClassName,
  heightClassName,
  ...props
}: TableWrapperProps) {
  return (
    <div className={cn('border rounded-sm', className)} {...props}>
      <div className={cn('rounded-sm border-t-[.25rem] border-t-muted/60 max-sm:overflow-x-auto', wrapperClassName)}>
        <div className={cn('max-sm:w-fit max-sm:min-w-full] max-sm:max-h-[calc(100dvh-10rem)]', heightClassName)}>
          {children}
        </div>
      </div>
    </div>
  )
}
