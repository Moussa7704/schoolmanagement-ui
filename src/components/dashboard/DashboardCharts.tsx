"use client";

// Graphiques du tableau de bord (G2 via @ant-design/plots). Ce module touche
// au canvas dès l'import : la page le charge avec next/dynamic({ ssr: false }).
//
// Couleurs (guide dataviz) : une seule série = une seule teinte (bleu) ;
// identité (garçons/filles) = teintes catégorielles fixes ; les couleurs de
// statut (vert/jaune/rouge) sont réservées à ce qui est réellement bon ou
// mauvais (échéances, recouvrement) et toujours accompagnées d'un libellé.
import { Area, Bar, Column, Gauge, Line, Pie } from "@ant-design/plots";
import { Typography } from "antd";
import type { GenderBreakdown, MonthlyPoint, TuitionSummary } from "@/types/models";

const SERIES = "#2a78d6";
const SERIES_2 = "#eb6834";
const NEUTRAL = "#c3c2b7";
const STATUS = { good: "#0ca30c", warning: "#fab219", critical: "#d03b3b" };
const INK_MUTED = "#898781";
const GRID = "#e1e0d9";
const BASELINE = "#c3c2b7";
const SURFACE = "#ffffff";
const NO_ANIMATION: Record<string, unknown> = { animate: false };

const formatAmount = (v: number) => `${v.toLocaleString("fr-FR")} CFA`;
// Graduations compactes pour l'axe des montants (1,2 M plutôt que 1 200 000).
const formatCompact = (v: number) =>
  new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(v);

// "2026-09" -> "sept. 26"
const formatMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
};

// Axes discrets : ligne de base fine, pas de quadrillage vertical ; quadrillage
// horizontal en trait plein très clair (jamais en pointillés).
const AXIS = {
  x: { title: false, line: true, lineStroke: BASELINE, tick: false, labelFill: INK_MUTED, labelAutoRotate: false, labelAutoHide: true },
  y: { title: false, grid: true, gridStroke: GRID, gridStrokeOpacity: 1, gridLineDash: [0, 0], labelFill: INK_MUTED },
};

function Empty({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center" style={{ height: 180 }}>
      <Typography.Text type="secondary">{label}</Typography.Text>
    </div>
  );
}

/* ---------- Évolution dans le temps ---------- */

export function EnrollmentsLineChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <Empty label="Aucune inscription sur l'année en cours" />;
  }
  const rows = data.map((d) => ({ label: formatMonth(d.month), value: d.value }));

  return (
    <Line
      data={rows}
      xField="label"
      yField="value"
      height={240}
      paddingRight={24}
      autoFit
      animate={false}
      axis={AXIS}
      scale={{ y: { nice: true, domainMin: 0 } }}
      style={{ stroke: SERIES, lineWidth: 2 }}
      point={{ style: { fill: SERIES, stroke: SURFACE, lineWidth: 2, r: 4 } }}
      tooltip={{ items: [{ channel: "y", name: "Inscriptions" }] }}
    />
  );
}

export function PaymentsAreaChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <Empty label="Aucun paiement encaissé sur l'année en cours" />;
  }
  const rows = data.map((d) => ({ label: formatMonth(d.month), value: d.value }));

  return (
    <Area
      data={rows}
      xField="label"
      yField="value"
      height={240}
      paddingRight={24}
      autoFit
      // AreaConfig ne déclare pas `animate` (pourtant transmis à G2 comme pour les autres).
      {...NO_ANIMATION}
      axis={{ ...AXIS, y: { ...AXIS.y, labelFormatter: formatCompact } }}
      scale={{ y: { nice: true, domainMin: 0 } }}
      style={{ fill: `linear-gradient(-90deg, ${SURFACE} 0%, ${SERIES} 100%)`, fillOpacity: 0.35 }}
      line={{ style: { stroke: SERIES, lineWidth: 2 } }}
      tooltip={{ items: [{ channel: "y", name: "Encaissé", valueFormatter: (v: number) => formatAmount(v) }] }}
    />
  );
}

/* ---------- Progression vers un objectif ---------- */

// Seuils de la jauge : < 50 % critique, 50–80 % à surveiller, ≥ 80 % bon.
export function RecoveryGauge({ tuition }: { tuition: TuitionSummary }) {
  if (tuition.recovery_rate === null) {
    return <Empty label="Aucune échéance pour l'année en cours" />;
  }
  const percent = Math.round(tuition.recovery_rate * 1000) / 10;

  return (
    <div>
      <Gauge
        data={{ target: percent, total: 100, name: "Recouvrement", thresholds: [50, 80, 100] }}
        height={200}
        autoFit
        animate={false}
        legend={false}
        scale={{ color: { range: [STATUS.critical, STATUS.warning, STATUS.good] } }}
        style={{ textContent: () => "" }}
      />
      <div className="text-center text-2xl font-semibold" style={{ color: "#0b0b0b", marginTop: -8 }}>
        {percent.toLocaleString("fr-FR")} %
      </div>
      <Typography.Text type="secondary" className="block text-center text-xs">
        {formatAmount(tuition.total_paid)} encaissés sur {formatAmount(tuition.total_due)} dus
      </Typography.Text>
    </div>
  );
}

/* ---------- Répartitions (parts d'un total) ---------- */

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

