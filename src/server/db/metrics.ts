export const METRICS = [
  { name: "temperature", unit: "°C",       base: 65,  variance: 15,  min: 40,  max: 90 },
  { name: "pressure",    unit: "PSI",      base: 120, variance: 25,  min: 80,  max: 160 },
  { name: "power",       unit: "kW",       base: 450, variance: 100, min: 200, max: 700 },
  { name: "output",      unit: "units/hr", base: 180, variance: 30,  min: 100, max: 250 },
  { name: "flow_rate",   unit: "L/min",    base: 75,  variance: 20,  min: 40,  max: 110 },
  { name: "humidity",    unit: "%",        base: 45,  variance: 10,  min: 30,  max: 60 },
] as const;

export type MetricName = (typeof METRICS)[number]["name"];

export const ASSET_METRICS: Record<string, MetricName[]> = {
  boiler: ["temperature", "pressure"],
  turbine: ["power", "temperature", "pressure"],
  pump: ["flow_rate", "power", "pressure"],
  motor: ["power", "temperature"],
  conveyor: ["power", "output"],
  sensor: ["temperature", "humidity", "pressure", "flow_rate"], 
};