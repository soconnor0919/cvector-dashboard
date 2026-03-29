import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { assets, facilities, sensorReadings } from "./schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

export const METRICS = [
    { name: "temperature", unit: "°C", base: 65, variance: 15 },
    { name: "pressure", unit: "PSI", base: 120, variance: 25 },
    { name: "power", unit: "kW", base: 450, variance: 100 },
    { name: "output", unit: "units/hr", base: 180, variance: 30 },
    { name: "flow_rate", unit: "L/min", base: 75, variance: 20 },
    { name: "humidity", unit: "%", base: 45, variance: 10 },
];

const STATUSES = ["online", "offline", "warning", "error"];

const facilityData = [
    { name: "North Power Station", location: "Chicago, IL", description: "Coal-fired power generation" },
    { name: "South Chemical Plant", location: "Houston, TX", description: "Chemical processing and refining" },
    { name: "East Manufacturing", location: "Detroit, MI", description: "Automotive parts manufacturing" },
];

const assetTemplates = [
    { type: "boiler", names: ["Boiler A", "Boiler B", "Boiler C"] },
    { type: "turbine", names: ["Turbine 1", "Turbine 2"] },
    { type: "pump", names: ["Main Pump", "Coolant Pump", "Fuel Pump"] },
    { type: "motor", names: ["Motor M1", "Motor M2", "Motor M3", "Motor M4"] },
    { type: "conveyor", names: ["Conveyor 1", "Conveyor 2"] },
    { type: "sensor", names: ["Temp Sensor A", "Pressure Sensor B", "Flow Sensor C"] },
];

// a seed async function to populate the database with realistic sample data for testing and development
async function seed() {
    console.log("Seeding database with sample data...");

    // Clear existing data
    await db.delete(sensorReadings).execute();
    await db.delete(assets).execute();
    await db.delete(facilities).execute();
    console.log("Cleared existing data.");

    // insert facilities, get back row with returning
    const facilityIds = [];
    for (const facility of facilityData) {
        const [inserted] = await db.insert(facilities).values(facility)
            .returning({ id: facilities.id, name: facilities.name })
            .execute();
        facilityIds.push(inserted);
    }
    console.log(`Inserted ${facilityIds.length} facilities.`);

    // insert assets for each facility
    const insertedAssets = [];
    for (const facility of facilityIds) {
        const prefix = facility.name.split(" ")[0]; // e.g. "North", "South", "East"
        for (const template of assetTemplates) {
            for (const name of template.names) {
                const [inserted] = await db.insert(assets).values({
                    facilityId: facility.id,
                    name: `${prefix} ${name}`,
                    type: template.type,
                    status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
                }).returning().execute();
                insertedAssets.push(inserted);
            }
        }
    }
    console.log(`Inserted ${insertedAssets.length} assets.`);

    const now = new Date();
    const readings: (typeof sensorReadings.$inferInsert)[] = [];
        

    for (const asset of insertedAssets) {
        const metric = METRICS[asset.id % METRICS.length]!; // assign metric based on asset id for variety

        for (let i = 0; i < 256; i++) { // generate 256 readings per asset
            const timestamp = new Date(now.getTime() - (256 - i) * 5 * 60 * 1000); // 5 minute intervals over past 24 hours
            const variation = (Math.random() - 0.5) * 2 * metric.variance; // random variation within ±variance
            const trend = Math.sin(i / 48) * (metric.variance * 0.3); // add a sinusoidal trend to simulate daily patterns
            const value = Math.max(0, metric.base + variation + trend); // ensure value is non-negative

            readings.push({
                assetId: asset.id,
                metricName: metric.name,
                value: parseFloat(value.toFixed(2)), // round to 2 decimal places
                unit: metric.unit,
                timestamp,
            });
        }
    }
    console.log(`Generated ${readings.length} sensor readings.`);

    // Insert in batches of 256 (per asset)
    for (let i = 0; i < readings.length; i += 256) {
    await db.insert(sensorReadings)
        .values(readings.slice(i, i + 256))
        .onConflictDoNothing()
        .execute();
    }
    console.log("Inserted sensor readings.");
    console.log("Database seeding complete!");
}

seed().catch((error) => {
    console.error("Error seeding database:", error);
}).finally(() => {
    client.end();
});