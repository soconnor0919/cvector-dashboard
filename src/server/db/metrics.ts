export const METRICS = [
  { name: "temperature", unit: "°C",       base: 65,  variance: 15 },
  { name: "pressure",    unit: "PSI",      base: 120, variance: 25 },
  { name: "power",       unit: "kW",       base: 450, variance: 100 },
  { name: "output",      unit: "units/hr", base: 180, variance: 30 },
  { name: "flow_rate",   unit: "L/min",    base: 75,  variance: 20 },
  { name: "humidity",    unit: "%",        base: 45,  variance: 10 },
] as const;

export type MetricName = (typeof METRICS)[number]["name"];

export const ASSET_METRICS: Record<string, MetricName[]> = {
  boiler: ["temperature", "pressure"],
  turbine: ["power", "temperature", "pressure"],
  pump: ["flow_rate", "power", "pressure"],
  motor: ["power", "temperature"],
  conveyor: ["power", "output"],
  sensor: ["temperature"], // Default for generic sensors
};