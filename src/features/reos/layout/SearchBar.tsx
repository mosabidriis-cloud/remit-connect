import { useEffect, useState } from "react";
import Input from "../../../components/ui/Input";
import { colors, spacing, typography } from "../theme";
import { CommandPalette } from "./CommandPalette";
import { useReosSession } from "./reosAuthContext";

export function SearchBar() {
  const { session } = useReosSession();
  const [open, setOpen] = useState(false);

  // Global shortcut - Header (which always renders SearchBar) is only mounted inside the
  // authenticated /reos layout, so this never listens on /login.
  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <>
      <div className="hidden min-w-64 max-w-md flex-1 md:block">
        <label className="sr-only" htmlFor="reos-shell-search">
          Search REOS
        </label>
        <div className="relative">
          <Input
            aria-label="Search REOS"
            id="reos-shell-search"
            onClick={() => setOpen(true)}
            onFocus={() => setOpen(true)}
            placeholder="Search branches, batches, and pages..."
            readOnly
            style={{ cursor: "pointer", paddingRight: spacing.search }}
            type="search"
            value=""
          />
          <kbd
            className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500 lg:inline-flex"
            style={{
              backgroundColor: colors.slate50,
              border: `1px solid ${colors.border}`,
              color: colors.muted,
              fontSize: typography.caption,
              padding: `${spacing.xs}px ${spacing.sm}px`,
            }}
          >
            Ctrl+K
          </kbd>
        </div>
      </div>

      {session ? <CommandPalette onClose={() => setOpen(false)} open={open} session={session} /> : null}
    </>
  );
}
