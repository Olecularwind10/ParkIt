import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useParkingStore } from '../store/useParkingStore';
import { getActiveBookingsByPhone, type UserBookingsResult } from '../lib/firestoreService';

// ── Directions builder ──
// spotId format: "S1_A1-29"  =>  station=S1, row=A1, spotNum=29
function getDirections(
    spotId: string,
    stationName: string,
    vehicleCategory: string,
    isEV: boolean
): { icon: string; text: string }[] {
    // Parse spotId like "S1_A1-29"
    const parts = spotId.split('_');
    const rowPart = parts[1] ?? spotId; // "A1-29"
    const [rowLabel, spotNumStr] = rowPart.split('-');
    const spotNum = parseInt(spotNumStr ?? '0');
    const zone = rowLabel?.replace(/[0-9]/g, '') ?? 'A'; // 'A','B','C','D','E','K'
    const isBike = vehicleCategory === 'bike' || zone === 'K';

    const ZONE_FLOOR: Record<string, string> = {
        A: 'Floor 1', B: 'Floor 2', C: 'Floor 3', D: 'Floor 4', E: 'Basement Level 2', K: 'Ground Level',
    };
    const ZONE_GATE: Record<string, string> = {
        A: 'Gate 1', B: 'Gate 2', C: 'Gate 3', D: 'Gate 4', E: 'Gate B2', K: 'Gate K (Bike Entrance)',
    };
    const ZONE_LABEL: Record<string, string> = {
        A: 'Zone A — Hatchbacks', B: 'Zone B — Sedans',
        C: 'Zone C — SUVs / EV', D: 'Zone D — Premium', E: 'Zone E — Compact', K: 'Bike Zone',
    };

    const floor = ZONE_FLOOR[zone] ?? 'Ground Level';
    const gate = ZONE_GATE[zone] ?? 'Main Gate';
    const zoneLabel = ZONE_LABEL[zone] ?? `Zone ${zone}`;

    return [
        { icon: '🚪', text: `Enter <strong>${stationName.split('—')[0].trim()}</strong> through <strong>${gate}</strong>` },
        { icon: '🧭', text: isBike ? `Follow the <strong>Bike Zone</strong> signs on the left` : `Take the ramp or lift to <strong>${floor}</strong>` },
        { icon: '🛣️', text: `Proceed to <strong>${zoneLabel}</strong> — follow overhead signs` },
        { icon: '↪️', text: `Turn into <strong>Row ${rowLabel}</strong>` },
        { icon: '🔢', text: `Count <strong>${spotNum} ${isBike ? 'slots' : 'bays'}</strong> from the wall — your spot is on the <strong>${spotNum % 2 === 0 ? 'right' : 'left'}</strong>` },
        { icon: '🅿️', text: `Park at <strong>Spot ${spotId.split('_')[1] ?? spotId}</strong>${isEV && !isBike ? ' — EV charger is on the right pillar' : ''}` },
        { icon: '📲', text: `Show your <strong>QR pass</strong> at the exit barrier to leave` },
    ];
}

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const } }),
};

const features = [
    { icon: '🗺️', color: 'rgba(59,130,246,0.15)', title: 'Visual Spot Selection', desc: 'Pick your exact parking spot from a live floor-plan, just like booking a movie seat.' },
    { icon: '⚡', color: 'rgba(34,197,94,0.15)', title: 'EV Charging Stations', desc: 'Filter and highlight EV-compatible spots with dedicated charging infrastructure.' },
    { icon: '🔒', color: 'rgba(245,158,11,0.15)', title: 'Real-Time Locking', desc: 'The moment you select a spot, it is instantly locked to prevent double-booking.' },
    { icon: '🚗', color: 'rgba(139,92,246,0.15)', title: 'Smart Vehicle Routing', desc: 'Automatically assigned to the right zone — Bike, Hatchback, Sedan, or SUV.' },
    { icon: '📍', color: 'rgba(239,68,68,0.15)', title: 'Step-by-Step Navigation', desc: 'Post-booking directions guide you from the entrance straight to your reserved spot.' },
    { icon: '💳', color: 'rgba(6,182,212,0.15)', title: 'Instant Payments', desc: 'Pay via UPI, card, or wallet — get a digital receipt and QR pass immediately.' },
];

