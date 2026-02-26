import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useParkingStore, type ParkingSpot, type Zone, STATION_CONFIGS } from '../store/useParkingStore';

const ZONE_CONFIG: Record<string, { label: string; floor: string; class: string; icon: string }> = {
    A: { label: 'Zone A — Hatchbacks', floor: 'Floor 1', class: 'zone-a', icon: '🚗' },
    B: { label: 'Zone B — Sedans', floor: 'Floor 2', class: 'zone-b', icon: '🚙' },
    C: { label: 'Zone C — SUVs', floor: 'Floor 3', class: 'zone-c', icon: '🚐' },
    D: { label: 'Zone D — Premium', floor: 'Floor 4', class: 'zone-d', icon: '🚘' },
    E: { label: 'Zone E — Compact', floor: 'Floor 5', class: 'zone-e', icon: '🚗' },
    BIKE: { label: 'Zone K — Bikes', floor: 'Ground Level', class: 'zone-bike', icon: '🏍️' },
};

const PRICE_MAP: Record<string, number> = {
    bike: 30,
    hatchback: 60,
    sedan: 80,
    suv: 100,
};

type ToastType = { id: number; msg: string; type: 'success' | 'warning' | 'error' };

export function ParkingLayoutPage() {
    const navigate = useNavigate();
    const {
        vehicleCategory,
        carType,
        isEV,
        spots,
        selectedSpot,
        evFilterActive,
        stationId,
        spotsLoading,
        spotsError,
        selectSpot,
        lockSpot,
        initializeSpots,
        setEvFilterActive,
    } = useParkingStore();

    const [toasts, setToasts] = useState<ToastType[]>([]);
    const [isLocking, setIsLocking] = useState(false);

    useEffect(() => {
        if (!vehicleCategory) { navigate('/select'); return; }
        initializeSpots();
    }, []);

    const addToast = useCallback((msg: string, type: ToastType['type'] = 'success') => {
        const id = Date.now();
        setToasts((t) => [...t, { id, msg, type }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
    }, []);

    // Determine zone from vehicle selection
    const activeZone: Zone =
        vehicleCategory === 'bike' ? 'BIKE' :
            carType === 'hatchback' ? 'A' :
                carType === 'sedan' ? 'B' :
                    carType === 'suv' ? (stationId === 'S2' ? 'C' : 'C') : 'C';

    const zoneSpots = spots.filter((s) => s.zone === activeZone);
    const zoneConfig = ZONE_CONFIG[activeZone];
    const stationConfig = STATION_CONFIGS[stationId];
    const isAngled = stationConfig.layout === 'angled';
    const isBasement = stationConfig.layout === 'basement';

    // Group by row
    const rowMap = zoneSpots.reduce((acc, s) => {
        if (!acc[s.row]) acc[s.row] = [];
        acc[s.row].push(s);
        return acc;
    }, {} as Record<string, ParkingSpot[]>);

    const rows = Object.entries(rowMap).sort(([a], [b]) => a.localeCompare(b));

    // Sort spots within each row by number
    rows.forEach(([_, rowSpots]) => {
        rowSpots.sort((a, b) => a.number - b.number);
    });

    const available = zoneSpots.filter((s) => s.status === 'available' || s.status === 'ev').length;

    const getSpotClass = (spot: ParkingSpot) => {
        let cls = '';
        if (spot.id === selectedSpot?.id) cls = 'selected';
        else if (spot.status === 'booked') cls = 'booked';
        else if (spot.status === 'locked') cls = 'locked';
        else if (evFilterActive && !spot.hasEV) cls = 'booked dimmed';
        else if (spot.hasEV && spot.status === 'available') cls = 'ev-available ev-indicator';
        else cls = 'available';

        if (isAngled) cls += ' angled';
        return cls;
    };

    const handleSpotClick = (spot: ParkingSpot) => {
        if (spot.status === 'booked' || spot.status === 'locked') return;
        if (evFilterActive && !spot.hasEV) return;
        selectSpot(spot.id);
        addToast(`Spot ${spot.id} selected`, 'success');
    };

    const handleProceed = async () => {
        if (!selectedSpot) return;
        setIsLocking(true);
        const success = await lockSpot(selectedSpot.id);
        setIsLocking(false);
        if (!success) {
            addToast('⚡ Spot just got taken! Pick another.', 'error');
            return;
        }
        addToast(`🔒 Spot ${selectedSpot.id} locked — complete payment within 10 min`, 'warning');
        setTimeout(() => navigate('/checkout'), 400);
    };

    const priceKey = vehicleCategory === 'bike' ? 'bike' : carType || 'hatchback';
    const pricePerHour = PRICE_MAP[priceKey];

    return (
        <div className="layout-page">
            <div className="layout-wrapper">
                <div className="layout-header">
                    <div className="layout-title-area">
                        <h1>Choose Your Spot</h1>
                        <p>
                            <span className="station-badge-inline">{stationConfig.icon} {stationConfig.name}</span>
                            {' · '}{zoneConfig.floor}{' · '}{available} spots available
                        </p>
                    </div>
                    <span className={`zone-badge ${zoneConfig.class}`}>
                        {zoneConfig.icon} {zoneConfig.label}
                    </span>
                </div>

                {/* Station context bar */}
                <div className="station-context-bar">
                    <div className={`layout-badge ${stationConfig.layout}`}>
                        {stationConfig.layout === 'straight' ? '↕ Straight' :
                            stationConfig.layout === 'angled' ? '⟋ Angled' : '⬇ Basement'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{stationConfig.description}</div>
                </div>

                <div className="layout-controls">
                    {isEV && (
                        <button
                            className={`ev-filter-btn ${evFilterActive ? 'active' : ''}`}
                            onClick={() => setEvFilterActive(!evFilterActive)}
                        >
                            ⚡ {evFilterActive ? 'EV Filter ON' : 'Show EV Spots'}
                        </button>
                    )}
                    <div className="legend">
                        <div className="legend-item"><div className="legend-dot ld-available" /> Available</div>
                        <div className="legend-item"><div className="legend-dot ld-selected" /> Selected</div>
                        <div className="legend-item"><div className="legend-dot ld-ev" /> EV Charging</div>
                        <div className="legend-item"><div className="legend-dot ld-locked" /> Locked</div>
                        <div className="legend-item"><div className="legend-dot ld-booked" /> Occupied</div>
                    </div>
                </div>

                {/* Loading state */}
                {spotsLoading && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
                        <div style={{ marginTop: '0.75rem', fontSize: '0.88rem' }}>Loading spots from Firestore…</div>
                    </div>
                )}

                {/* Error state */}
                {spotsError && (
                    <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem',
                        color: '#f87171', fontSize: '0.88rem', marginBottom: '1rem',
                    }}>
                        ❌ {spotsError}
                    </div>
                )}

                {/* Parking Floor Plan */}
                <motion.div
                    className={`parking-floor ${isBasement ? 'basement-floor' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <div className="floor-header">
                        <span className="floor-tag">Floor Plan</span>
                        <span className="floor-name">{zoneConfig.label} · {zoneConfig.floor}</span>
                        {isBasement && <span className="basement-badge">🅿 BASEMENT</span>}
                        <span className="floor-available">{available}/{zoneSpots.length} available</span>
                    </div>

                    {/* Entrance indicator */}
                    <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                        <span className="entrance-indicator">
                            ↑ ENTRANCE {isBasement ? '/ ELEVATOR' : '/ RAMP'}
                        </span>
                    </div>

                    {rows.map(([rowKey, rowSpots], ri) => (
                        <div key={rowKey}>
                            {/* Road lane between EVERY row */}
                            {ri > 0 && (
                                <div className="road-lane" aria-hidden="true">
                                    <div className="road-lane-inner">
                                        <span className="road-arrow">→</span>
                                        <span className="road-label">ROAD</span>
                                        <span className="road-dashes" />
                                        <span className="road-label">ROAD</span>
                                        <span className="road-arrow">→</span>
                                    </div>
                                </div>
                            )}
                            <div className="spots-lane">
                                <span className="row-label">{rowKey}</span>
                                <div style={{
                                    display: 'flex',
                                    gap: isBasement ? '0.25rem' : '0.3rem',
                                    flexWrap: 'wrap',
                                    transform: isAngled ? 'none' : undefined,
                                }}>
                                    {rowSpots.map((spot) => (
                                        <motion.div
                                            key={spot.id}
                                            className={`spot ${activeZone === 'BIKE' ? 'bike' : ''} ${getSpotClass(spot)}`}
                                            onClick={() => handleSpotClick(spot)}
                                            whileTap={spot.status !== 'booked' && spot.status !== 'locked' ? { scale: 0.92 } : {}}
                                            title={`${spot.id}${spot.hasEV ? ' ⚡ EV' : ''}`}
                                        >
                                            <span className="spot-number">{spot.number}</span>
                                            <span className="spot-icon">
                                                {spot.status === 'booked' ? '✕' :
                                                    spot.status === 'locked' ? '🔒' :
                                                        spot.id === selectedSpot?.id ? '✓' :
                                                            spot.hasEV ? '⚡' :
                                                                activeZone === 'BIKE' ? '🏍' : '🚗'}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Exit */}
                    <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                            ↓ EXIT RAMP
                        </span>
                    </div>
                </motion.div>

                {/* Booking Panel */}
                <AnimatePresence>
                    {selectedSpot && (
                        <motion.div
                            className="booking-panel"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="booking-panel-spot">
                                <div className="booking-panel-id">
                                    {selectedSpot.id}
                                    {selectedSpot.hasEV && (
                                        <span className="ev-badge" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>⚡ EV</span>
                                    )}
                                </div>
                                <div className="booking-panel-sub">{zoneConfig.label} · {zoneConfig.floor} · {stationConfig.name}</div>
                            </div>
                            <div className="booking-panel-price">
                                Rate: <span>₹{pricePerHour}/hr</span>
                            </div>
                            <button
                                className="btn-next"
                                style={{ flex: 'unset', padding: '0.75rem 2rem', minWidth: 180 }}
                                onClick={handleProceed}
                                disabled={isLocking}
                            >
                                {isLocking ? <><span className="spinner" /> Locking...</> : '🔒 Lock & Proceed →'}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Toasts */}
            <div className="toast-container">
                <AnimatePresence>
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            className={`toast ${t.type}`}
                            initial={{ opacity: 0, x: 60 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 60 }}
                        >
                            {t.type === 'success' ? '✅' : t.type === 'warning' ? '⚠️' : '❌'}
                            {t.msg}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
