import QRCode from 'qrcode';

export interface QRBookingData {
    bookingId: string;
    stationId: string;
    spotId: string;
    vehicleNumber: string;
    timestamp: number;
    expiryTimestamp: number;
}

const VERIFY_BASE_URL = 'https://parkit-e31d9.web.app/verify';

export async function generateQRCode(data: QRBookingData): Promise<string> {
    // QR contains ONLY the verification URL — small, secure, tamper-proof
    // Gate scanner opens this URL → backend checks Firestore → grants/denies entry
    const verifyUrl = `${VERIFY_BASE_URL}?bookingId=${data.bookingId}`;

    try {
        const dataUrl = await QRCode.toDataURL(verifyUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 256,
            color: {
                dark: '#0f172a',
                light: '#ffffff',
            },
        });
        return dataUrl;
    } catch (err) {
        console.error('QR generation failed:', err);
        return '';
    }
}
