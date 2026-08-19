import { forwardRef, type ChangeEvent, type ReactNode } from "react";

type TextInputProps = {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  name?: string;
  /** Optional leading glyph (e.g. a user/lock icon) rendered inside the field. */
  icon?: ReactNode;
};

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, value, placeholder, type = "text", onChange, autoComplete, name, icon },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5" style={{ marginBottom: 18 }}>
      <label className="text-sm font-semibold text-slate-700" htmlFor={name}>
        {label}
      </label>

      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            {icon}
          </span>
        ) : null}

        <input
          autoComplete={autoComplete}
          className={`w-full rounded-lg border border-slate-300 bg-white py-3 text-sm text-slate-900 outline-none transition duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-[#1E5AA8] focus:ring-4 focus:ring-[#1E5AA8]/10 ${
            icon ? "pl-10 pr-3.5" : "px-3.5"
          }`}
          id={name}
          name={name}
          ref={ref}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
        />
      </div>
    </div>
  );
});

export default TextInput;