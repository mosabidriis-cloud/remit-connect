import type { ChangeEvent } from "react";

type TextInputProps = {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
};

export default function TextInput({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: TextInputProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        marginBottom: 18,
      }}
    >
      <label
        style={{
          fontWeight: 600,
          color: "#334155",
          fontSize: 14,
        }}
      >
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        style={{
          padding: "12px 14px",
          border: "1px solid #CBD5E1",
          borderRadius: 8,
          fontSize: 14,
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}