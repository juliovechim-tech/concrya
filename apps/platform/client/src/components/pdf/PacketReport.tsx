import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ConcretePacket } from "@concrya/schemas";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { marginBottom: 20, borderBottom: "2px solid #f97316", paddingBottom: 12 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 2 },
  subtitle: { fontSize: 10, color: "#666", marginTop: 4 },
  meta: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  metaText: { fontSize: 8, color: "#888" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, color: "#f97316", borderBottom: "1px solid #e5e5e5", paddingBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottom: "0.5px solid #f0f0f0" },
  label: { color: "#666", width: "50%" },
  value: { fontFamily: "Helvetica-Bold", textAlign: "right", width: "50%" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, fontSize: 9, fontFamily: "Helvetica-Bold" },
  badgeOk: { backgroundColor: "#dcfce7", color: "#166534" },
  badgeRisco: { backgroundColor: "#fef9c3", color: "#854d0e" },
  badgeCritico: { backgroundColor: "#fecaca", color: "#991b1b" },
  listItem: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 10, color: "#f97316" },
  driftBadge: { backgroundColor: "#fed7aa", color: "#9a3412", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, fontSize: 9, fontFamily: "Helvetica-Bold" },
  scoreBox: { alignItems: "center", marginVertical: 10 },
  scoreValue: { fontSize: 36, fontFamily: "Helvetica-Bold" },
  scoreLabel: { fontSize: 9, color: "#666", marginTop: 2 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, borderTop: "1px solid #e5e5e5", paddingTop: 8 },
  footerText: { fontSize: 7, color: "#999", textAlign: "center" },
});

function getStatusBadgeStyle(status: string) {
  if (status === "OK") return styles.badgeOk;
  if (status === "RISCO") return styles.badgeRisco;
  return styles.badgeCritico;
}

function featureLabel(feature: string): string {
  if (feature === "compensa") return "COMPENSA CORE";
  if (feature === "nivelix") return "NIVELIX CORE";
  if (feature === "ecorisk") return "ECORISK";
  return feature.toUpperCase();
}

interface PacketReportProps {
  packet: ConcretePacket;
  feature: string;
  calculationId: number;
  createdAt: string;
}

