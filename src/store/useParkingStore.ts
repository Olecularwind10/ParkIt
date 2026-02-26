import { create } from 'zustand';
import { generateQRCode } from '../utils/generateQR';
import {
    fetchSpotsByStation,
    subscribeToSpots,
    lockSpotInFirestore,
    markSpotBooked,
    saveBookingToFirestore,
} from '../lib/firestoreService';
import { sendBookingConfirmationSMS } from '../lib/smsService';
import type { Unsubscribe } from 'firebase/firestore';

export type VehicleCategory = 'bike' | 'car';
export type CarType = 'hatchback' | 'sedan' | 'suv';
export type SpotStatus = 'available' | 'locked' | 'booked' | 'ev' | 'selected';
export type Zone = 'A' | 'B' | 'C' | 'D' | 'E' | 'BIKE';
export type StationId = 'S1' | 'S2' | 'S3';

export interface ParkingSpot {
    id: string;
    zone: Zone;
    row: string;
    number: number;
    status: SpotStatus;
    hasEV: boolean;
    lockedBy?: string;
    lockedAt?: number;
}

export interface Booking {
    id: string;
    spot: ParkingSpot;
    vehicleCategory: VehicleCategory;
    carType?: CarType;
    isEV: boolean;
    vehicleNumber: string;
    phoneNumber: string;
    amount: number;
    duration: number;
    timestamp: number;
    stationId: StationId;
    qrCode?: string;
}

export interface StationConfig {
    id: StationId;
    name: string;
    subtitle: string;
    description: string;
    icon: string;
    layout: 'straight' | 'angled' | 'basement';
    zones: { zone: Zone; label: string; rows: string[]; spotsPerRow: number }[];
    bikeRows: string[];
    bikeSpotsPerRow: number;
    evZone: Zone;
    evPositions: 'last-2-A' | 'first-3-D' | 'all-C';
    totalSpots: number;
}

export const STATION_CONFIGS: Record<StationId, StationConfig> = {
    S1: {
        id: 'S1',
        name: 'Station 1 — Central Hub',
        subtitle: 'Straight layout · 3 car zones · 100 bike spots',
        description: 'Main parking hub with straight rows. EV charging at the end of Row A.',
        icon: '🏢',
        layout: 'straight',
        zones: [
            { zone: 'A', label: 'Zone A — Hatchbacks (Floor 1)', rows: ['A1', 'A2', 'A3'], spotsPerRow: 30 },
            { zone: 'B', label: 'Zone B — Sedans (Floor 2)', rows: ['B1', 'B2', 'B3'], spotsPerRow: 30 },
            { zone: 'C', label: 'Zone C — SUVs (Floor 3)', rows: ['C1', 'C2', 'C3'], spotsPerRow: 30 },
        ],
        bikeRows: ['K1', 'K2', 'K3', 'K4', 'K5'],
        bikeSpotsPerRow: 20,
        evZone: 'A',
        evPositions: 'last-2-A',
        totalSpots: 390,
    },
    S2: {
        id: 'S2',
        name: 'Station 2 — East Wing',
        subtitle: 'Angled layout · 4 car zones · 100 bike spots',
        description: 'East wing with angled parking bays. EV charging at the start of Row D.',
        icon: '🏬',
        layout: 'angled',
        zones: [
            { zone: 'A', label: 'Zone A — Hatchbacks (Floor 1)', rows: ['A1', 'A2', 'A3'], spotsPerRow: 30 },
            { zone: 'B', label: 'Zone B — Sedans (Floor 2)', rows: ['B1', 'B2', 'B3'], spotsPerRow: 30 },
            { zone: 'C', label: 'Zone C — SUVs (Floor 3)', rows: ['C1', 'C2', 'C3'], spotsPerRow: 30 },
            { zone: 'D', label: 'Zone D — Premium (Floor 4)', rows: ['D1', 'D2', 'D3'], spotsPerRow: 30 },
        ],
        bikeRows: ['K1', 'K2', 'K3', 'K4', 'K5'],
        bikeSpotsPerRow: 20,
        evZone: 'D',
        evPositions: 'first-3-D',
        totalSpots: 460,
    },
    S3: {
        id: 'S3',
        name: 'Station 3 — Basement',
        subtitle: 'Basement style · 5 car zones · 100 bike spots',
        description: 'Underground basement parking. EV charging centralized in Row C.',
        icon: '🅿️',
        layout: 'basement',
        zones: [
            { zone: 'A', label: 'Zone A — Hatchbacks', rows: ['A1', 'A2'], spotsPerRow: 20 },
            { zone: 'B', label: 'Zone B — Sedans', rows: ['B1', 'B2'], spotsPerRow: 20 },
            { zone: 'C', label: 'Zone C — EV & SUVs', rows: ['C1', 'C2'], spotsPerRow: 20 },
            { zone: 'D', label: 'Zone D — Premium', rows: ['D1', 'D2'], spotsPerRow: 20 },
            { zone: 'E', label: 'Zone E — Compact', rows: ['E1', 'E2'], spotsPerRow: 20 },
        ],
        bikeRows: ['K1', 'K2', 'K3', 'K4', 'K5'],
        bikeSpotsPerRow: 20,
        evZone: 'C',
        evPositions: 'all-C',
        totalSpots: 300,
    },
};

