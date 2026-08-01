import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
};

export function PageContainer({ children }: PageContainerProps) {
  return <section className="mx-auto grid w-full max-w-7xl gap-6">{children}</section>;
}
