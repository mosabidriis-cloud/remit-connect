type BadgeProps = {
  text: string;
  color: "green" | "orange" | "red" | "blue" | "gray";
};

export default function Badge({
  text,
  color,
}: BadgeProps) {
  const colors = {
    green: "#16A34A",
    orange: "#F59E0B",
    red: "#DC2626",
    blue: "#2563EB",
    gray: "#64748B",
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 12px",
        borderRadius: 20,
        background: colors[color],
        color: "#FFFFFF",
        fontWeight: 600,
        fontSize: 13,
        textAlign: "center",
        minWidth: 110,
      }}
    >
      {text}
    </span>
  );
}