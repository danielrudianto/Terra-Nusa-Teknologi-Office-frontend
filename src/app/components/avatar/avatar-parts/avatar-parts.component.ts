/**
 * Component-based avatar.
 *
 * The backend only stores part ids and palette keys (see the `user_avatars`
 * table); every shape lives here and is rendered as inline SVG. That keeps the
 * stored payload tiny and lets us restyle every avatar at once by editing a
 * palette below.
 *
 * All shapes are drawn on a 100 x 100 canvas.
 */

export interface AvatarConfig {
  faceID: string;
  hairID: string;
  eyesID: string;
  mouthID: string;
  topID: string;
  accessoryID: string | null;
  skinTone: string;
  hairColor: string;
  topColor: string;
  backgroundColor: string;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  faceID: 'face-01',
  hairID: 'hair-01',
  eyesID: 'eyes-01',
  mouthID: 'mouth-01',
  topID: 'top-01',
  accessoryID: null,
  skinTone: 'tone-03',
  hairColor: 'hair-brown',
  topColor: 'top-blue',
  backgroundColor: 'bg-blue',
};

/* ===================== palettes ===================== */

export const SKIN_TONES: Record<
  string,
  { fill: string; shade: string; label: string }
> = {
  'tone-01': { fill: '#f6d9c3', shade: '#e8c3a6', label: 'Light' },
  'tone-02': { fill: '#eec4a4', shade: '#dbab86', label: 'Fair' },
  'tone-03': { fill: '#dda87e', shade: '#c68e62', label: 'Medium' },
  'tone-04': { fill: '#c08152', shade: '#a46a3e', label: 'Tan' },
  'tone-05': { fill: '#96603a', shade: '#7c4c2b', label: 'Brown' },
  'tone-06': { fill: '#6b432a', shade: '#54331f', label: 'Deep' },
};

export const HAIR_COLORS: Record<string, { fill: string; label: string }> = {
  'hair-black': { fill: '#2b2b33', label: 'Black' },
  'hair-brown': { fill: '#5a3a24', label: 'Brown' },
  'hair-chestnut': { fill: '#8a5330', label: 'Chestnut' },
  'hair-blonde': { fill: '#d9a441', label: 'Blonde' },
  'hair-red': { fill: '#a8412a', label: 'Red' },
  'hair-gray': { fill: '#9aa1ad', label: 'Grey' },
};

export const TOP_COLORS: Record<
  string,
  { fill: string; shade: string; label: string }
> = {
  'top-blue': { fill: '#154dec', shade: '#0f3bb8', label: 'Blue' },
  'top-indigo': { fill: '#5b3df5', shade: '#4830c4', label: 'Indigo' },
  'top-teal': { fill: '#0d9488', shade: '#0a746b', label: 'Teal' },
  'top-green': { fill: '#15803d', shade: '#106430', label: 'Green' },
  'top-amber': { fill: '#b45309', shade: '#8d4107', label: 'Amber' },
  'top-rose': { fill: '#be123c', shade: '#960e30', label: 'Rose' },
  'top-slate': { fill: '#475569', shade: '#374151', label: 'Slate' },
};

export const BACKGROUND_COLORS: Record<
  string,
  { fill: string; label: string }
> = {
  'bg-blue': { fill: '#e7ecfb', label: 'Blue' },
  'bg-indigo': { fill: '#ece8fe', label: 'Indigo' },
  'bg-teal': { fill: '#dcf5f2', label: 'Teal' },
  'bg-green': { fill: '#e2f5e9', label: 'Green' },
  'bg-amber': { fill: '#fdefdc', label: 'Amber' },
  'bg-rose': { fill: '#fde7ec', label: 'Rose' },
  'bg-slate': { fill: '#eef1f5', label: 'Slate' },
};

/* ===================== parts ===================== */
/* Each part is a function of the resolved colours so shading stays consistent. */

type SkinArgs = { fill: string; shade: string };
type HairArgs = { fill: string };
type TopArgs = { fill: string; shade: string };

export const FACES: Record<
  string,
  { label: string; draw: (c: SkinArgs) => string }
