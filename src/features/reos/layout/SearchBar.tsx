import Input from "../../../components/ui/Input";

export function SearchBar() {
  return (
    <div className="hidden min-w-64 max-w-md flex-1 md:block">
      <label className="sr-only" htmlFor="reos-shell-search">
        Search REOS
      </label>
      <Input
        aria-label="Search REOS"
        disabled
        id="reos-shell-search"
        placeholder="Search REOS"
        type="search"
      />
    </div>
  );
}
