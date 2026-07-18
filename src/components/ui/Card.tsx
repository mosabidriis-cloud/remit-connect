import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
};

export default function Card({ title, children }: CardProps) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        border: "1px solid #E5E7EB",
      }}
    >
      {title && (
        <h3
          style={{
            margin: 0,
            marginBottom: 20,
            color: "#123A73",
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          {title}
        </h3>
      )}

      {children}
    </div>
  );
}