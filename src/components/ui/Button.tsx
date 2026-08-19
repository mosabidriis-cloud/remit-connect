type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  fullWidth?: boolean;
};

// "secondary" is deliberately outlined rather than a second solid fill - two solid,
// similarly-saturated buttons read as equally important side by side, which defeats the
// point of a primary/secondary distinction.
const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "border border-transparent bg-[#1E5AA8] text-white shadow-sm hover:bg-[#184A8C] focus-visible:ring-[#1E5AA8]/30",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400/30",
  danger: "border border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500/30",
};

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  return (
    <button
      className={`rounded-lg text-sm font-semibold transition duration-150 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-65 ${
        variantClasses[variant]
      } ${fullWidth ? "w-full" : ""}`}
      disabled={disabled}
      onClick={onClick}
      style={{ padding: "12px 20px" }}
      type={type}
    >
      {children}
    </button>
  );
}
