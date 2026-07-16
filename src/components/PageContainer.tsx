type PageContainerProps = {
  title: string;
  children: React.ReactNode;
};

export default function PageContainer({
  title,
  children,
}: PageContainerProps) {
  return (
    <main
      style={{
        flex: 1,
        padding: "32px",
        background: "#F5F7FA",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          margin: 0,
          marginBottom: "24px",
          color: "#1E3A5F",
          fontSize: "28px",
          fontWeight: 700,
        }}
      >
        {title}
      </h1>

      {children}
    </main>
  );
}