import { Link, NavLink } from '@remix-run/react'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { City } from '~/schemas/city'
import { CitySelect } from './CitySelect'
import { ModeToggle } from './ModeToggle'
import { QuizDashIcon } from './QuizDashIcon'
import { Button } from './ui/button'
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet'

export function Header({
  title,
  cities,
  currentCity,
  menu,
}: {
  title: string
  cities: City[]
  currentCity: City
  menu: { games: string; teams: string; compare: string }
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = [
    { label: menu.games, href: `/${currentCity?.slug ?? ''}/games`, end: true },
    { label: menu.teams, href: `/${currentCity?.slug ?? ''}/teams`, end: true },
    { label: menu.compare, href: `/${currentCity?.slug ?? ''}/teams/compare`, end: true },
  ]
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'text-sm transition-colors rounded-md px-3 py-2',
      isActive
        ? 'text-foreground font-semibold'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
    ].join(' ')

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-border">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-6">
        <div className="flex items-center gap-2">
          <Link to={`/${currentCity?.slug ?? ''}`} className="flex items-center space-x-2 lg:mr-6">
            <QuizDashIcon className="h-6 w-6" />
            <span className="font-bold">{title}</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-2 mx-6">
          {navItems.map((item) => (
            <NavLink key={item.href} to={item.href} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-full flex-1 md:w-auto md:flex-none max-w-[200px] sm:max-w-[240px]">
              <CitySelect cities={cities} currentCity={currentCity} />
            </div>
            <ModeToggle />
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 pt-10 pr-10">
              <div className="border-b pb-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <CitySelect cities={cities} currentCity={currentCity} />
                  </div>
                  <ModeToggle />
                </div>
              </div>
              <nav className="mt-4 flex flex-col gap-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.end}
                    className={navLinkClass}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
