import Input from "../../../components/ui/Input";
import { colors, spacing, typography } from "../theme";

export function SearchBar() {
  return (
    <div className="hidden min-w-64 max-w-md flex-1 md:block">
      <label className="sr-only" htmlFor="reos-shell-search">
        Search REOS
      </label>
      <div className="relative">
        <Input
          aria-label="Search REOS"
          disabled
          id="reos-shell-search"
          placeholder="Search REOS"
          type="search"
          style={{ paddingRight: spacing.search }}
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
  );
}
