import { useTheme } from '@/components/theme-provider'
import { ToolIcon } from '@/components/tool-icon'
import { cn } from '@/lib/utils'

import relationshipMapGlyph from '@/assets/brand/tools/relationship-map-glyph.svg'
import relationshipMapTileDark from '@/assets/brand/tools/relationship-map-tile-dark.svg'
import relationshipMapTileLight from '@/assets/brand/tools/relationship-map-tile-light.svg'
import taskBoardGlyph from '@/assets/brand/tools/task-board-glyph.svg'
import taskBoardTileDark from '@/assets/brand/tools/task-board-tile-dark.svg'
import taskBoardTileLight from '@/assets/brand/tools/task-board-tile-light.svg'
import whiteboardGlyph from '@/assets/brand/tools/whiteboard-glyph.svg'
import whiteboardTileDark from '@/assets/brand/tools/whiteboard-tile-dark.svg'
import whiteboardTileLight from '@/assets/brand/tools/whiteboard-tile-light.svg'

// The Loft tools have their own artwork. Other tools use the icon they chose.
const BRAND: Record<string, { glyph: string; tileLight: string; tileDark: string }> = {
  whiteboard: { glyph: whiteboardGlyph, tileLight: whiteboardTileLight, tileDark: whiteboardTileDark },
  tasks: { glyph: taskBoardGlyph, tileLight: taskBoardTileLight, tileDark: taskBoardTileDark },
  'relationship-map': {
    glyph: relationshipMapGlyph,
    tileLight: relationshipMapTileLight,
    tileDark: relationshipMapTileDark,
  },
}

// A one-colour glyph that takes the colour of the text around it, for sidebars, headers and menus.
export function ToolMark({ id, icon, className }: { id: string; icon: unknown; className?: string }) {
  const brand = BRAND[id]
  if (!brand) return <ToolIcon name={icon} className={className} />
  const mask = `url("${brand.glyph}")`
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-4 shrink-0 bg-current', className)}
      style={{
        maskImage: mask,
        WebkitMaskImage: mask,
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
      }}
    />
  )
}

// A rounded launcher tile for cards. Falls back to the gradient square with the chosen icon.
export function ToolTile({ id, icon, className }: { id: string; icon: unknown; className?: string }) {
  const { dark } = useTheme()
  const brand = BRAND[id]
  if (brand) {
    return <img src={dark ? brand.tileDark : brand.tileLight} alt="" className={cn('size-9 shrink-0 rounded-lg', className)} />
  }
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-a)] to-[var(--brand-b)] text-white',
        className,
      )}
    >
      <ToolIcon name={icon} className="size-4" />
    </span>
  )
}