> = {
  'face-01': {
    label: 'Round',
    draw: (c) => `<ellipse cx="50" cy="43" rx="20" ry="21" fill="${c.fill}"/>`,
  },
  'face-02': {
    label: 'Oval',
    draw: (c) => `<ellipse cx="50" cy="43" rx="18" ry="23" fill="${c.fill}"/>`,
  },
  'face-03': {
    label: 'Square',
    draw: (c) =>
      `<rect x="31" y="22" width="38" height="42" rx="15" fill="${c.fill}"/>`,
  },
  'face-04': {
    label: 'Heart',
    draw: (c) =>
      `<path d="M30 36c0-9 9-15 20-15s20 6 20 15c0 13-9 28-20 28S30 49 30 36z" fill="${c.fill}"/>`,
  },
};

export const HAIRS: Record<
  string,
  { label: string; draw: (c: HairArgs) => string }
> = {
  'hair-00': { label: 'None', draw: () => '' },
  'hair-01': {
    label: 'Short',
    draw: (c) =>
      `<path d="M29 40c0-14 9-22 21-22s21 8 21 22c0-6-3-9-6-10-4 2-9 3-15 3-7 0-13-1-16-4-3 2-5 5-5 11z" fill="${c.fill}"/>`,
  },
  'hair-02': {
    label: 'Long',
    draw: (c) =>
      `<path d="M28 42c0-16 10-24 22-24s22 8 22 24v22c0 3-3 5-6 4-2-1-3-3-3-6V38c-4 3-8 4-13 4s-9-1-13-4v24c0 3-1 5-3 6-3 1-6-1-6-4z" fill="${c.fill}"/>`,
  },
  'hair-03': {
    label: 'Bun',
    draw: (c) =>
      `<circle cx="50" cy="15" r="7" fill="${c.fill}"/><path d="M29 41c0-14 9-22 21-22s21 8 21 22c0-6-3-10-6-11-4 2-9 3-15 3s-11-1-15-3c-3 1-6 5-6 11z" fill="${c.fill}"/>`,
  },
  'hair-04': {
    label: 'Curly',
    draw: (c) =>
      `<path d="M29 42c-2-6 0-11 4-13-1-6 4-11 10-11 3-2 11-2 14 0 6 0 11 5 10 11 4 2 6 7 4 13-1-5-4-8-7-9-4 2-9 3-14 3s-10-1-14-3c-3 1-6 4-7 9z" fill="${c.fill}"/><circle cx="33" cy="30" r="6" fill="${c.fill}"/><circle cx="67" cy="30" r="6" fill="${c.fill}"/><circle cx="50" cy="21" r="7" fill="${c.fill}"/>`,
  },
  'hair-05': {
    label: 'Side part',
    draw: (c) =>
      `<path d="M29 41c0-14 9-23 21-23 7 0 13 3 17 9-6-1-16 2-24 7-4 2-8 4-9 9-2-1-4 0-5-2z" fill="${c.fill}"/>`,
  },
};

