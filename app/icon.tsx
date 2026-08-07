import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          borderRadius: '50%',
        }}
      >
        <div
          style={{
            width: '58%',
            height: '58%',
            borderRadius: '50%',
            background: '#dc2626',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