function Donut({ slices, centerLabel, emptyLabel }: { slices: DonutSlice[]; centerLabel: string; emptyLabel: string }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return <Empty label={emptyLabel} />;
  }
  // Les parts vides restent dans la légende (le lecteur voit « 0 en retard »),
  // mais pas dans l'anneau.
  const visible = slices.filter((s) => s.value > 0);

  return (
    <div>
      <div className="relative">
        <Pie
          data={visible}
          angleField="value"
          colorField="label"
          height={200}
          autoFit
          animate={false}
          innerRadius={0.64}
          legend={false}
          scale={{ color: { domain: slices.map((s) => s.label), range: slices.map((s) => s.color) } }}
          // Anneau séparé par un liseré de la couleur du fond (pas de bordure).
          style={{ stroke: SURFACE, lineWidth: 2 }}
          tooltip={{
            items: [
              {
                field: "value",
                name: "Nombre",
                valueFormatter: (v: number) => `${v} (${Math.round((v / total) * 100)} %)`,
              },
            ],
          }}
        />
        {/* Total au centre de l'anneau, en HTML : ne gêne pas le survol. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold" style={{ color: "#0b0b0b" }}>{total}</span>
          <span className="text-xs" style={{ color: "#52514e" }}>{centerLabel}</span>
        </div>
      </div>
      {/* Légende avec les valeurs : l'identité ne repose jamais sur la couleur seule. */}
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {slices.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#52514e" }}>
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
            <span style={{ color: "#0b0b0b" }} className="font-medium">
              {s.value}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function PaymentStatusDonut({ tuition }: { tuition: TuitionSummary }) {
  return (
    <Donut
      centerLabel="échéances"
      emptyLabel="Aucune échéance pour l'année en cours"
      slices={[
        { label: "Réglées", value: tuition.paid_count, color: STATUS.good },
        { label: "Partielles", value: tuition.partial_count, color: STATUS.warning },
        // Pas encore échue : ni bonne ni mauvaise nouvelle, donc neutre.
        { label: "En attente", value: tuition.pending_count, color: NEUTRAL },
        { label: "En retard", value: tuition.overdue_count, color: STATUS.critical },
      ]}
    />
  );
}

export function GenderDonut({ gender }: { gender: GenderBreakdown }) {
  const slices: DonutSlice[] = [
    { label: "Garçons", value: gender.boys_count, color: SERIES },
    { label: "Filles", value: gender.girls_count, color: SERIES_2 },
  ];
  // « Non renseigné » n'apparaît que s'il existe : c'est un reste, pas une catégorie.
  if (gender.unknown_count > 0) {
    slices.push({ label: "Non renseigné", value: gender.unknown_count, color: NEUTRAL });
  }
  return <Donut centerLabel="élèves" emptyLabel="Aucun élève inscrit" slices={slices} />;
}

/* ---------- Comparaisons entre catégories ---------- */

export interface CategoryDatum {
  label: string;
  value: number;
}

export function CategoryColumnChart({
  data,
  seriesName,
  emptyLabel,
}: {
  data: CategoryDatum[];
  seriesName: string;
  emptyLabel: string;
}) {
  if (data.length === 0) {
    return <Empty label={emptyLabel} />;
  }
  return (
    <Column
      data={data}
      xField="label"
      yField="value"
      height={240}
      paddingRight={24}
      autoFit
      animate={false}
      axis={AXIS}
      scale={{ y: { nice: true, domainMin: 0 } }}
      style={{ fill: SERIES, maxWidth: 48, radiusTopLeft: 4, radiusTopRight: 4 }}
      label={{ text: "value", position: "top", textBaseline: "bottom", dy: -4, fill: "#52514e", fontSize: 12 }}
      tooltip={{ items: [{ channel: "y", name: seriesName }] }}
    />
  );
}

// Taux de présence (0–1) en barres horizontales, de la plus faible à la plus
// forte : les classes (ou écoles) en difficulté apparaissent en premier.
export function AttendanceBarChart({
  data,
  emptyLabel,
}: {
  data: { label: string; rate: number | null }[];
  emptyLabel: string;
}) {
  const rows = data
    .filter((d): d is { label: string; rate: number } => d.rate !== null)
    .map((d) => ({ label: d.label, value: Math.round(d.rate * 100) }))
    .sort((a, b) => a.value - b.value);

  if (rows.length === 0) {
    return <Empty label={emptyLabel} />;
  }

  return (
    <Bar
      data={rows}
      xField="label"
      yField="value"
      height={Math.max(160, rows.length * 32 + 48)}
      autoFit
      animate={false}
      // Pas d'axe des valeurs : chaque barre porte son pourcentage.
      axis={{ x: { title: false, line: true, lineStroke: BASELINE, tick: false, labelFill: "#52514e" }, y: false }}
      // Marge au-delà de 100 % pour que l'étiquette de la plus longue barre tienne.
      scale={{ y: { domain: [0, 112] } }}
      style={{ fill: SERIES, maxWidth: 20, radiusTopLeft: 4, radiusTopRight: 4 }}
      label={{ text: (d: { value: number }) => `${d.value} %`, position: "right", textAlign: "start", dx: 6, fill: "#52514e", fontSize: 12 }}
      tooltip={{ items: [{ channel: "y", name: "Présence", valueFormatter: (v: number) => `${v} %` }] }}
    />
  );
}
