import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({
  className,
  style,
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      className={`border border-[#CBD5E1] transition duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:border-[#CBD5E1] disabled:bg-slate-50 disabled:opacity-70 disabled:hover:border-[#CBD5E1] ${className ?? ""}`}
      style={{
        width: "100%",
        height: 42,
        padding: "0 12px",
        borderRadius: 8,
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box",
        ...style,
      }}
    />
  );
}