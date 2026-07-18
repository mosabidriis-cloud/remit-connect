import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({
  style,
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        height: 42,
        padding: "0 12px",
        border: "1px solid #CBD5E1",
        borderRadius: 8,
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box",
        ...style,
      }}
    />
  );
}