import { AppLayout } from "../layout/AppLayout";

type ReosLayoutProps = {
  children?: React.ReactNode;
};

export function ReosLayout({ children }: ReosLayoutProps) {
  return <AppLayout>{children}</AppLayout>;
}
