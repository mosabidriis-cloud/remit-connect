type KPICardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  accentColor: string;
};

export default function KPICard({
  title,
  value,
  subtitle,
  accentColor,
}: KPICardProps) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "16px",
        padding: "24px",
        borderTop: `5px solid ${accentColor}`,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <span
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "#6B7280",
        }}
      >
        {title}
      </span>

      <span
        style={{
          fontSize: "32px",
          fontWeight: 700,
          color: "#1F2937",
        }}
      >
        {value}
      </span>

      {subtitle && (
        <span
          style={{
            fontSize: "13px",
            color: "#9CA3AF",
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}