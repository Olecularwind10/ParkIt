import { Link } from 'react-router-dom';
import { useParkingStore } from '../store/useParkingStore';

export function Navbar() {
    const reset = useParkingStore((s) => s.reset);

    return (
        <nav className="navbar">
            <Link to="/" className="nav-logo" onClick={reset}>
                <div className="nav-logo-icon">🅿</div>
                ParkIt
            </Link>
            <span className="nav-badge">⚡ Smart Parking</span>
        </nav>
    );
}