const PRICE_MAP: Record<string, number> = {
    bike: 30,
    hatchback: 60,
    sedan: 80,
    suv: 100,
};

const SESSION_ID = `user_${Math.random().toString(36).substr(2, 9)}`;

interface ParkingStore {
    // Station
    stationId: StationId;
    setStation: (id: StationId) => void;

    // Vehicle selection
    vehicleCategory: VehicleCategory | null;
    carType: CarType | null;
    isEV: boolean;
    evFilterActive: boolean;

    // Spot selection
    spots: ParkingSpot[];
    selectedSpot: ParkingSpot | null;
    spotsLoading: boolean;
    spotsError: string | null;

    // Firestore live subscription
    _unsubscribeSpots: Unsubscribe | null;

    // Booking
    currentBooking: Booking | null;
    vehicleNumber: string;
    phoneNumber: string;
    duration: number;

    // User session
    sessionId: string;

    // Actions
    setVehicleCategory: (cat: VehicleCategory) => void;
    setCarType: (type: CarType) => void;
    setIsEV: (val: boolean) => void;
    setEvFilterActive: (val: boolean) => void;
    initializeSpots: () => Promise<void>;
    selectSpot: (spotId: string) => void;
    lockSpot: (spotId: string) => Promise<boolean>;
    confirmBooking: (vehicleNumber: string, duration: number) => Promise<void>;
    setVehicleNumber: (num: string) => void;
    setPhoneNumber: (num: string) => void;
    setDuration: (d: number) => void;
    reset: () => void;
}

