/**
 * ParkIt — SMS Service (Fast2SMS)
 * 
 * Note: Browser-side fetch to Fast2SMS fails due to CORS.
 * We're using a CORS proxy (allorigins) for development/demonstration.
 */

const FAST2SMS_KEY = import.meta.env.VITE_FAST2SMS_KEY as string | undefined;

export interface SMSBookingData {
    phone: string;
    bookingId: string;
    spotId: string;
    stationName: string;
    vehicleNumber: string;
    entryTime: string;
    exitTime: string;
    amount: number;
    isEV: boolean;
}

export async function sendBookingConfirmationSMS(data: SMSBookingData): Promise<void> {
    if (!FAST2SMS_KEY || FAST2SMS_KEY.includes('your_fast2sms_api_key_here')) {
        console.warn('[SMS] VITE_FAST2SMS_KEY is missing or invalid — skipping SMS');
        return;
    }

    const evLine = data.isEV ? ' | EV Charger: Included' : '';
    const message =
        `ParkIt Booking Confirmed!\n` +
        `Ref ID: ${data.bookingId}\n` +
        `Station: ${data.stationName}\n` +
        `Spot: ${data.spotId}${evLine}\n` +
        `Vehicle: ${data.vehicleNumber}\n` +
        `Entry: ${data.entryTime} | Exit by: ${data.exitTime}\n` +
        `Total: Rs.${data.amount}\n` +
        `Show QR at gate. Thank you!`;

    // Fast2SMS URL parameters
    const queryParams = new URLSearchParams({
        authorization: FAST2SMS_KEY,
        route: 'q',
        message: message,
        language: 'english',
        flash: '0',
        numbers: data.phone
    });

    const targetUrl = `https://www.fast2sms.com/dev/bulkV2?${queryParams.toString()}`;

    try {
        // Use a CORS proxy to bypass browser restrictions
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl);
        const proxyJson = await response.json();

        // allorigins wraps the response in a 'contents' string
        const json = JSON.parse(proxyJson.contents);

        if (json.return) {
            console.log('[SMS] Sent successful to', data.phone, '✓');
        } else {
            console.error('[SMS] Service Error:', json.message || 'Unknown Fast2SMS error');
        }
    } catch (err) {
        console.error('[SMS] Network/CORS Error:', err);
    }
}

