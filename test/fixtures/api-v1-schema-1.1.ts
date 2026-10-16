export const apiV1Schema11Fixture = {
  schemaVersion: '1.1',
  source: {
    url: 'https://simplesite.ayra.ch/',
    viewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
    },
  },
  styles: { colors: [], typographies: [] },
  assets: [],
  document: {
    id: 'html',
    tag: 'html',
    type: 'FRAME',
    rect: { x: 0, y: 0, width: 1440, height: 900, top: 0, left: 0 },
    isVisible: true,
    children: [
      {
        id: 'body',
        tag: 'body',
        type: 'FRAME',
        rect: { x: 0, y: 0, width: 1440, height: 900, top: 0, left: 0 },
        isVisible: true,
        fills: [
          {
            type: 'IMAGE',
            src: 'https://images.example.com/background.jpg',
            scaleMode: 'FILL',
          },
        ],
        children: [
          {
            id: 'content',
            tag: 'div',
            type: 'FRAME',
            rect: { x: 80, y: 96, width: 640, height: 360, top: 96, left: 80 },
            isVisible: true,
            children: [],
          },
        ],
      },
    ],
  },
} as const
