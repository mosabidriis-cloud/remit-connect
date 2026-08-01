import type { ReactNode } from "react";
import { spacing } from "../../theme";

type PageContainerProps = {
  children: ReactNode;
};

export function PageContainer({ children }: PageContainerProps) {
  return (
    <section className="w-full" style={{ display: "grid", gap: spacing.xl, margin: "0 auto", maxWidth: 1280, width: "100%" }}>
      {children}
    </section>
  );
}
