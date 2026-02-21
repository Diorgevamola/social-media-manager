import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#000000',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 3,
          paddingBottom: 5,
          paddingLeft: 6,
          paddingRight: 6,
        }}
      >
        {/* Barra esquerda — média */}
        <div
          style={{
            width: 3,
            height: 10,
            background: '#ffffff',
            borderRadius: '2px 2px 0 0',
            flexShrink: 0,
          }}
        />

        {/* Barra central — dot + barra mais alta */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 4,
              height: 4,
              background: '#ffffff',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              width: 3,
              height: 14,
              background: '#ffffff',
              borderRadius: '2px 2px 0 0',
            }}
          />
        </div>

        {/* Barra direita — curta */}
        <div
          style={{
            width: 3,
            height: 7,
            background: '#ffffff',
            borderRadius: '2px 2px 0 0',
            flexShrink: 0,
          }}
        />
      </div>
    ),
    { ...size },
  )
}
