import { EllipsisVertical, LogOut, Settings, User } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UserNavProps extends React.HTMLAttributes<HTMLDivElement> {
  username?: string
  userEmail?: string
}

export function UserNav({ username = 'John Doe', userEmail = 'john.doe@example.com', className, ...props }: UserNavProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  return (
    <div className={cn('relative', className)} ref={dropdownRef} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} {...props}>
      <Button variant="ghost" className="flex items-center gap-2 h-10 px-3 group">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            <div className="text-sm font-medium">{username.charAt(0)}</div>
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium">{username}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>
        <EllipsisVertical className="size-4 text-muted-foreground transition-transform group-hover:opacity-100 opacity-0" />
      </Button>

      {isHovered && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover border border-border z-10">
          <div className="py-1 px-2">
            <div className="px-2 py-2 md:hidden">
              <p className="text-sm font-medium">{username}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <div className="mt-1 md:mt-0">
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link to="/profile">
                  <User className="size-4 mr-2" />
                  Profile
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link to="/settings">
                  <Settings className="size-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive">
                <LogOut className="size-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
