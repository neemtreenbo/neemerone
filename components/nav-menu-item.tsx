'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export interface NavMenuItem {
  label: string;
  href?: string;
  icon?: LucideIcon;
  children?: NavMenuItem[];
  external?: boolean;
}

interface NavMenuItemProps {
  item: NavMenuItem;
  onItemClick?: () => void;
  level?: number;
}

export function NavMenuItemComponent({
  item,
  onItemClick,
  level = 0
}: NavMenuItemProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = item.href ? pathname === item.href : false;
  const hasChildren = item.children && item.children.length > 0;

  // If item has children, render as submenu
  if (hasChildren) {
    return (
      <DropdownMenuSub open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuSubTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-default">
          <div className="flex items-center space-x-2">
            {item.icon && (
              <item.icon className="w-4 h-4 text-muted-foreground" />
            )}
            <span>{item.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
        </DropdownMenuSubTrigger>

        <DropdownMenuSubContent className="min-w-[200px]">
          {item.children?.map((child, index) => (
            <NavMenuItemComponent
              key={`${child.label}-${index}`}
              item={child}
              onItemClick={onItemClick}
              level={level + 1}
            />
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  }

  // If item has href, render as link
  if (item.href) {
    const content = (
      <div className="flex items-center space-x-2 w-full">
        {item.icon && (
          <item.icon className={cn(
            "w-4 h-4",
            isActive ? "text-blue-600" : "text-muted-foreground"
          )} />
        )}
        <span className={cn(
          "text-sm",
          isActive ? "text-blue-600 font-medium" : "text-foreground"
        )}>
          {item.label}
        </span>
      </div>
    );

    if (item.external) {
      return (
        <DropdownMenuItem asChild>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center px-2 py-1.5 rounded-sm cursor-pointer transition-colors",
              isActive && "bg-blue-50"
            )}
            onClick={onItemClick}
          >
            {content}
          </a>
        </DropdownMenuItem>
      );
    }

    return (
      <DropdownMenuItem asChild>
        <Link
          href={item.href}
          className={cn(
            "flex items-center px-2 py-1.5 rounded-sm cursor-pointer transition-colors",
            isActive && "bg-blue-50"
          )}
          onClick={onItemClick}
        >
          {content}
        </Link>
      </DropdownMenuItem>
    );
  }

  // Default menu item (no href, no children)
  return (
    <DropdownMenuItem
      className="flex items-center space-x-2 px-2 py-1.5 text-sm rounded-sm cursor-default"
      onClick={onItemClick}
    >
      {item.icon && (
        <item.icon className="w-4 h-4 text-muted-foreground" />
      )}
      <span>{item.label}</span>
    </DropdownMenuItem>
  );
}