import { Link } from '@remix-run/react'
import { LayoutDashboard } from 'lucide-react'
import { CitySelect } from './CitySelect'
import { ModeToggle } from './ModeToggle'

export function Header({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-border">
      <div className="flex h-14 items-center px-6">
        <div className="mr-4 flex">
          <Link to="/" className="mr-4 flex items-center space-x-2 lg:mr-6">
            <LayoutDashboard className="h-6 w-6" />
            <span className="font-bold">{title}</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <CitySelect />
          </div>
          <nav className="flex items-center">
            <ModeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}