export const useParkingStore = create<ParkingStore>((set, get) => ({
    stationId: 'S1',
    vehicleCategory: null,
    carType: null,
    isEV: false,
    evFilterActive: false,
    spots: [],
    selectedSpot: null,
    spotsLoading: false,
    spotsError: null,
    _unsubscribeSpots: null,
    currentBooking: null,
    vehicleNumber: '',
    phoneNumber: '',
    duration: 2,
    sessionId: SESSION_ID,

    setStation: (id) => {
        // Unsubscribe previous listener
        get()._unsubscribeSpots?.();
        set({ stationId: id, spots: [], selectedSpot: null, _unsubscribeSpots: null });
    },

    setVehicleCategory: (cat) => set({ vehicleCategory: cat, carType: null, selectedSpot: null }),
    setCarType: (type) => set({ carType: type, selectedSpot: null }),
    setIsEV: (val) => set({ isEV: val }),
    setEvFilterActive: (val) => set({ evFilterActive: val }),

    initializeSpots: async () => {
        const { stationId, _unsubscribeSpots } = get();

        // Tear down any previous subscription
        _unsubscribeSpots?.();

        set({ spotsLoading: true, spotsError: null, spots: [] });

        try {
            // Initial load
            const spots = await fetchSpotsByStation(stationId);
            set({ spots, spotsLoading: false });

            // Real-time subscription — keeps spots in sync as others book
            const unsub = subscribeToSpots(stationId, (updatedSpots) => {
                const { selectedSpot } = get();
                // Re-apply local 'selected' state on top of remote data
                const merged = updatedSpots.map((s) =>
                    s.id === selectedSpot?.id && selectedSpot.status === 'selected'
                        ? { ...s, status: 'selected' as SpotStatus }
                        : s
                );
                set({ spots: merged });
            });

            set({ _unsubscribeSpots: unsub });
        } catch (err) {
            console.error('Firestore fetch error:', err);
            set({ spotsLoading: false, spotsError: 'Failed to load spots. Please try again.' });
        }
    },

    selectSpot: (spotId) => {
        const { spots, selectedSpot } = get();
        const updated = spots.map((s) => {
            if (s.id === selectedSpot?.id && s.status === 'selected') {
                return { ...s, status: 'available' as SpotStatus };
            }
            if (s.id === spotId && (s.status === 'available' || s.status === 'ev')) {
                return { ...s, status: 'selected' as SpotStatus };
            }
            return s;
        });
        const spot = updated.find((s) => s.id === spotId) || null;
        set({ spots: updated, selectedSpot: spot });
    },

    lockSpot: async (spotId) => {
        const { sessionId } = get();

        // Optimistic UI update
        set((state) => ({
            spots: state.spots.map((s) =>
                s.id === spotId ? { ...s, status: 'locked' as SpotStatus } : s
            ),
        }));

        // Atomic Firestore transaction — prevents double-booking
        const success = await lockSpotInFirestore(spotId, sessionId);

        if (!success) {
            // Revert: another user got it first
            set((state) => ({
                spots: state.spots.map((s) =>
                    s.id === spotId ? { ...s, status: 'booked' as SpotStatus } : s
                ),
                selectedSpot: null,
            }));
            return false;
        }

        const locked = get().spots.find((s) => s.id === spotId) || null;
        set({ selectedSpot: locked });
        return true;
    },

    confirmBooking: async (vehicleNumber, duration) => {
        const { selectedSpot, vehicleCategory, carType, isEV, stationId, phoneNumber } = get();
        if (!selectedSpot) return;

        const key = vehicleCategory === 'bike' ? 'bike' : carType || 'hatchback';
        const amount = PRICE_MAP[key] * duration;
        const now = Date.now();
        const bookingId = `BK${now}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        const booking: Booking = {
            id: bookingId,
            spot: selectedSpot,
            vehicleCategory: vehicleCategory!,
            carType: carType || undefined,
            isEV,
            vehicleNumber,
            phoneNumber,
            amount,
            duration,
            timestamp: now,
            stationId,
            qrCode: undefined,
        };

        // Mark spot booked in Firestore
        await markSpotBooked(selectedSpot.id);

        set({ currentBooking: booking });

        // Generate QR code async — patch into booking when ready
        generateQRCode({
            bookingId,
            stationId,
            spotId: selectedSpot.id,
            vehicleNumber,
            timestamp: now,
            expiryTimestamp: now + duration * 60 * 60 * 1000,
        }).then(async (qrCode) => {
            const updatedBooking = { ...booking, qrCode };
            set({ currentBooking: updatedBooking });
            // Save full booking (with QR) to Firestore
            await saveBookingToFirestore(updatedBooking);

            // Send Confirmation SMS
            sendBookingConfirmationSMS({
                phone: phoneNumber,
                bookingId: bookingId,
                spotId: selectedSpot.id.split('_')[1] || selectedSpot.id,
                stationName: STATION_CONFIGS[stationId]?.name || stationId,
                vehicleNumber: vehicleNumber,
                entryTime: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                exitTime: new Date(now + duration * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                amount: amount,
                isEV: isEV,
            });
        });
    },

    setVehicleNumber: (num) => set({ vehicleNumber: num }),
    setPhoneNumber: (num) => set({ phoneNumber: num }),
    setDuration: (d) => set({ duration: d }),

    reset: () => {
        get()._unsubscribeSpots?.();
        set({
            vehicleCategory: null,
            carType: null,
            isEV: false,
            evFilterActive: false,
            spots: [],
            selectedSpot: null,
            spotsLoading: false,
            spotsError: null,
            currentBooking: null,
            vehicleNumber: '',
            phoneNumber: '',
            duration: 2,
            stationId: 'S1',
            _unsubscribeSpots: null,
        });
    },
}));
