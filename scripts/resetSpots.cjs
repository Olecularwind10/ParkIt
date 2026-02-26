/**
 * ParkIt — Reset All Spots to Available
 * Run: node scripts/resetSpots.cjs
 */

const admin = require('firebase-admin');
const serviceAccount = require('../parkit-e31d9-firebase-adminsdk-fbsvc-9844e93f56.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function resetAllSpots() {
    console.log('🔄 Resetting all parking spots to "available"...');
    const snap = await db.collection('parking_spots').get();
    const batch_size = 400;
    let batch = db.batch();
    let count = 0;
    let total = 0;

    for (const docSnap of snap.docs) {
        batch.update(docSnap.ref, {
            status: 'available',
            locked_by: null,
            locked_at: null,
        });
        count++;
        total++;
        if (count >= batch_size) {
            await batch.commit();
            console.log(`  … committed ${count} updates`);
            batch = db.batch();
            count = 0;
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`  … committed final ${count} updates`);
    }

    console.log(`\n✅ Done! ${total} spots reset to "available".`);
    process.exit(0);
}

resetAllSpots().catch(console.error);
