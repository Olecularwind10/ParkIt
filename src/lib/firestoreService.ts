/**
 * ParkIt — Firestore Service Layer
 *
 * All reads and writes to Firestore go through here.
 * The Zustand store calls these functions.
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    runTransaction,
    serverTimestamp,
    onSnapshot,
    type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ParkingSpot, SpotStatus, Booking, StationId } from '../store/useParkingStore';

// ─── Spots ───────────────────────────────────────────────────────────────────

/**
 * Fetch all parking spots for a given station from Firestore.
 */
export async function fetchSpotsByStation(stationId: StationId): Promise<ParkingSpot[]> {
    const q = query(
        collection(db, 'parking_spots'),
        where('station_id', '==', stationId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => firestoreDocToSpot(d.data()));
}

/**
 * Subscribe to real-time spot updates for a station.
 * Returns an unsubscribe function.
 */
export function subscribeToSpots(
    stationId: StationId,
    onChange: (spots: ParkingSpot[]) => void
): Unsubscribe {
    const q = query(
        collection(db, 'parking_spots'),
        where('station_id', '==', stationId)
    );
    return onSnapshot(q, (snap) => {
        const spots = snap.docs.map((d) => firestoreDocToSpot(d.data()));
        onChange(spots);
    });
}

/**
 * Atomically lock a spot (optimistic concurrency).
 * Returns true if locked successfully, false if already taken.
 */
export async function lockSpotInFirestore(
    spotId: string,
    sessionId: string
): Promise<boolean> {
    const spotRef = doc(db, 'parking_spots', spotId);
    try {
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(spotRef);
            if (!snap.exists()) throw new Error('Spot not found');
            const data = snap.data();
            if (data.status !== 'available') {
                throw new Error('Spot already taken');
            }
            tx.update(spotRef, {
                status: 'locked',
                locked_by: sessionId,
                locked_at: serverTimestamp(),
            });
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Mark a spot as booked (called after payment confirmation).
 */
export async function markSpotBooked(spotId: string): Promise<void> {
    await updateDoc(doc(db, 'parking_spots', spotId), {
        status: 'booked',
        locked_by: null,
        locked_at: null,
    });
}

/**
 * Release a locked spot back to available (e.g. on timeout or cancel).
 */
export async function releaseSpot(spotId: string): Promise<void> {
    await updateDoc(doc(db, 'parking_spots', spotId), {
        status: 'available',
        locked_by: null,
        locked_at: null,
    });
}

// ─── Bookings ────────────────────────────────────────────────────────────────

/**
 * Write a completed booking to Firestore.
 */
export async function saveBookingToFirestore(booking: Booking): Promise<void> {
    const startTime = new Date(booking.timestamp);
    const endTime = new Date(booking.timestamp + booking.duration * 60 * 60 * 1000);

    await setDoc(doc(db, 'bookings', booking.id), {
        id: booking.id,
        user_id: null,                      // extend with auth later
        station_id: booking.stationId,
        spot_id: booking.spot.id,
        vehicle_number: booking.vehicleNumber,
        phone_number: booking.phoneNumber,
        vehicle_category: booking.vehicleCategory,
        car_type: booking.carType ?? null,
        is_ev: booking.isEV,
        qr_code: booking.qrCode ?? null,
        amount: booking.amount,
        duration_hours: booking.duration,
        start_time: startTime,
        end_time: endTime,
        status: 'active',
        created_at: serverTimestamp(),
    });
}

// ─── Verification (Gate Scanner) ─────────────────────────────────────────────

export interface VerificationResult {
    valid: boolean;
    reason?: string;
    booking?: {
        id: string;
        spotId: string;
        stationId: string;
        vehicleNumber: string;
        phoneNumber: string;
        vehicleCategory: string;
        isEV: boolean;
        startTime: Date;
        endTime: Date;
        status: string;
        amount: number;
    };
}

/**
 * Gate verification — looks up a booking by ID and validates it.
 * Called when QR is scanned at entry.
 */
export async function getBookingById(bookingId: string): Promise<VerificationResult> {
    try {
        const snap = await getDoc(doc(db, 'bookings', bookingId));

        if (!snap.exists()) {
            return { valid: false, reason: 'Booking not found in database.' };
        }

        const data = snap.data();
        const now = new Date();
        const endTime = data.end_time?.toDate?.() ?? new Date(0);
        const startTime = data.start_time?.toDate?.() ?? new Date(0);

        if (data.status === 'cancelled') {
            return { valid: false, reason: 'Booking has been cancelled.' };
        }
        if (data.status === 'expired') {
            return { valid: false, reason: 'Booking has already expired.' };
        }
        if (now > endTime) {
            // Auto-mark expired in Firestore
            await updateDoc(doc(db, 'bookings', bookingId), { status: 'expired' });
            return { valid: false, reason: `Booking expired at ${endTime.toLocaleTimeString()}.` };
        }
        if (now < startTime) {
            return {
                valid: false,
                reason: `Booking not yet active. Valid from ${startTime.toLocaleTimeString()}.`,
            };
        }

        return {
            valid: true,
            booking: {
                id: data.id,
                spotId: data.spot_id,
                stationId: data.station_id,
                vehicleNumber: data.vehicle_number,
                phoneNumber: data.phone_number ?? '—',
                vehicleCategory: data.vehicle_category,
                isEV: data.is_ev,
                startTime,
                endTime,
                status: data.status,
                amount: data.amount,
            },
        };
    } catch (err) {
        console.error('Verification error:', err);
        return { valid: false, reason: 'Verification service unavailable. Try again.' };
    }
}


// ─── Helpers ─────────────────────────────────────────────────────────────────

function firestoreDocToSpot(data: Record<string, unknown>): ParkingSpot {
    const rawStatus = data.status as string;
    // Only trust 'booked' and 'locked' from DB — unknown/stale status → available
    const status: SpotStatus =
        rawStatus === 'booked' ? 'booked' :
            rawStatus === 'locked' ? 'locked' :
                'available';

    return {
        id: data.id as string,
        zone: data.zone as ParkingSpot['zone'],
        row: data.row_label as string,
        number: data.spot_number as number,
        status,
        hasEV: data.is_ev as boolean,
        lockedBy: (data.locked_by as string | undefined) ?? undefined,
        lockedAt: data.locked_at
            ? (data.locked_at as { toMillis: () => number }).toMillis()
            : undefined,
    };
}

// ─── Phone Lookup ─────────────────────────────────────────────────────────────

export interface ActiveBookingListItem {
    id: string;
    spotId: string;
    stationId: string;
    stationName: string;
    vehicleNumber: string;
    vehicleCategory: string;
    isEV: boolean;
    amount: number;
    startTime: Date;
    endTime: Date;
    status: string;
    qrCode: string | null;
}

export interface UserBookingsResult {
    found: boolean;
    bookings: ActiveBookingListItem[];
    reason?: string;
}

/**
 * Look up all active bookings by phone number.
 */
export async function getActiveBookingsByPhone(
    phone: string
): Promise<UserBookingsResult> {
    try {
        const q = query(
            collection(db, 'bookings'),
            where('phone_number', '==', phone),
            where('status', '==', 'active')
        );
        const snap = await getDocs(q);

        if (snap.empty) {
            return { found: false, bookings: [], reason: 'No active booking found for this number.' };
        }

        const now = new Date();
        const results: ActiveBookingListItem[] = [];
        const STATION_NAMES: Record<string, string> = {
            S1: 'Station 1 — Central Hub',
            S2: 'Station 2 — East Wing',
            S3: 'Station 3 — Basement',
        };

        for (const docSnap of snap.docs) {
            const data = docSnap.data();
            const endTime = data.end_time?.toDate?.() ?? new Date(0);

            if (now > endTime) {
                // Auto-expire
                await updateDoc(docSnap.ref, { status: 'expired' });
                continue;
            }

            results.push({
                id: data.id,
                spotId: data.spot_id,
                stationId: data.station_id,
                stationName: STATION_NAMES[data.station_id] ?? data.station_id,
                vehicleNumber: data.vehicle_number,
                vehicleCategory: data.vehicle_category,
                isEV: data.is_ev,
                amount: data.amount,
                startTime: data.start_time?.toDate?.() ?? new Date(),
                endTime,
                status: data.status,
                qrCode: data.qr_code ?? null,
            });
        }

        if (results.length === 0) {
            return { found: false, bookings: [], reason: 'Your previous bookings have expired.' };
        }

        // Sort by start time (newest first)
        results.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

        return {
            found: true,
            bookings: results,
        };
    } catch (err) {
        console.error('Phone lookup error:', err);
        return { found: false, bookings: [], reason: 'Lookup service unavailable. Please try again.' };
    }
}
