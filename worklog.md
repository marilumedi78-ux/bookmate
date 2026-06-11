---
Task ID: 1
Agent: Main Agent
Task: Fix PDF upload false duplicate detection and make TTS controls sticky

Work Log:
- Analyzed the duplicate detection logic in `/api/books/upload/route.ts`
- Found that metadata-based check (title + author case-insensitive) caused false positives when different PDFs had empty/generic metadata (both getting "Desconocido" as author)
- Removed the metadata-based duplicate check, keeping only the precise SHA-256 hash-based detection
- Restructured the ReaderTab player bar to use `position: fixed` at the bottom of the viewport
- Player bar positioned at `bottom: 60px` (above the tab navigation bar)
- Added `max-w-2xl mx-auto` wrapper inside fixed player bar to match app width
- Moved selection actions (Subrayar/Explica) and highlights count into the fixed bottom section
- Added `pb-40` padding to the ScrollArea text content to prevent text from hiding behind the fixed player bar
- Changed `main` element to use `overflow-hidden` when reader tab is active (prevents double-scrolling)
- Added `h-full` to the motion.div wrapper and ReaderTab root when reader is active

Stage Summary:
- Upload route now only detects duplicates by file hash (SHA-256), no more false positives from metadata matching
- Player controls are now fixed at the bottom of the screen, always accessible without scrolling
- Both fixes verified: lint passes, dev server running, browser agent confirms fixed positioning works
