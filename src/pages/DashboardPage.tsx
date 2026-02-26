import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useParkingStore } from '../store/useParkingStore';
import { STATION_CONFIGS } from '../store/useParkingStore';

export function DashboardPage() {
    const navigate = useNavigate();
    const { currentBooking, reset } = useParkingStore();
    const [qrReady, setQrReady] = useState(false);

    useEffect(() => {
        if (!currentBooking) navigate('/');
    }, []);

    // Poll for QR code generation (it's async)
    useEffect(() => {
        if (!currentBooking) return;
        if (currentBooking.qrCode) {
            setQrReady(true);
            return;
        }
        const interval = setInterval(() => {
            const booking = useParkingStore.getState().currentBooking;
            if (booking?.qrCode) {
                setQrReady(true);
                clearInterval(interval);
            }
        }, 300);
        return () => clearInterval(interval);
    }, [currentBooking]);

    if (!currentBooking) return null;

    const { spot, vehicleCategory, carType, isEV, vehicleNumber, amount, duration, timestamp, id, stationId, qrCode } = currentBooking;

    const station = STATION_CONFIGS[stationId];

    const zone =
        vehicleCategory === 'bike' ? 'BIKE' :
            carType === 'hatchback' ? 'A' :
                carType === 'sedan' ? 'B' : 'C';

    const floorLabel =
        zone === 'A' ? 'Floor 1' : zone === 'B' ? 'Floor 2' : zone === 'C' ? 'Floor 3' : 'Ground Level';
    const gateLabel = zone === 'A' ? 'Gate 1' : zone === 'B' ? 'Gate 2' : zone === 'C' ? 'Gate 3' : 'Gate K';
    const levelLabel = zone === 'BIKE' ? 'Ground Level' : floorLabel;
    const directionVerb = zone === 'BIKE' ? 'Proceed straight' : `Take ramp to ${floorLabel}`;

    const [spotRow, spotNum] = spot.id.split('-');

    const directions = [
        { text: `Enter <strong>${station.name}</strong> through <strong>${gateLabel}</strong>`, icon: '🚪' },
        { text: `${directionVerb} — follow the <strong>${zone === 'BIKE' ? 'Bike Zone' : `Zone ${zone}`}</strong> signs`, icon: '🧭' },
        { text: `Proceed to <strong>Row ${spotRow}</strong> on your left`, icon: '↪️' },
        { text: `Count <strong>${spotNum} spots</strong> from the wall`, icon: '🔢' },
        { text: `Park at <strong>Spot ${spot.id}</strong>${spot.hasEV ? ' — connect to EV charger on the right' : ''}`, icon: '🅿️' },
        { text: `Show the QR code below at the <strong>exit barrier</strong> to exit`, icon: '📲' },
    ];

    const bookingTime = new Date(timestamp);
    const exitTime = new Date(timestamp + duration * 60 * 60 * 1000);

    const handleDownloadQR = () => {
        if (!qrCode) return;
        const link = document.createElement('a');
        link.href = qrCode;
        link.download = `parkit-pass-${id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-wrapper">
                {/* Success Banner */}
                <motion.div
                    className="success-banner"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.div
                        className="success-icon"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    >
                        ✓
                    </motion.div>
                    <div>
                        <div className="success-title">Booking Confirmed!</div>
                        <div className="success-sub">
                            Your spot is reserved. Payment of ₹{amount} received successfully.
                        </div>
                    </div>
                    <div className="success-booking-id">
                        <div className="booking-id-label">Booking ID</div>
                        <div className="booking-id-value">{id}</div>
                    </div>
                </motion.div>

                {/* Dashboard Grid */}
                <div className="dashboard-grid">
                    {/* 2D Floor Plan / Map */}
                    <motion.div
                        className="dash-card"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                    >
                        <div className="dash-card-title">🗺️ Spot Location</div>
                        <FloorPlanMap spotId={spot.id} zone={zone} stationLayout={station.layout} />
                        <div style={{
                            marginTop: '0.75rem',
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '1.5rem',
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 10, height: 10, background: 'var(--accent-blue)', borderRadius: 2, display: 'inline-block' }} />
                                Your Spot
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 10, height: 10, background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(71,85,105,0.3)', borderRadius: 2, display: 'inline-block' }} />
                                Occupied
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 10, height: 10, background: 'rgba(30,58,138,0.25)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 2, display: 'inline-block' }} />
                                Available
                            </span>
                        </div>
                    </motion.div>

                    {/* Directions */}
                    <motion.div
                        className="dash-card"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25, duration: 0.4 }}
                    >
                        <div className="dash-card-title">📍 Navigation Guide</div>
                        <div className="directions-list">
                            {directions.map((d, i) => (
                                <motion.div
                                    key={i}
                                    className={`direction-step ${i === directions.length - 2 ? 'highlight' : ''}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.07 }}
                                >
                                    <div className="dir-step-num">{i + 1}</div>
                                    <div className="dir-step-text" dangerouslySetInnerHTML={{ __html: `${d.icon} &nbsp;${d.text}` }} />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Booking Info */}
                    <motion.div
                        className="dash-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                    >
                        <div className="dash-card-title">🎟️ Booking Details</div>
                        <div className="info-row">
                            <span className="info-label">Station</span>
                            <span className="info-value" style={{ fontSize: '0.82rem' }}>{station.icon} {station.name}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Spot</span>
                            <span className="info-value blue">{spot.id}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Zone / Level</span>
                            <span className="info-value">{levelLabel}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Vehicle</span>
                            <span className="info-value" style={{ textTransform: 'capitalize' }}>
                                {vehicleCategory === 'bike' ? '🏍️ Bike' : `🚗 ${carType}`}
                            </span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Reg. Number</span>
                            <span className="info-value" style={{ fontFamily: 'monospace' }}>{vehicleNumber}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">EV Charging</span>
                            <span className="info-value">
                                {isEV && spot.hasEV ? <span className="ev-badge">⚡ Included</span> : '—'}
                            </span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Entry Time</span>
                            <span className="info-value">{bookingTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Exit By</span>
                            <span className="info-value green">{exitTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Duration</span>
                            <span className="info-value">{duration}h</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Amount Paid</span>
                            <span className="info-value green">₹{amount}</span>
                        </div>
                    </motion.div>

                    {/* QR Digital Pass */}
                    <motion.div
                        className="dash-card"
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.4 }}
                    >
                        <div className="dash-card-title" style={{ alignSelf: 'flex-start' }}>📲 Digital Pass</div>

                        {/* Scan badge */}
                        <div className="scan-at-entry-badge">
                            📷 Scan at Entry Gate · {station.name}
                        </div>

                        {/* Expiry display */}
                        <div className="qr-expiry-badge">
                            <span>⏱</span>
                            <span>
                                Valid until <strong>{exitTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                                {' '}on{' '}
                                <strong>{exitTime.toLocaleDateString([], { day: 'numeric', month: 'short' })}</strong>
                            </span>
                        </div>

                        {/* QR Code */}
                        <div className="qr-wrapper">
                            {qrReady && qrCode ? (
                                <img
                                    src={qrCode}
                                    alt="Parking QR Pass"
                                    className="qr-image"
                                />
                            ) : (
                                <div className="qr-loading">
                                    <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Generating QR…</span>
                                </div>
                            )}
                        </div>

                        {/* Booking ref */}
                        <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                            {id} · {spot.id} · {stationId}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: 'auto' }}>
                            {qrReady && qrCode && (
                                <button
                                    className="qr-download-btn"
                                    onClick={handleDownloadQR}
                                >
                                    ⬇ Download QR Pass
                                </button>
                            )}
                            <button
                                className="btn-primary"
                                style={{ width: '100%', justifyContent: 'center' }}
                                onClick={() => { reset(); navigate('/'); }}
                            >
                                🏠 Back to Home
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────
// Floor Plan Mini-Map component
// ─────────────────────────────────────────────────
function FloorPlanMap({
    spotId,
    zone,
    stationLayout,
}: {
    spotId: string;
    zone: string;
    stationLayout: 'straight' | 'angled' | 'basement';
}) {
    const cols = zone === 'BIKE' ? 10 : zone === 'C' || zone === 'D' ? 6 : 8;
    const rowLabels =
        zone === 'A' ? ['A1', 'A2', 'A3'] :
            zone === 'B' ? ['B1', 'B2', 'B3'] :
                zone === 'C' ? ['C1', 'C2', 'C3'] :
                    zone === 'D' ? ['D1', 'D2', 'D3'] :
                        zone === 'E' ? ['E1', 'E2'] : ['K1', 'K2', 'K3'];

    const [targetRow, targetNum] = spotId.split('-');
    const tNum = parseInt(targetNum);

    return (
        <div className="floor-plan-map">
            <div style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                ↑ ENTRANCE
            </div>
            {rowLabels.map((row, ri) => (
                <div key={row}>
                    {ri > 0 && (
                        <div style={{ height: 6, background: 'rgba(100,116,139,0.15)', borderRadius: 2, margin: '3px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '0.45rem', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>ROAD</span>
                        </div>
                    )}
                    <div className="fp-row" style={{ transform: stationLayout === 'angled' ? 'skewX(-6deg)' : undefined }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', minWidth: 24 }}>{row}</span>
                        {Array.from({ length: cols }).map((_, ci) => {
                            const isTarget = row === targetRow && ci + 1 === tNum;
                            const isBooked = !isTarget && Math.random() < 0.3;
                            return (
                                <div
                                    key={ci}
                                    className={`fp-spot ${isTarget ? 'fp-target' : isBooked ? 'fp-booked' : ''}`}
                                    style={{ width: zone === 'BIKE' ? 16 : 24, height: zone === 'BIKE' ? 20 : 30 }}
                                />
                            );
                        })}
                    </div>
                </div>
            ))}
            <div className="fp-entrance">GATE 2</div>
        </div>
    );
}
