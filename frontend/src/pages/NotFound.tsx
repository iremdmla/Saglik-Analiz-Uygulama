import { Button, Card } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../components/common";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <Card>
      <EmptyState title="Sayfa bulunamadı" description="Aradığınız sayfa taşınmış veya hiç var olmamış olabilir."
        action={<Button variant="contained" onClick={() => navigate("/")}>Ana sayfaya dön</Button>} />
    </Card>
  );
}