export function PacketReport({ packet, feature, calculationId, createdAt }: PacketReportProps) {
  const date = new Date(createdAt);
  const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>CONCRYA Technologies</Text>
          <Text style={styles.subtitle}>Relatorio de Dosagem — {featureLabel(feature)}</Text>
          <View style={styles.meta}>
            <Text style={styles.metaText}>ID: #{calculationId}</Text>
            <Text style={styles.metaText}>{dateStr}</Text>
          </View>
        </View>

        {/* SEÇÃO 1 — TRAÇO BASE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Traco Base</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Tipo de Cimento</Text>
            <Text style={styles.value}>{packet.mix.cimentoType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>fck alvo</Text>
            <Text style={styles.value}>{packet.mix.fck} MPa</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>a/c</Text>
            <Text style={styles.value}>{packet.mix.ac}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Slump</Text>
            <Text style={styles.value}>{packet.mix.slump} mm</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cimento</Text>
            <Text style={styles.value}>{packet.mix.consumoCimento} kg/m3</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Agua</Text>
            <Text style={styles.value}>{packet.mix.consumoAgua} L/m3</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Areia</Text>
            <Text style={styles.value}>{packet.mix.consumoAreia} kg/m3</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Brita</Text>
            <Text style={styles.value}>{packet.mix.consumoBrita} kg/m3</Text>
          </View>
        </View>

        {/* SEÇÃO 2 — RESULTADO PRINCIPAL */}
        {feature === "compensa" && packet.compensa && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>COMPENSA — Retracao Compensada</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Expansao Esperada</Text>
              <Text style={styles.value}>{packet.compensa.expansaoEsperada} ue</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Retracao Estimada</Text>
              <Text style={styles.value}>{packet.compensa.retracaoEstimada} ue</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Balanco CRC</Text>
              <Text style={styles.value}>{packet.compensa.balancoCRC > 0 ? "+" : ""}{packet.compensa.balancoCRC} ue</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Agente Expansivo</Text>
              <Text style={styles.value}>{packet.compensa.agenteExpansivo}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Teor AE</Text>
              <Text style={styles.value}>{packet.compensa.teorAgente} kg/m3</Text>
            </View>
            <View style={{ ...styles.row, alignItems: "center" }}>
              <Text style={styles.label}>Status</Text>
              <Text style={{ ...styles.badge, ...getStatusBadgeStyle(packet.compensa.status) }}>{packet.compensa.status}</Text>
            </View>
          </View>
        )}

        {feature === "nivelix" && packet.nivelix && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NIVELIX — Autonivelante</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Espalhamento</Text>
              <Text style={styles.value}>{packet.nivelix.espalhamento} mm</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tensao de Escoamento</Text>
              <Text style={styles.value}>{packet.nivelix.tensaoEscoamento} Pa</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Viscosidade Plastica</Text>
              <Text style={styles.value}>{packet.nivelix.viscosidadePlastica} Pa.s</Text>
            </View>
            {packet.nivelix.moduloAcustico !== undefined && (
              <View style={styles.row}>
                <Text style={styles.label}>Modulo Acustico</Text>
                <Text style={styles.value}>{packet.nivelix.moduloAcustico} dB</Text>
              </View>
            )}
            <View style={{ ...styles.row, alignItems: "center" }}>
              <Text style={styles.label}>Status</Text>
              <Text style={{ ...styles.badge, ...getStatusBadgeStyle(packet.nivelix.status) }}>{packet.nivelix.status}</Text>
            </View>
          </View>
        )}

        {feature === "ecorisk" && packet.ecorisk && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ECORISK — Score Dw</Text>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreValue}>{packet.ecorisk.score}</Text>
              <Text style={styles.scoreLabel}>/ 100 — {packet.ecorisk.nivel}</Text>
            </View>
            {packet.ecorisk.fatores.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ ...styles.label, fontFamily: "Helvetica-Bold", marginBottom: 4 }}>Fatores de Risco:</Text>
                {packet.ecorisk.fatores.map((f, i) => (
                  <View key={i} style={styles.listItem}>
                    <Text style={styles.bullet}>*</Text>
                    <Text>{f}</Text>
                  </View>
                ))}
              </View>
            )}
            {packet.ecorisk.recomendacoes.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ ...styles.label, fontFamily: "Helvetica-Bold", marginBottom: 4 }}>Recomendacoes:</Text>
                {packet.ecorisk.recomendacoes.map((r, i) => (
                  <View key={i} style={styles.listItem}>
                    <Text style={styles.bullet}>*</Text>
                    <Text>{r}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* SEÇÃO 3 — PREDIÇÃO AION */}
        {packet.aion && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AION — Predicao de Resistencia</Text>
            <View style={styles.row}>
              <Text style={styles.label}>fc predito (28d)</Text>
              <Text style={styles.value}>{packet.aion.fcPredito} MPa</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>fck alvo</Text>
              <Text style={styles.value}>{packet.mix.fck} MPa</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Confianca</Text>
              <Text style={styles.value}>{Math.round(packet.aion.confianca * 100)}%</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Modelo</Text>
              <Text style={styles.value}>{packet.aion.modelo}</Text>
            </View>
            {packet.aion.drift && (
              <View style={{ ...styles.row, alignItems: "center" }}>
                <Text style={styles.label}>Alerta</Text>
                <Text style={styles.driftBadge}>DRIFT DETECTADO</Text>
              </View>
            )}
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Gerado por CONCRYA Technologies — concrya.com.br</Text>
          <Text style={styles.footerText}>Documento de uso tecnico. Verificar com ensaios em campo.</Text>
          <Text style={styles.footerText}>Calculo #{calculationId}</Text>
        </View>
      </Page>
    </Document>
  );
}
