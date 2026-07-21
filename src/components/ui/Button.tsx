type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
};

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
}: ButtonProps) {
  const background =
    variant === "primary"
      ? "#1E5AA8"
      : variant === "secondary"
      ? "#64748B"
      : "#DC2626";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background,
        color: "#FFFFFF",
        border: "none",
        borderRadius: 8,
        padding: "12px 20px",
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
        transition: "0.2s",
      }}
    >
      {children}
    </button>
  );
}
