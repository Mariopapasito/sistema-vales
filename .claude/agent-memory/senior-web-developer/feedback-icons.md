---
name: No Emojis — Use Heroicons
description: All UI icons must use @heroicons/react/24/outline components; emojis are banned from JSX
type: feedback
---

Never use emoji characters (📋 🔴 ⚙️ etc.) in JSX markup. Always import and render the appropriate Heroicon component.

Render pattern: `<ClipboardDocumentListIcon style={{ width: 20, height: 20 }} />`

Common mappings used in this project:
- Clipboard/list → `ClipboardDocumentListIcon`
- Add/new → `PlusCircleIcon`
- Calendar → `CalendarDaysIcon`
- Users → `UsersIcon`
- Archive/box → `ArchiveBoxIcon`
- Settings/gear → `Cog6ToothIcon`
- Logout → `ArrowRightOnRectangleIcon`
- Logo/wrench → `WrenchScrewdriverIcon`
- Loading/spinner → `ArrowPathIcon`
- Error/x → `XCircleIcon`
- Success/check → `CheckCircleIcon`
- Camera → `CameraIcon`
- User profile → `UserCircleIcon`
- Edit → `PencilSquareIcon`
- Delete → `TrashIcon`
- Download → `ArrowDownTrayIcon`
- Map pin → `MapPinIcon`
- User add → `UserPlusIcon`
- Shopping → `ShoppingCartIcon`
- Clock → `ClockIcon`
- Close modal → `XMarkIcon`

**Why:** Design consistency; emoji rendering differs across OS/browser and doesn't match the glassmorphism aesthetic.
**How to apply:** On every new component or edit, replace any emoji in JSX with the appropriate Heroicon. Emojis inside `console.log()` / `alert()` strings are acceptable since they can't render icons.
