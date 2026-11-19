import create, {meta} from './assets/alhambra/pieces/alhambra-hill-dusk.js';
import {paint} from './assets/alhambra/canvas.js';

export function createAlhambra(canvas) {
  const context = canvas.getContext('2d');
  const draw = create();
  let lastFrame = -1;
  return (seconds, reducedMotion) => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(canvas.clientWidth * ratio);
    const height = Math.round(canvas.clientHeight * ratio);
    if (!width || !height) return;
    const frame = reducedMotion ? 0 : Math.floor(seconds * meta.fps);
    const resized = canvas.width !== width || canvas.height !== height;
    if (!resized && frame === lastFrame) return;
    if (resized) {
      canvas.width = width;
      canvas.height = height;
    }
    const cell = Math.min(width * .94 / meta.cols, height * .85 / meta.rows);
    context.clearRect(0, 0, width, height);
    paint(context, draw(.5 + frame / meta.fps), meta.palette, {
      ...meta.dots,
      mode: 'circle',
      cw: cell,
      ch: cell,
      x: (width - cell * meta.cols) / 2,
      y: (height - cell * meta.rows) / 2,
      ink: '#f8eddb'
    });
    lastFrame = frame;
  };
}
