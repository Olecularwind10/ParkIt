import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useParkingStore } from '../store/useParkingStore';

const PAYMENT_METHODS = [
    { id: 'upi', icon: '📱', label: 'UPI / Google Pay / PhonePe' },
    { id: 'card', icon: '💳', label: 'Credit / Debit Card' },
    { id: 'wallet', icon: '👜', label: 'Paytm / Amazon Pay Wallet' },
    { id: 'netbanking', icon: '🏦', label: 'Net Banking' },
];

const DURATIONS = [1, 2, 3, 6, 12, 24];

const PRICE_MAP: Record<string, number> = {
    bike: 30,
    hatchback: 60,
    sedan: 80,
    suv: 100,
};

export function CheckoutPage() {
    const navigate = useNavigate();
    const {
        selectedSpot,
        vehicleCategory,
        carType,
        isEV,
        vehicleNumber,
        phoneNumber,
        duration,
        setVehicleNumber,
        setPhoneNumber,
        setDuration,
        confirmBooking,
    } = useParkingStore();

    const [payMethod, setPayMethod] = useState('upi');
    const [paying, setPaying] = useState(false);

    if (!selectedSpot || !vehicleCategory) {
        navigate('/select');
        return null;
    }

    const priceKey = vehicleCategory === 'bike' ? 'bike' : carType || 'hatchback';
    const rate = PRICE_MAP[priceKey];
    const subtotal = rate * duration;
    const convenience = Math.round(subtotal * 0.02);
    const total = subtotal + convenience;

    const handlePay = async () => {
        if (!vehicleNumber.trim() || !phoneNumber.trim()) return;
        setPaying(true);
        // Simulate payment delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Await the booking confirmation to ensure state is set before navigating
        // Dashboard checks currentBooking on mount; if it's not set yet, it redirects to home
        await confirmBooking(vehicleNumber, duration);
        navigate('/dashboard');
    };

    const zoneLabel =
        vehicleCategory === 'bike' ? 'Zone K — Ground Level' :
            carType === 'hatchback' ? 'Zone A — Floor 1' :
                carType === 'sedan' ? 'Zone B — Floor 2' : 'Zone C — Floor 3';

    return (
        <div className="checkout-wrapper">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div style={{ marginBottom: '2rem' }}>
                    <div className="step-pill">Checkout</div>
                    <h1 className="step-title" style={{ fontSize: '1.6rem' }}>Confirm Booking</h1>
                    <p className="step-subtitle">Review your details and complete payment.</p>
                </div>

                {/* Spot Summary */}
                <div className="checkout-summary">
                    <div className="checkout-summary-row">
                        <span className="label">Spot ID</span>
                        <span className="value" style={{ fontFamily: 'monospace', fontSize: '1rem' }}>{selectedSpot.id}</span>
                    </div>
                    <div className="checkout-summary-row">
                        <span className="label">Zone / Floor</span>
                        <span className="value">{zoneLabel}</span>
                    </div>
                    <div className="checkout-summary-row">
                        <span className="label">Vehicle Type</span>
                        <span className="value" style={{ textTransform: 'capitalize' }}>
                            {vehicleCategory === 'bike' ? '🏍️ Bike' : `🚗 ${carType}`}
                            {isEV && <span className="ev-badge" style={{ marginLeft: '0.5rem' }}>⚡ EV</span>}
                        </span>
                    </div>
                    <div className="checkout-summary-row">
                        <span className="label">EV Charging</span>
                        <span className="value" style={{ color: selectedSpot.hasEV ? 'var(--accent-ev)' : 'var(--text-muted)' }}>
                            {selectedSpot.hasEV ? '✓ Included' : 'Not available'}
                        </span>
                    </div>
                    <div className="checkout-summary-row">
                        <span className="label">Rate</span>
                        <span className="value">₹{rate}/hr</span>
                    </div>
                </div>

                {/* Duration */}
                <div className="input-group">
                    <label className="input-label">Parking Duration (hours)</label>
                    <div className="duration-options">
                        {DURATIONS.map((d) => (
                            <div
                                key={d}
                                className={`duration-opt ${duration === d ? 'selected' : ''}`}
                                onClick={() => setDuration(d)}
                            >
                                {d}h
                            </div>
                        ))}
                    </div>
                </div>

                {/* Vehicle Number */}
                <div className="input-group">
                    <label className="input-label">Vehicle Registration Number</label>
                    <input
                        className="input-field"
                        placeholder="e.g. MH12 AB 1234"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                        maxLength={12}
                    />
                </div>

                {/* Phone Number */}
                <div className="input-group">
                    <label className="input-label">Mobile Number</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{
                            position: 'absolute', left: '0.9rem', top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)', fontSize: '0.9rem', pointerEvents: 'none',
                        }}>+91</span>
                        <input
                            className="input-field"
                            style={{ paddingLeft: '2.8rem' }}
                            placeholder="98765 43210"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            inputMode="numeric"
                            maxLength={10}
                        />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        📲 We'll send your booking details and QR pass to this number.
                    </div>
                </div>

                {/* Payment */}
                <div className="input-group">
                    <label className="input-label">Payment Method</label>
                    <div className="payment-methods">
                        {PAYMENT_METHODS.map((p) => (
                            <div
                                key={p.id}
                                className={`pay-method ${payMethod === p.id ? 'selected' : ''}`}
                                onClick={() => setPayMethod(p.id)}
                            >
                                <span className="pay-method-icon">{p.icon}</span>
                                {p.label}
                                {payMethod === p.id && <span style={{ marginLeft: 'auto', color: 'var(--accent-blue-light)', fontSize: '0.8rem' }}>✓</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Price Breakdown */}
                <div className="checkout-summary" style={{ marginBottom: '1.25rem' }}>
                    <div className="checkout-summary-row">
                        <span className="label">Subtotal ({duration}h × ₹{rate})</span>
                        <span className="value">₹{subtotal}</span>
                    </div>
                    <div className="checkout-summary-row">
                        <span className="label">Convenience fee (2%)</span>
                        <span className="value">₹{convenience}</span>
                    </div>
                    <div className="checkout-summary-row" style={{ paddingTop: '0.75rem' }}>
                        <span className="label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
                        <span className="value" style={{ fontSize: '1.2rem', color: 'var(--accent-blue-light)' }}>₹{total}</span>
                    </div>
                </div>

                <div className="step-nav">
                    <button className="btn-back" onClick={() => navigate('/layout')}>← Change Spot</button>
                    <button
                        className="btn-next"
                        onClick={handlePay}
                        disabled={!vehicleNumber.trim() || !phoneNumber.trim() || phoneNumber.length < 10 || paying}
                    >
                        {paying ? <><span className="spinner" /> Processing...</> : `Pay ₹${total} →`}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
