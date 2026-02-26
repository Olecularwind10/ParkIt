/**
 * ParkIt — Firestore Database Seed Script
 *
 * Creates and populates collections:
 *   • parking_stations
 *   • parking_spots
 *   • bookings (empty, schema reference only)
 *
 * Run with:  node scripts/seedFirestore.js
 */

const admin = require("firebase-admin");
const serviceAccount = require("../parkit-e31d9-firebase-adminsdk-fbsvc-9844e93f56.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ─── Station Definitions ────────────────────────────────────────────────────

const STATIONS = [
    {
        id: "S1",
        name: "Station 1 — Central Hub",
        layout: "straight",
        description: "Main parking hub with straight rows. EV charging at the end of Row A.",
        total_spots: 390,
        car_zones: [
            { zone: "A", label: "Zone A — Hatchbacks (Floor 1)", rows: ["A1", "A2", "A3"], spots_per_row: 30, ev_rule: "last-2" },
            { zone: "B", label: "Zone B — Sedans (Floor 2)", rows: ["B1", "B2", "B3"], spots_per_row: 30, ev_rule: "none" },
            { zone: "C", label: "Zone C — SUVs (Floor 3)", rows: ["C1", "C2", "C3"], spots_per_row: 30, ev_rule: "none" },
        ],
        bike_rows: ["K1", "K2", "K3", "K4", "K5"],
        bikes_per_row: 20,
    },
    {
        id: "S2",
        name: "Station 2 — East Wing",
        layout: "angled",
        description: "East wing with angled parking bays. EV charging at the start of Row D.",
        total_spots: 460,
        car_zones: [
            { zone: "A", label: "Zone A — Hatchbacks (Floor 1)", rows: ["A1", "A2", "A3"], spots_per_row: 30, ev_rule: "none" },
            { zone: "B", label: "Zone B — Sedans (Floor 2)", rows: ["B1", "B2", "B3"], spots_per_row: 30, ev_rule: "none" },
            { zone: "C", label: "Zone C — SUVs (Floor 3)", rows: ["C1", "C2", "C3"], spots_per_row: 30, ev_rule: "none" },
            { zone: "D", label: "Zone D — Premium (Floor 4)", rows: ["D1", "D2", "D3"], spots_per_row: 30, ev_rule: "first-3" },
        ],
        bike_rows: ["K1", "K2", "K3", "K4", "K5"],
        bikes_per_row: 20,
    },
    {
        id: "S3",
        name: "Station 3 — Basement",
        layout: "basement",
        description: "Underground basement parking. EV charging centralized in Row C.",
        total_spots: 300,
        car_zones: [
            { zone: "A", label: "Zone A — Hatchbacks", rows: ["A1", "A2"], spots_per_row: 20, ev_rule: "none" },
            { zone: "B", label: "Zone B — Sedans", rows: ["B1", "B2"], spots_per_row: 20, ev_rule: "none" },
            { zone: "C", label: "Zone C — EV & SUVs", rows: ["C1", "C2"], spots_per_row: 20, ev_rule: "all" },
            { zone: "D", label: "Zone D — Premium", rows: ["D1", "D2"], spots_per_row: 20, ev_rule: "none" },
            { zone: "E", label: "Zone E — Compact", rows: ["E1", "E2"], spots_per_row: 20, ev_rule: "none" },
        ],
        bike_rows: ["K1", "K2", "K3", "K4", "K5"],
        bikes_per_row: 20,
    },
];

// ─── Helper: decide if a spot is EV ─────────────────────────────────────────

function isEVSpot(spotNumber, spotsPerRow, evRule) {
    if (evRule === "last-2") return spotNumber >= spotsPerRow - 1;
    if (evRule === "first-3") return spotNumber <= 3;
    if (evRule === "all") return true;
    return false;
}

// ─── Seed Logic ──────────────────────────────────────────────────────────────

async function seedStations() {
    console.log("\n📦 Seeding parking_stations...");
    for (const station of STATIONS) {
        const { id, car_zones, bike_rows, bikes_per_row, ...stationData } = station;
        await db.collection("parking_stations").doc(id).set({
            id,
            ...stationData,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`  ✓ ${id}: ${station.name}`);
    }
}

async function seedSpots() {
    console.log("\n🚗 Seeding parking_spots...");
    const batch_size = 400; // Firestore batch limit is 500
    let batch = db.batch();
    let count = 0;
    let totalCount = 0;

    async function commitIfFull() {
        if (count >= batch_size) {
            await batch.commit();
            console.log(`  … committed batch of ${count} spots`);
            batch = db.batch();
            count = 0;
        }
    }

    for (const station of STATIONS) {
        // Car zones
        for (const zone of station.car_zones) {
            for (const row of zone.rows) {
                for (let n = 1; n <= zone.spots_per_row; n++) {
                    const spotId = `${station.id}_${row}-${n}`;
                    const isEV = isEVSpot(n, zone.spots_per_row, zone.ev_rule);
                    // 70-80% available on startup (random 20-25% booked)
                    const randomBooked = Math.random() < 0.22;

                    const ref = db.collection("parking_spots").doc(spotId);
                    batch.set(ref, {
                        id: spotId,
                        station_id: station.id,
                        zone: zone.zone,
                        row_label: row,
                        spot_number: n,
                        is_ev: isEV,
                        status: randomBooked ? "booked" : "available", // 'available' | 'booked' | 'locked' | 'reserved'
                        locked_by: null,
                        locked_at: null,
                        created_at: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    count++;
                    totalCount++;
                    await commitIfFull();
                }
            }
        }

        // Bike zone (5 rows × 20 = 100 spots per station)
        for (const row of station.bike_rows) {
            for (let n = 1; n <= station.bikes_per_row; n++) {
                const spotId = `${station.id}_${row}-${n}`;
                const randomBooked = Math.random() < 0.22;

                const ref = db.collection("parking_spots").doc(spotId);
                batch.set(ref, {
                    id: spotId,
                    station_id: station.id,
                    zone: "BIKE",
                    row_label: row,
                    spot_number: n,
                    is_ev: false,
                    status: randomBooked ? "booked" : "available",
                    locked_by: null,
                    locked_at: null,
                    created_at: admin.firestore.FieldValue.serverTimestamp(),
                });
                count++;
                totalCount++;
                await commitIfFull();
            }
        }
    }

    // Commit any remaining
    if (count > 0) {
        await batch.commit();
        console.log(`  … committed final batch of ${count} spots`);
    }

    console.log(`  ✓ Total spots seeded: ${totalCount}`);
}

async function createBookingsSchema() {
    console.log("\n📋 Creating bookings collection (schema reference document)...");
    await db.collection("bookings").doc("_schema").set({
        _note: "Schema reference only — delete this document in production",
        id: "string — UUID booking ID",
        user_id: "string | null — user session ID",
        station_id: "string — S1 | S2 | S3",
        spot_id: "string — e.g. S1_A1-29",
        vehicle_number: "string",
        vehicle_category: "string — bike | car",
        car_type: "string | null — hatchback | sedan | suv",
        is_ev: "boolean",
        qr_code: "string — base64 PNG data URL",
        amount: "number — total payment in INR",
        duration_hours: "number",
        start_time: "timestamp",
        end_time: "timestamp",
        status: "string — active | expired | cancelled",
        created_at: "timestamp",
    });
    console.log("  ✓ bookings/_schema created");
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log("🔥 ParkIt — Firestore Seeder");
    console.log("   Project: parkit-e31d9");
    console.log("   Time:   ", new Date().toISOString());

    try {
        await seedStations();
        await seedSpots();
        await createBookingsSchema();

        console.log("\n✅ All done! Firestore is seeded.");
        console.log("\nCollections created:");
        console.log("  • parking_stations  (3 documents)");
        console.log("  • parking_spots     (~1,150 documents)");
        console.log("  • bookings          (schema reference)");
    } catch (err) {
        console.error("\n❌ Seed error:", err);
        process.exit(1);
    }

    process.exit(0);
}

main();
