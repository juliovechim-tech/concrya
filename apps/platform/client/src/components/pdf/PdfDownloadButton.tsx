import { PDFDownloadLink } from "@react-pdf/renderer";
import { PacketReport } from "./PacketReport";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import type { ConcretePacket } from "@concrya/schemas";

interface PdfDownloadButtonProps {
  packet: ConcretePacket;
  feature: string;
  calculationId: number;
  createdAt: string;
}

export default function PdfDownloadButton({ packet, feature, calculationId, createdAt }: PdfDownloadButtonProps) {
  return (
    <PDFDownloadLink
      document={
        <PacketReport
          packet={packet}
          feature={feature}
          calculationId={calculationId}
          createdAt={createdAt}
        />
      }
      fileName={`concrya-${feature}-${calculationId}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" className="rounded-none" disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <><FileText className="w-4 h-4 mr-1" /> PDF</>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
