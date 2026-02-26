import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useParkingStore,
    type VehicleCategory,
    type CarType,
    type StationId,
    STATION_CONFIGS,
} from '../store/useParkingStore';

const carTypes: { id: CarType; name: string; emoji: string; desc: string }[] = [
    { id: 'hatchback', name: 'Hatchback', emoji: '🚗', desc: 'Compact car · Zone A' },
    { id: 'sedan', name: 'Sedan', emoji: '🚙', desc: 'Mid-size car · Zone B' },
    { id: 'suv', name: 'SUV / MPV', emoji: '🚐', desc: 'Large vehicle · Zone C / D' },
];

const vehicleTypes: { id: VehicleCategory; name: string; emoji: string; desc: string }[] = [
    { id: 'bike', name: 'Bike / Scooter', emoji: '🏍️', desc: '2-Wheeler · Zone K · Ground Level' },
    { id: 'car', name: 'Car / Electric Car', emoji: '🚗', desc: '4-Wheeler · Multiple Zones' },
];

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
};

export function VehicleSelectPage() {
    const navigate = useNavigate();
    const {
        stationId,
        vehicleCategory,
        carType,
        isEV,
        setStation,
        setVehicleCategory,
        setCarType,
        setIsEV,
        initializeSpots,
    } = useParkingStore();

    const [step, setStep] = useState<1 | 2 | 3>(1);

    const handleStationSelect = (id: StationId) => {
        setStation(id);
    };

    const handleVehicleSelect = (cat: VehicleCategory) => {
        setVehicleCategory(cat);
    };

    const handleStationProceed = () => {
        if (stationId) setStep(2);
    };

    const handleProceed = () => {
        if (vehicleCategory === 'bike') {
            initializeSpots();
            navigate('/layout');
        } else if (vehicleCategory === 'car') {
            setStep(3);
        }
    };

    const handleCarProceed = () => {
        if (carType) {
            initializeSpots();
            navigate('/layout');
        }
    };

    const stations = Object.values(STATION_CONFIGS);

    return (
        <div className="step-container">
            <AnimatePresence mode="wait">
                {/* ── STEP 1: Station Selection ── */}
                {step === 1 && (
                    <motion.div
                        key="step1"
                        className="step-card"
                        variants={cardVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        transition={{ duration: 0.35 }}
                    >
                        <div className="step-header">
                            <div className="step-pill">Step 1 of 3</div>
                            <h1 className="step-title">Choose Parking Station</h1>
                            <p className="step-subtitle">Select which facility you'd like to park at.</p>
                        </div>

                        <div className="station-grid">
                            {stations.map((s) => (
                                <motion.div
                                    key={s.id}
                                    className={`station-card ${stationId === s.id ? 'selected' : ''}`}
                                    onClick={() => handleStationSelect(s.id)}
                                    whileHover={{ y: -3 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="station-card-top">
                                        <span className="station-icon">{s.icon}</span>
                                        <div className="station-check">
                                            {stationId === s.id && <span style={{ color: 'white', fontSize: '0.7rem' }}>✓</span>}
                                        </div>
                                    </div>
                                    <div className="station-name">{s.name}</div>
                                    <div className="station-subtitle">{s.subtitle}</div>
                                    <div className="station-desc">{s.description}</div>
                                    <div className="station-tags">
                                        <span className="station-tag">{s.layout}</span>
                                        <span className="station-tag">{s.totalSpots} spots</span>
                                        <span className="station-tag ev">⚡ EV</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="step-nav">
                            <button
                                className="btn-next"
                                disabled={!stationId}
                                onClick={handleStationProceed}
                            >
                                Next: Select Vehicle →
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* ── STEP 2: Vehicle Type ── */}
                {step === 2 && (
                    <motion.div
                        key="step2"
                        className="step-card"
                        variants={cardVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        transition={{ duration: 0.35 }}
                    >
                        <div className="step-header">
                            <div className="step-pill">Step 2 of 3</div>
                            <h1 className="step-title">What are you parking?</h1>
                            <p className="step-subtitle">Select your vehicle type to find the right zone.</p>
                        </div>

                        <div className="vehicle-grid">
                            {vehicleTypes.map((v) => (
                                <motion.div
                                    key={v.id}
                                    className={`vehicle-option ${vehicleCategory === v.id ? 'selected' : ''}`}
                                    onClick={() => handleVehicleSelect(v.id)}
                                    whileHover={{ x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="vehicle-option-emoji">{v.emoji}</div>
                                    <div className="vehicle-option-content">
                                        <div className="vehicle-option-name">{v.name}</div>
                                        <div className="vehicle-option-desc">{v.desc}</div>
                                    </div>
                                    <div className="vehicle-option-check">
                                        {vehicleCategory === v.id && <span style={{ color: 'white', fontSize: '0.7rem' }}>✓</span>}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* EV Toggle */}
                        <motion.div
                            className="ev-toggle-card"
                            onClick={() => setIsEV(!isEV)}
                            animate={{ opacity: vehicleCategory ? 1 : 0.4 }}
                        >
                            <div className="ev-toggle-left">
                                <span className="ev-icon">⚡</span>
                                <div>
                                    <div className="ev-label">Electric Vehicle?</div>
                                    <div className="ev-sub">
                                        {vehicleCategory === 'bike'
                                            ? 'Bikes do not support EV charging at this station.'
                                            : "We'll highlight EV charging spots in your zone."}
                                    </div>
                                </div>
                            </div>
                            <div className={`toggle ${isEV && vehicleCategory === 'car' ? 'on' : ''}`}>
                                <div className="toggle-knob" />
                            </div>
                        </motion.div>

                        <div className="step-nav">
                            <button className="btn-back" onClick={() => setStep(1)}>← Back</button>
                            <button
                                className="btn-next"
                                disabled={!vehicleCategory}
                                onClick={handleProceed}
                            >
                                {vehicleCategory === 'car' ? 'Next: Choose Car Type →' : 'Find Parking Spots →'}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* ── STEP 3: Car Sub-type ── */}
                {step === 3 && (
                    <motion.div
                        key="step3"
                        className="step-card"
                        variants={cardVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        transition={{ duration: 0.35 }}
                    >
                        <div className="step-header">
                            <div className="step-pill">Step 3 of 3</div>
                            <h1 className="step-title">Select car type</h1>
                            <p className="step-subtitle">This determines which zone and floor you'll be assigned to.</p>
                        </div>

                        <div className="vehicle-grid">
                            {carTypes.map((c) => (
                                <motion.div
                                    key={c.id}
                                    className={`vehicle-option ${carType === c.id ? 'selected' : ''}`}
                                    onClick={() => setCarType(c.id)}
                                    whileHover={{ x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="vehicle-option-emoji">{c.emoji}</div>
                                    <div className="vehicle-option-content">
                                        <div className="vehicle-option-name">{c.name}</div>
                                        <div className="vehicle-option-desc">{c.desc}</div>
                                    </div>
                                    <div className="vehicle-option-check">
                                        {carType === c.id && <span style={{ color: 'white', fontSize: '0.7rem' }}>✓</span>}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="step-nav">
                            <button className="btn-back" onClick={() => setStep(2)}>← Back</button>
                            <button className="btn-next" disabled={!carType} onClick={handleCarProceed}>
                                View Available Spots →
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
