"use client";

import { Tooltip, Typography } from "antd";

export interface BarChartDatum {
  key: string;
  label: string;
  value: number;
  tooltip?: string;
}

interface BarChartProps {
  data: BarChartDatum[];
  valueFormatter?: (value: number) => string;
  emptyLabel?: string;
}

// Barres horizontales à teinte unique (comparaison de grandeur entre
// catégories, pas d'identité à distinguer ni de dimension temporelle — donc
// pas de courbe ni de couleurs catégorielles, une seule série = pas de légende).
// Suit le guide dataviz : extrémité arrondie côté donnée, carrée à la ligne de
// base, valeur toujours affichée en dehors de la barre (jamais tronquée), le
// texte reste dans les tons neutres, jamais dans la couleur de la donnée.
export default function BarChart({ data, valueFormatter = (v) => String(v), emptyLabel = "Aucune donnée" }: BarChartProps) {
  if (data.length === 0) {
    return <Typography.Text type="secondary">{emptyLabel}</Typography.Text>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => {
        const pct = max > 0 ? Math.round((d.value / max) * 100) : 0;
        return (
          <Tooltip key={d.key} title={d.tooltip ?? `${d.label} : ${valueFormatter(d.value)}`}>
            <div className="flex items-center gap-2 cursor-default">
              <span className="text-xs text-gray-600 w-36 shrink-0 truncate">{d.label}</span>
              <div className="flex-1 h-4 bg-gray-100 rounded-r-sm overflow-hidden">
                <div
                  className="h-full rounded-r-sm transition-all"
                  style={{ width: `${pct}%`, backgroundColor: "#2a78d6" }}
                />
              </div>
              <span className="text-xs text-gray-500 w-14 text-right tabular-nums shrink-0">
                {valueFormatter(d.value)}
              </span>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}