export function HomePage() {
    const navigate = useNavigate();
    const reset = useParkingStore((s) => s.reset);

    // ── Phone lookup state ──
    const [phone, setPhone] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupResult, setLookupResult] = useState<UserBookingsResult | null>(null);
    const [lookupAttempted, setLookupAttempted] = useState(false);

    // Per-booking expanded states (using ID as key)
    const [expandedBookings, setExpandedBookings] = useState<Record<string, { qr: boolean, dir: boolean }>>({});

    const toggleBookingQR = (id: string) => {
        setExpandedBookings(prev => ({
            ...prev,
            [id]: { ...prev[id], qr: !prev[id]?.qr }
        }));
    };

    const toggleBookingDir = (id: string) => {
        setExpandedBookings(prev => ({
            ...prev,
            [id]: { ...prev[id], dir: !prev[id]?.dir }
        }));
    };

    // ── Fix 1: Clear previous user state on every visit to home ──
    useEffect(() => {
        reset();
    }, []);

    const handlePhoneLookup = async () => {
        if (phone.length < 10) return;
        setLookupLoading(true);
        setLookupAttempted(true);
        setLookupResult(null);
        setExpandedBookings({});
        const result = await getActiveBookingsByPhone(phone);
        setLookupResult(result);
        setLookupLoading(false);
    };

    const handleDownloadQR = (qrCode: string, bookingId: string) => {
        const a = document.createElement('a');
        a.href = qrCode;
        a.download = `parkit-pass-${bookingId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <>
            <section className="hero">
                <div className="hero-bg-grid" />
                <div className="hero-glow" />
                <div className="hero-content">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <div className="hero-pill">
                            <div className="hero-pill-dot" />
                            Live Spots Available
                        </div>
                    </motion.div>

                    <motion.h1
                        className="hero-title"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                    >
                        Park Smarter,<br />
                        <span>Not Harder.</span>
                    </motion.h1>

                    <motion.p
                        className="hero-subtitle"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        Reserve your exact parking spot in seconds. Real-time availability, EV charging filters,
                        and turn-by-turn guidance — all in one seamless experience.
                    </motion.p>

                    {/* ── Phone Lookup Card ── */}
                    <motion.div
                        className="phone-lookup-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.5 }}
                    >
                        <div className="phone-lookup-title">📲 Check Your Booking</div>
                        <div className="phone-lookup-subtitle">Enter your mobile number to view an existing booking</div>
                        <div className="phone-lookup-row">
                            <div className="phone-input-wrap">
                                <span className="phone-prefix">+91</span>
                                <input
                                    className="phone-input"
                                    placeholder="98765 43210"
                                    value={phone}
                                    onChange={(e) => {
                                        setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                                        setLookupResult(null);
                                        setLookupAttempted(false);
                                    }}
                                    inputMode="numeric"
                                    maxLength={10}
                                    onKeyDown={(e) => e.key === 'Enter' && handlePhoneLookup()}
                                />
                            </div>
                            <button
                                className="phone-lookup-btn"
                                onClick={handlePhoneLookup}
                                disabled={phone.length < 10 || lookupLoading}
                            >
                                {lookupLoading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Look Up →'}
                            </button>
                        </div>

                        {/* Result */}
                        <AnimatePresence>
                            {lookupAttempted && !lookupLoading && lookupResult && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    {lookupResult.found && lookupResult.bookings.length > 0 ? (
                                        <div className="bookings-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {lookupResult.bookings.map((booking) => (
                                                <div key={booking.id} className="booking-lookup-result found" style={{ marginBottom: 0 }}>
                                                    <div className="blr-header">
                                                        <span className="blr-badge found">✓ Active Booking</span>
                                                        <span className="blr-station">{booking.stationName}</span>
                                                    </div>
                                                    <div className="blr-grid">
                                                        <div className="blr-item"><span>Spot</span><strong>{booking.spotId}</strong></div>
                                                        <div className="blr-item"><span>Vehicle</span><strong>{booking.vehicleNumber}</strong></div>
                                                        <div className="blr-item">
                                                            <span>Entry</span>
                                                            <strong>{booking.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                                                        </div>
                                                        <div className="blr-item">
                                                            <span>Exit by</span>
                                                            <strong style={{ color: 'var(--accent-green)' }}>{booking.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                                                        </div>
                                                        <div className="blr-item"><span>Paid</span><strong>₹{booking.amount}</strong></div>
                                                        {booking.isEV && (
                                                            <div className="blr-item"><span>EV</span><strong>⚡ Charging</strong></div>
                                                        )}
                                                    </div>

                                                    {/* Directions */}
                                                    <div style={{ marginTop: '0.75rem' }}>
                                                        <button
                                                            className="blr-qr-toggle"
                                                            style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)', color: '#fbbf24' }}
                                                            onClick={() => toggleBookingDir(booking.id)}
                                                        >
                                                            {expandedBookings[booking.id]?.dir ? '▲ Hide Directions' : '🧭 Show Directions to Spot'}
                                                        </button>
                                                        <AnimatePresence>
                                                            {expandedBookings[booking.id]?.dir && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: 'auto' }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    style={{ overflow: 'hidden' }}
                                                                >
                                                                    <div className="blr-directions">
                                                                        {getDirections(
                                                                            booking.spotId,
                                                                            booking.stationName,
                                                                            booking.vehicleCategory,
                                                                            booking.isEV
                                                                        ).map((step, si) => (
                                                                            <div key={si} className="blr-dir-step">
                                                                                <div className="blr-dir-num">{si + 1}</div>
                                                                                <div
                                                                                    className="blr-dir-text"
                                                                                    dangerouslySetInnerHTML={{ __html: `${step.icon}&nbsp;&nbsp;${step.text}` }}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>

                                                    {/* QR toggle */}
                                                    {booking.qrCode && (
                                                        <div style={{ marginTop: '0.75rem' }}>
                                                            <button
                                                                className="blr-qr-toggle"
                                                                onClick={() => toggleBookingQR(booking.id)}
                                                            >
                                                                {expandedBookings[booking.id]?.qr ? '▲ Hide QR Pass' : '▼ Show QR Pass'}
                                                            </button>
                                                            <AnimatePresence>
                                                                {expandedBookings[booking.id]?.qr && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, height: 0 }}
                                                                        animate={{ opacity: 1, height: 'auto' }}
                                                                        exit={{ opacity: 0, height: 0 }}
                                                                        style={{ overflow: 'hidden', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                                                                    >
                                                                        <div className="qr-wrapper" style={{ minHeight: 'auto', minWidth: 'auto' }}>
                                                                            <img src={booking.qrCode} alt="QR Pass" className="qr-image" />
                                                                        </div>
                                                                        <button
                                                                            className="qr-download-btn"
                                                                            style={{ width: 'auto', padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}
                                                                            onClick={() => handleDownloadQR(booking.qrCode!, booking.id)}
                                                                        >
                                                                            ⬇ Download QR
                                                                        </button>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="booking-lookup-result not-found">
                                            <span>🔍</span>
                                            <span>{lookupResult.reason}</span>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <motion.div
                        className="hero-cta-group"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.5 }}
                    >
                        <button className="btn-primary" onClick={() => navigate('/select')}>
                            🅿 Book a Spot Now
                        </button>
                        <button className="btn-ghost" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                            See How It Works
                        </button>
                    </motion.div>

                    <motion.div
                        className="hero-stats"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                    >
                        {[
                            { val: '1,130+', label: 'Total Spots' },
                            null,
                            { val: '98%', label: 'Uptime' },
                            null,
                            { val: '<2s', label: 'Lock Time' },
                            null,
                            { val: '60+', label: 'EV Chargers' },
                        ].map((item, i) =>
                            item ? (
                                <div key={i} className="stat-item">
                                    <div className="stat-value">{item.val}</div>
                                    <div className="stat-label">{item.label}</div>
                                </div>
                            ) : (
                                <div key={i} className="stat-divider" />
                            )
                        )}
                    </motion.div>
                </div>
            </section>

            <section className="features" id="features">
                <div className="section-tag">✦ Features</div>
                <h2 className="section-title">Everything you need,<br />nothing you don't.</h2>
                <p className="section-subtitle">
                    Built for the modern driver — from bike riders to EV SUV owners.
                </p>
                <div className="features-grid">
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            className="feature-card"
                            variants={fadeUp}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true }}
                            custom={i}
                        >
                            <div className="feature-icon" style={{ background: f.color }}>
                                {f.icon}
                            </div>
                            <div className="feature-title">{f.title}</div>
                            <div className="feature-desc">{f.desc}</div>
                        </motion.div>
                    ))}
                </div>
            </section>
        </>
    );
}
