type ReosLayoutProps = {
  children?: React.ReactNode;
};

export function ReosLayout({ children }: ReosLayoutProps) {
  return <main>{children}</main>;
}
