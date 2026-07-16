import MainLayout from "../../layouts/MainLayout";
import PageContainer from "../../components/PageContainer";
import BranchStatusTable from "../../components/dashboard/BranchStatusTable";

export default function Dashboard() {
  return (
    <MainLayout>
      <PageContainer title="Operations Controller Dashboard">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <Card title="Files Ready" value="146" />
          <Card title="Available Liquidity" value="248,000,000 SDG" />
          <Card title="Available Accounts" value="17.62" />
          <Card title="Waiting Funding" value="3 Branches" />
        </div>

        <BranchStatusTable />
      </PageContainer>
    </MainLayout>
  );
}

type CardProps = {
  title: string;
  value: string;
};

function Card({ title, value }: CardProps) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          color: "#6B7280",
          marginBottom: 10,
          fontSize: 14,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: "bold",
          color: "#1E3A5F",
        }}
      >
        {value}
      </div>
    </div>
  );
}