import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const alt = 'Tivuta';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#111a2f',
                    backgroundImage: 'radial-gradient(circle at 50% 35%, #1a2a4a 0%, #111a2f 70%)',
                }}
            >
                <div
                    style={{
                        fontSize: 140,
                        fontWeight: 900,
                        letterSpacing: 8,
                        color: '#d4af37',
                        display: 'flex',
                    }}
                >
                    TIVUTA
                </div>
                <div
                    style={{
                        marginTop: 18,
                        fontSize: 32,
                        color: '#f0e6d3',
                        opacity: 0.7,
                        display: 'flex',
                    }}
                >
                    diamonds · cars · insurance · and more
                </div>
            </div>
        ),
        { ...size }
    );
}
