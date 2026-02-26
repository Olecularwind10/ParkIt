import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getBookingById, type VerificationResult } from '../lib/firestoreService';
import { STATION_CONFIGS } from '../store/useParkingStore';

export function VerifyPage() {
    const [searchParams] = useSearchParams();
    const bookingId = searchParams.get('bookingId');

    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<VerificationResult | null>(null);

    useEffect(() => {
        if (!bookingId) {
            setResult({ valid: false, reason: 'No booking ID provided in QR code.' });
            setLoading(false);
            return;
        }

        getBookingById(bookingId).then((res) => {
            setResult(res);
            setLoading(false);
        });
    }, [bookingId]);

    return (
        <div className="verify-page">
            <div className="verify-wrapper">

                {/* Header */}
                <div className="verify-header">
                    <div className="verify-logo">🅿 ParkIt</div>
                    <div className="verify-subtitle">Gate Entry Verification System</div>
                </div>

                {/* Loading */}
                {loading && (
                    <motion.div
                        className="verify-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="verify-checking">
                            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                            <div className="verify-checking-text">
                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Verifying Booking…</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                    Checking Firestore database
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Result */}
                {!loading && result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {result.valid && result.booking ? (
                            /* ── ACCESS GRANTED ── */
                            <div className="verify-card verify-granted">
                                <motion.div
                                    className="verify-status-icon granted"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 250, delay: 0.1 }}
                                >
                                    ✓
                                </motion.div>
                                <div className="verify-status-label granted">ACCESS GRANTED</div>
                                <div className="verify-status-sub">Booking verified — open gate</div>

                                <div className="verify-divider" />

                                <div className="verify-details">
                                    <VerifyRow label="Booking ID" value={result.booking.id} mono />
                                    <VerifyRow
                                        label="Station"
                                        value={STATION_CONFIGS[result.booking.stationId as keyof typeof STATION_CONFIGS]?.name ?? result.booking.stationId}
                                    />
                                    <VerifyRow label="Spot" value={result.booking.spotId} mono />
                                    <VerifyRow
                                        label="Vehicle"
                                        value={`${result.booking.vehicleCategory === 'bike' ? '🏍️' : '🚗'} ${result.booking.vehicleNumber}`}
                                    />
                                    <VerifyRow label="Phone" value={`+91 ${result.booking.phoneNumber}`} />
                                    {result.booking.isEV && (
                                        <VerifyRow label="EV Charging" value="⚡ Included" green />
                                    )}
                                    <VerifyRow
                                        label="Valid Until"
                                        value={result.booking.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        green
                                    />
                                    <VerifyRow
                                        label="Amount Paid"
                                        value={`₹${result.booking.amount}`}
                                    />
                                </div>

                                <div className="verify-gate-action granted">
                                    🚦 Gate is opening…
                                </div>
                            </div>
                        ) : (
                            /* ── ACCESS DENIED ── */
                            <div className="verify-card verify-denied">
                                <motion.div
                                    className="verify-status-icon denied"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 250, delay: 0.1 }}
                                >
                                    ✕
                                </motion.div>
                                <div className="verify-status-label denied">ACCESS DENIED</div>
                                <div className="verify-status-sub">{result.reason}</div>

                                {bookingId && (
                                    <div className="verify-divider" />
                                )}
                                {bookingId && (
                                    <div className="verify-details">
                                        <VerifyRow label="Booking ID" value={bookingId} mono />
                                        <VerifyRow label="Reason" value={result.reason ?? '—'} red />
                                    </div>
                                )}

                                <div className="verify-gate-action denied">
                                    🚫 Gate remains closed — contact staff
                                </div>
                            </div>
                        )}

                        {/* Scan timestamp */}
                        <div className="verify-timestamp">
                            Scanned at {new Date().toLocaleString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                            })}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

function VerifyRow({
    label,
    value,
    mono,
    green,
    red,
}: {
    label: string;
    value: string;
    mono?: boolean;
    green?: boolean;
    red?: boolean;
}) {
    return (
        <div className="verify-row">
            <span className="verify-row-label">{label}</span>
            <span
                className="verify-row-value"
                style={{
                    fontFamily: mono ? 'monospace' : undefined,
                    color: green
                        ? 'var(--accent-green)'
                        : red
                            ? 'var(--accent-red)'
                            : undefined,
                }}
            >
                {value}
            </span>
        </div>
    );
}