export const EYES: Record<string, { label: string; draw: () => string }> = {
  'eyes-01': {
    label: 'Dots',
    draw: () =>
      `<circle cx="43" cy="43" r="2.4" fill="#2b2b33"/><circle cx="57" cy="43" r="2.4" fill="#2b2b33"/>`,
  },
  'eyes-02': {
    label: 'Round',
    draw: () =>
      `<circle cx="43" cy="43" r="3.6" fill="#fff"/><circle cx="43" cy="43" r="2" fill="#2b2b33"/><circle cx="57" cy="43" r="3.6" fill="#fff"/><circle cx="57" cy="43" r="2" fill="#2b2b33"/>`,
  },
  'eyes-03': {
    label: 'Happy',
    draw: () =>
      `<path d="M39.5 44c1-2.6 6-2.6 7 0" stroke="#2b2b33" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M53.5 44c1-2.6 6-2.6 7 0" stroke="#2b2b33" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
  'eyes-04': {
    label: 'Wink',
    draw: () =>
      `<circle cx="43" cy="43" r="2.4" fill="#2b2b33"/><path d="M53.5 43.5c1-2.4 6-2.4 7 0" stroke="#2b2b33" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
  'eyes-05': {
    label: 'Sleepy',
    draw: () =>
      `<path d="M39.5 43h7" stroke="#2b2b33" stroke-width="2" stroke-linecap="round"/><path d="M53.5 43h7" stroke="#2b2b33" stroke-width="2" stroke-linecap="round"/>`,
  },
};

export const MOUTHS: Record<string, { label: string; draw: () => string }> = {
  'mouth-01': {
    label: 'Smile',
    draw: () =>
      `<path d="M44 52c2 3 10 3 12 0" stroke="#5b3a2e" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
  'mouth-02': {
    label: 'Neutral',
    draw: () =>
      `<path d="M45 53h10" stroke="#5b3a2e" stroke-width="2" stroke-linecap="round"/>`,
  },
  'mouth-03': {
    label: 'Grin',
    draw: () =>
      `<path d="M43 51h14c0 4-3 6.5-7 6.5S43 55 43 51z" fill="#5b3a2e"/><path d="M45 51h10v1.6H45z" fill="#fff"/>`,
  },
  'mouth-04': {
    label: 'Smirk',
    draw: () =>
      `<path d="M44 53c3 2.6 8 2 11-1.6" stroke="#5b3a2e" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
  'mouth-05': {
    label: 'Serious',
    draw: () =>
      `<path d="M44 54c2-2.4 10-2.4 12 0" stroke="#5b3a2e" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
};

export const TOPS: Record<
  string,
  { label: string; draw: (c: TopArgs) => string }
> = {
  'top-01': {
    label: 'Crew neck',
    draw: (c) =>
      `<path d="M26 100c0-13 10-22 24-22s24 9 24 22z" fill="${c.fill}"/><path d="M43 79c2 4 12 4 14 0" stroke="${c.shade}" stroke-width="2" fill="none"/>`,
  },
  'top-02': {
    label: 'Collared',
    draw: (c) =>
      `<path d="M26 100c0-13 10-22 24-22s24 9 24 22z" fill="${c.fill}"/><path d="M44 78l6 8 6-8 5 2-11 12-11-12z" fill="#fff"/>`,
  },
  'top-03': {
    label: 'Hoodie',
    draw: (c) =>
      `<path d="M26 100c0-13 10-22 24-22s24 9 24 22z" fill="${c.fill}"/><path d="M41 78c3 6 15 6 18 0l4 2c-4 8-22 8-26 0z" fill="${c.shade}"/><rect x="48" y="86" width="4" height="12" rx="2" fill="${c.shade}"/>`,
  },
  'top-04': {
    label: 'Blazer',
    draw: (c) =>
      `<path d="M26 100c0-13 10-22 24-22s24 9 24 22z" fill="${c.fill}"/><path d="M44 78L50 92 56 78l4 1-8 21h-4l-8-21z" fill="#fff"/><path d="M40 80l10 12-3 8-9-18z" fill="${c.shade}"/><path d="M60 80L50 92l3 8 9-18z" fill="${c.shade}"/>`,
  },
  'top-05': {
    label: 'Vest',
    draw: (c) =>
      `<path d="M26 100c0-13 10-22 24-22s24 9 24 22z" fill="${c.fill}"/><path d="M42 79l8 9 8-9 3 1-6 20h-10l-6-20z" fill="${c.shade}"/>`,
  },
};

export const ACCESSORIES: Record<
  string,
  { label: string; draw: () => string }
> = {
  'glasses-01': {
    label: 'Glasses',
    draw: () =>
      `<g fill="none" stroke="#2b2b33" stroke-width="1.8"><circle cx="43" cy="43" r="6"/><circle cx="57" cy="43" r="6"/><path d="M49 43h2M31 41l6 1M69 41l-6 1"/></g>`,
  },
  'glasses-02': {
    label: 'Square glasses',
    draw: () =>
      `<g fill="none" stroke="#2b2b33" stroke-width="1.8"><rect x="36.5" y="38.5" width="12" height="9" rx="2"/><rect x="51.5" y="38.5" width="12" height="9" rx="2"/><path d="M48.5 43h3M31 41l5.5 1M69 41l-5.5 1"/></g>`,
  },
  'shades-01': {
    label: 'Sunglasses',
    draw: () =>
      `<g><rect x="36" y="38" width="13" height="9" rx="3" fill="#2b2b33"/><rect x="51" y="38" width="13" height="9" rx="3" fill="#2b2b33"/><path d="M49 42h2M31 40l5 1M69 40l-5 1" stroke="#2b2b33" stroke-width="1.8" fill="none"/></g>`,
  },
  'earrings-01': {
    label: 'Earrings',
    draw: () =>
      `<circle cx="30" cy="47" r="2.2" fill="#d9a441"/><circle cx="70" cy="47" r="2.2" fill="#d9a441"/>`,
  },
};

/* ===================== builder ===================== */

function pick<T>(
  map: Record<string, T>,
  key: string | null | undefined,
  fallback: string,
): T {
  if (key && map[key]) return map[key];
  return map[fallback];
}

/**
 * Compose the full avatar SVG for a config.
 * Layer order: background -> top -> neck -> face -> hair -> eyes -> mouth -> accessory.
 */
export function buildAvatarSvg(
  config: Partial<AvatarConfig> | null | undefined,
  options: { rounded?: boolean } = {},
): string {
  const c: AvatarConfig = { ...DEFAULT_AVATAR, ...(config ?? {}) };

  const skin = pick(SKIN_TONES, c.skinTone, 'tone-03');
  const hair = pick(HAIR_COLORS, c.hairColor, 'hair-brown');
  const top = pick(TOP_COLORS, c.topColor, 'top-blue');
  const bg = pick(BACKGROUND_COLORS, c.backgroundColor, 'bg-blue');

  const face = pick(FACES, c.faceID, 'face-01').draw(skin);
  const hairShape = pick(HAIRS, c.hairID, 'hair-01').draw(hair);
  const eyes = pick(EYES, c.eyesID, 'eyes-01').draw();
  const mouth = pick(MOUTHS, c.mouthID, 'mouth-01').draw();
  const topShape = pick(TOPS, c.topID, 'top-01').draw(top);
  const accessory =
    c.accessoryID && ACCESSORIES[c.accessoryID]
      ? ACCESSORIES[c.accessoryID].draw()
      : '';

  const background =
    options.rounded === false
      ? `<rect width="100" height="100" fill="${bg.fill}"/>`
      : `<circle cx="50" cy="50" r="50" fill="${bg.fill}"/>`;

  // neck, drawn with the darker skin shade so it reads as behind the chin
  const neck = `<path d="M44 58h12v12c0 3-12 3-12 0z" fill="${skin.shade}"/>`;

  return [
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img">',
    background,
    neck,
    topShape,
    face,
    hairShape,
    eyes,
    mouth,
    accessory,
    '</svg>',
  ].join('');
}

/** Option lists for the builder UI. */
export const AVATAR_OPTIONS = {
  faces: Object.keys(FACES).map((id) => ({ id, label: FACES[id].label })),
  hairs: Object.keys(HAIRS).map((id) => ({ id, label: HAIRS[id].label })),
  eyes: Object.keys(EYES).map((id) => ({ id, label: EYES[id].label })),
  mouths: Object.keys(MOUTHS).map((id) => ({ id, label: MOUTHS[id].label })),
  tops: Object.keys(TOPS).map((id) => ({ id, label: TOPS[id].label })),
  accessories: [
    { id: '', label: 'None' },
    ...Object.keys(ACCESSORIES).map((id) => ({
      id,
      label: ACCESSORIES[id].label,
    })),
  ],
  skinTones: Object.keys(SKIN_TONES).map((id) => ({
    id,
    label: SKIN_TONES[id].label,
    color: SKIN_TONES[id].fill,
  })),
  hairColors: Object.keys(HAIR_COLORS).map((id) => ({
    id,
    label: HAIR_COLORS[id].label,
    color: HAIR_COLORS[id].fill,
  })),
  topColors: Object.keys(TOP_COLORS).map((id) => ({
    id,
    label: TOP_COLORS[id].label,
    color: TOP_COLORS[id].fill,
  })),
  backgroundColors: Object.keys(BACKGROUND_COLORS).map((id) => ({
    id,
    label: BACKGROUND_COLORS[id].label,
    color: BACKGROUND_COLORS[id].fill,
  })),
};
