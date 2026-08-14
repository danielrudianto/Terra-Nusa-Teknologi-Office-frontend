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
  { fill: string; shade: string; labelKey: string }
> = {
  'tone-01': { fill: '#f6d9c3', shade: '#e8c3a6', labelKey: 'avatarBuilder.tone01' },
  'tone-02': { fill: '#eec4a4', shade: '#dbab86', labelKey: 'avatarBuilder.tone02' },
  'tone-03': { fill: '#dda87e', shade: '#c68e62', labelKey: 'avatarBuilder.tone03' },
  'tone-04': { fill: '#c08152', shade: '#a46a3e', labelKey: 'avatarBuilder.tone04' },
  'tone-05': { fill: '#96603a', shade: '#7c4c2b', labelKey: 'avatarBuilder.tone05' },
  'tone-06': { fill: '#6b432a', shade: '#54331f', labelKey: 'avatarBuilder.tone06' },
};

export const HAIR_COLORS: Record<string, { fill: string; labelKey: string }> = {
  'hair-black': { fill: '#2b2b33', labelKey: 'avatarBuilder.hairBlack' },
  'hair-brown': { fill: '#5a3a24', labelKey: 'avatarBuilder.hairBrown' },
  'hair-chestnut': { fill: '#8a5330', labelKey: 'avatarBuilder.hairChestnut' },
  'hair-blonde': { fill: '#d9a441', labelKey: 'avatarBuilder.hairBlonde' },
  'hair-red': { fill: '#a8412a', labelKey: 'avatarBuilder.hairRed' },
  'hair-gray': { fill: '#9aa1ad', labelKey: 'avatarBuilder.hairGray' },
};

export const TOP_COLORS: Record<
  string,
  { fill: string; shade: string; labelKey: string }
> = {
  'top-blue': { fill: '#154dec', shade: '#0f3bb8', labelKey: 'avatarBuilder.topBlue' },
  'top-indigo': { fill: '#5b3df5', shade: '#4830c4', labelKey: 'avatarBuilder.topIndigo' },
  'top-teal': { fill: '#0d9488', shade: '#0a746b', labelKey: 'avatarBuilder.topTeal' },
  'top-green': { fill: '#15803d', shade: '#106430', labelKey: 'avatarBuilder.topGreen' },
  'top-amber': { fill: '#b45309', shade: '#8d4107', labelKey: 'avatarBuilder.topAmber' },
  'top-rose': { fill: '#be123c', shade: '#960e30', labelKey: 'avatarBuilder.topRose' },
  'top-slate': { fill: '#475569', shade: '#374151', labelKey: 'avatarBuilder.topSlate' },
};

export const BACKGROUND_COLORS: Record<
  string,
  { fill: string; labelKey: string }
> = {
  'bg-blue': { fill: '#e7ecfb', labelKey: 'avatarBuilder.bgBlue' },
  'bg-indigo': { fill: '#ece8fe', labelKey: 'avatarBuilder.bgIndigo' },
  'bg-teal': { fill: '#dcf5f2', labelKey: 'avatarBuilder.bgTeal' },
  'bg-green': { fill: '#e2f5e9', labelKey: 'avatarBuilder.bgGreen' },
  'bg-amber': { fill: '#fdefdc', labelKey: 'avatarBuilder.bgAmber' },
  'bg-rose': { fill: '#fde7ec', labelKey: 'avatarBuilder.bgRose' },
  'bg-slate': { fill: '#eef1f5', labelKey: 'avatarBuilder.bgSlate' },
};

/* ===================== parts ===================== */
/* Each part is a function of the resolved colours so shading stays consistent. */

type SkinArgs = { fill: string; shade: string };
type HairArgs = { fill: string };
type TopArgs = { fill: string; shade: string };

export const FACES: Record<
  string,
  { labelKey: string; draw: (c: SkinArgs) => string }
> = {
  'face-01': {
    labelKey: 'avatarBuilder.face01',
    draw: (c) => `<ellipse cx="50" cy="43" rx="20" ry="21" fill="${c.fill}"/>`,
  },
  'face-02': {
    labelKey: 'avatarBuilder.face02',
    draw: (c) => `<ellipse cx="50" cy="43" rx="18" ry="23" fill="${c.fill}"/>`,
  },
  'face-03': {
    labelKey: 'avatarBuilder.face03',
    draw: (c) =>
      `<rect x="31" y="22" width="38" height="42" rx="15" fill="${c.fill}"/>`,
  },
  'face-04': {
    labelKey: 'avatarBuilder.face04',
    draw: (c) =>
      `<path d="M30 36c0-9 9-15 20-15s20 6 20 15c0 13-9 28-20 28S30 49 30 36z" fill="${c.fill}"/>`,
  },
};

export const HAIRS: Record<
  string,
  { labelKey: string; draw: (c: HairArgs) => string }
> = {
  'hair-00': { labelKey: 'avatarBuilder.hair00', draw: () => '' },
  'hair-01': {
    labelKey: 'avatarBuilder.hair01',
    draw: (c) =>
      `<path d="M29 40c0-14 9-22 21-22s21 8 21 22c0-6-3-9-6-10-4 2-9 3-15 3-7 0-13-1-16-4-3 2-5 5-5 11z" fill="${c.fill}"/>`,
  },
  'hair-02': {
    labelKey: 'avatarBuilder.hair02',
    draw: (c) =>
      `<path d="M28 42c0-16 10-24 22-24s22 8 22 24v22c0 3-3 5-6 4-2-1-3-3-3-6V38c-4 3-8 4-13 4s-9-1-13-4v24c0 3-1 5-3 6-3 1-6-1-6-4z" fill="${c.fill}"/>`,
  },
  'hair-03': {
    labelKey: 'avatarBuilder.hair03',
    draw: (c) =>
      `<circle cx="50" cy="15" r="7" fill="${c.fill}"/><path d="M29 41c0-14 9-22 21-22s21 8 21 22c0-6-3-10-6-11-4 2-9 3-15 3s-11-1-15-3c-3 1-6 5-6 11z" fill="${c.fill}"/>`,
  },
  'hair-04': {
    labelKey: 'avatarBuilder.hair04',
    draw: (c) =>
      `<path d="M29 42c-2-6 0-11 4-13-1-6 4-11 10-11 3-2 11-2 14 0 6 0 11 5 10 11 4 2 6 7 4 13-1-5-4-8-7-9-4 2-9 3-14 3s-10-1-14-3c-3 1-6 4-7 9z" fill="${c.fill}"/><circle cx="33" cy="30" r="6" fill="${c.fill}"/><circle cx="67" cy="30" r="6" fill="${c.fill}"/><circle cx="50" cy="21" r="7" fill="${c.fill}"/>`,
  },
  'hair-05': {
    labelKey: 'avatarBuilder.hair05',
    draw: (c) =>
      `<path d="M29 41c0-14 9-23 21-23 7 0 13 3 17 9-6-1-16 2-24 7-4 2-8 4-9 9-2-1-4 0-5-2z" fill="${c.fill}"/>`,
  },
  'hair-06': {
    labelKey: 'avatarBuilder.hair06',
    draw: (c) =>
      `<path d="M30 41c0-13 9-23 20-23s20 9 20 22c0-4-2-7-5-8-4 2-9 3-15 3-6 0-11-1-15-3-3 1-5 4-5 9z" fill="${c.fill}"/><path d="M30 41c0-3 1-6 3-8 1 6 2 9 3 11-2 0-4-1-6-3zm40 0c0-3-1-6-3-8-1 6-2 9-3 11 2 0 4-1 6-3z" fill="${c.fill}" opacity="0.45"/>`,
  },
  'hair-07': {
    labelKey: 'avatarBuilder.hair07',
    draw: (c) =>
      `<path d="M32 40c0-12 8-22 18-22 7 0 13 4 16 10 2 4 2 8 2 12-1-4-3-7-6-8-4 2-9 3-15 3-6 0-11-1-14-3-1 2-1 5-1 8z" fill="${c.fill}"/><path d="M46 18c6-3 13-1 17 4-5-2-11-3-17-4z" fill="${c.fill}"/><path d="M32 40c0-2 0-4 1-6 1 5 2 8 3 10-2 0-3-2-4-4zm36 0c0-2 0-4-1-6-1 5-2 8-3 10 2 0 3-2 4-4z" fill="${c.fill}" opacity="0.45"/>`,
  },
  'hair-08': {
    labelKey: 'avatarBuilder.hair08',
    draw: (c) =>
      `<path d="M31 42c0-13 8-23 19-23s19 10 19 23c0-5-2-8-5-9-4 2-9 3-14 3s-10-1-14-3c-3 1-5 4-5 9z" fill="${c.fill}" opacity="0.85"/>`,
  },
  'hair-09': {
    labelKey: 'avatarBuilder.hair09',
    draw: (c) =>
      `<path d="M30 43c-2-5 0-10 3-12-1-5 3-9 7-9 3-4 9-6 14-4 5-1 10 2 12 6 4 1 6 6 5 10 2 3 2 7 0 10 0-6-3-9-6-10-4 2-9 3-15 3-7 0-13-1-16-4-2 2-4 5-4 10z" fill="${c.fill}"/><circle cx="36" cy="27" r="4" fill="${c.fill}"/><circle cx="50" cy="21" r="5" fill="${c.fill}"/><circle cx="64" cy="27" r="4" fill="${c.fill}"/>`,
  },
  'hair-10': {
    labelKey: 'avatarBuilder.hair10',
    draw: (c) =>
      `<path d="M29 41c0-14 9-22 21-22s21 8 21 22c0-6-3-9-6-10-4 2-9 3-15 3-7 0-13-1-16-4-3 2-5 5-5 11z" fill="${c.fill}"/><circle cx="50" cy="14" r="7" fill="${c.fill}"/>`,
  },
  'hair-11': {
    labelKey: 'avatarBuilder.hair11',
    draw: (c) =>
      `<path d="M29 41c0-14 9-22 21-22s21 8 21 22c0-6-3-9-6-10-4 2-9 3-15 3-7 0-13-1-16-4-3 2-5 5-5 11z" fill="${c.fill}"/><path d="M69 34c6 3 9 10 8 17-1 5-4 9-8 11 3-4 4-9 3-14-1-6-3-10-3-14z" fill="${c.fill}"/>`,
  },
  'hair-12': {
    labelKey: 'avatarBuilder.hair12',
    draw: (c) =>
      `<path d="M28 44c0-15 10-25 22-25s22 10 22 25v10c-2-4-3-8-3-13-4 3-11 4-19 4s-15-1-19-4c0 5-1 9-3 13z" fill="${c.fill}"/>`,
  },
  'hair-13': {
    labelKey: 'avatarBuilder.hair13',
    draw: (c) =>
      `<path d="M28 44c0-16 10-25 22-25s22 9 22 25v22c-3-3-4-8-4-13-1 6-2 10-4 13 0-8-1-14-2-19-4 2-8 3-12 3s-8-1-12-3c-1 5-2 11-2 19-2-3-3-7-4-13 0 5-1 10-4 13z" fill="${c.fill}"/>`,
  },
  'hair-14': {
    labelKey: 'avatarBuilder.hair14',
    draw: (c) =>
      `<path d="M31 45c0-5 1-9 3-12 0 6 1 10 2 13-2 0-4-1-5-1zm38 0c0-5-1-9-3-12 0 6-1 10-2 13 2 0 4-1 5-1z" fill="${c.fill}"/>`,
  },
  'hijab-01': {
    labelKey: 'avatarBuilder.hijab01',
    draw: (c) =>
      `<path fill-rule="evenodd" clip-rule="evenodd" d="M26 46c0-16 11-28 24-28s24 12 24 28c0 8-2 15-5 20l-4 20H35l-4-20c-3-5-5-12-5-20z M50 22a17 19 0 0 0 0 38a17 19 0 0 0 0-38z" fill="${c.fill}"/>`,
  },
  'hijab-02': {
    labelKey: 'avatarBuilder.hijab02',
    draw: (c) =>
      `<path fill-rule="evenodd" clip-rule="evenodd" d="M26 46c0-16 11-28 24-28s24 12 24 28c0 8-2 15-5 20l-4 20H35l-4-20c-3-5-5-12-5-20z M50 22a17 19 0 0 0 0 38a17 19 0 0 0 0-38z" fill="${c.fill}"/><path fill-rule="evenodd" clip-rule="evenodd" d="M33 44c0-11 8-18 17-18s17 7 17 18c0 3-1 6-2 8H35c-1-2-2-5-2-8z M50 24a15 17 0 0 0 0 34a15 17 0 0 0 0-34z" fill="#ffffff" opacity="0.22"/>`,
  },
  'hijab-03': {
    labelKey: 'avatarBuilder.hijab03',
    draw: (c) =>
      `<path fill-rule="evenodd" clip-rule="evenodd" d="M26 46c0-16 11-28 24-28s24 12 24 28c0 8-2 15-5 20l-4 20H35l-4-20c-3-5-5-12-5-20z M50 22a17 19 0 0 0 0 38a17 19 0 0 0 0-38z" fill="${c.fill}"/><path d="M70 58c5 4 8 11 7 18-1 6-5 11-10 13 4-5 5-11 4-17-1-6-2-11-1-14z" fill="${c.fill}"/>`,
  },
  'hijab-04': {
    labelKey: 'avatarBuilder.hijab04',
    draw: (c) =>
      `<path fill-rule="evenodd" clip-rule="evenodd" d="M27 45c0-15 10-26 23-26s23 11 23 26c0 5-1 9-2 13H29c-1-4-2-8-2-13z M50 22a17 19 0 0 0 0 38a17 19 0 0 0 0-38z" fill="${c.fill}"/><path d="M27 40c8-4 15-6 23-6s15 2 23 6c-1-4-3-8-5-11-6-3-12-4-18-4s-12 1-18 4c-2 3-4 7-5 11z" fill="#ffffff" opacity="0.18"/><path d="M29 58h42l-3 8H32z" fill="${c.fill}"/>`,
  },
};

export const EYES: Record<string, { labelKey: string; draw: () => string }> = {
  'eyes-01': {
    labelKey: 'avatarBuilder.eyes01',
    draw: () =>
      `<circle cx="43" cy="43" r="2.4" fill="#2b2b33"/><circle cx="57" cy="43" r="2.4" fill="#2b2b33"/>`,
  },
  'eyes-02': {
    labelKey: 'avatarBuilder.eyes02',
    draw: () =>
      `<circle cx="43" cy="43" r="3.6" fill="#fff"/><circle cx="43" cy="43" r="2" fill="#2b2b33"/><circle cx="57" cy="43" r="3.6" fill="#fff"/><circle cx="57" cy="43" r="2" fill="#2b2b33"/>`,
  },
  'eyes-03': {
    labelKey: 'avatarBuilder.eyes03',
    draw: () =>
      `<path d="M39.5 44c1-2.6 6-2.6 7 0" stroke="#2b2b33" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M53.5 44c1-2.6 6-2.6 7 0" stroke="#2b2b33" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
  'eyes-04': {
    labelKey: 'avatarBuilder.eyes04',
    draw: () =>
      `<circle cx="43" cy="43" r="2.4" fill="#2b2b33"/><path d="M53.5 43.5c1-2.4 6-2.4 7 0" stroke="#2b2b33" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
  'eyes-05': {
    labelKey: 'avatarBuilder.eyes05',
    draw: () =>
      `<path d="M39.5 43h7" stroke="#2b2b33" stroke-width="2" stroke-linecap="round"/><path d="M53.5 43h7" stroke="#2b2b33" stroke-width="2" stroke-linecap="round"/>`,
  },
};

export const MOUTHS: Record<string, { labelKey: string; draw: () => string }> = {
  'mouth-01': {
    labelKey: 'avatarBuilder.mouth01',
    draw: () =>
      `<path d="M44 52c2 3 10 3 12 0" stroke="#5b3a2e" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
  'mouth-02': {
    labelKey: 'avatarBuilder.mouth02',
    draw: () =>
      `<path d="M45 53h10" stroke="#5b3a2e" stroke-width="2" stroke-linecap="round"/>`,
  },
  'mouth-03': {
    labelKey: 'avatarBuilder.mouth03',
    draw: () =>
      `<path d="M43 51h14c0 4-3 6.5-7 6.5S43 55 43 51z" fill="#5b3a2e"/><path d="M45 51h10v1.6H45z" fill="#fff"/>`,
  },
  'mouth-04': {
    labelKey: 'avatarBuilder.mouth04',
    draw: () =>
      `<path d="M44 53c3 2.6 8 2 11-1.6" stroke="#5b3a2e" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
  'mouth-05': {
    labelKey: 'avatarBuilder.mouth05',
    draw: () =>
      `<path d="M44 54c2-2.4 10-2.4 12 0" stroke="#5b3a2e" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
};

export const TOPS: Record<
  string,
  { labelKey: string; draw: (c: TopArgs) => string }
> = {
  'top-01': {
    labelKey: 'avatarBuilder.top01',
    draw: (c) =>
      `<path d="M26 100c0-13 10-22 24-22s24 9 24 22z" fill="${c.fill}"/><path d="M43 79c2 4 12 4 14 0" stroke="${c.shade}" stroke-width="2" fill="none"/>`,
  },
  'top-02': {
    labelKey: 'avatarBuilder.top02',
    draw: (c) =>
      `<path d="M26 100c0-13 10-22 24-22s24 9 24 22z" fill="${c.fill}"/><path d="M44 78l6 8 6-8 5 2-11 12-11-12z" fill="#fff"/>`,
  },
  'top-03': {
    labelKey: 'avatarBuilder.top03',
    draw: (c) =>
      `<path d="M26 100c0-13 10-22 24-22s24 9 24 22z" fill="${c.fill}"/><path d="M41 78c3 6 15 6 18 0l4 2c-4 8-22 8-26 0z" fill="${c.shade}"/><rect x="48" y="86" width="4" height="12" rx="2" fill="${c.shade}"/>`,
  },
  'top-04': {
    labelKey: 'avatarBuilder.top04',
    draw: (c) =>
      `<path d="M26 100c0-13 10-22 24-22s24 9 24 22z" fill="${c.fill}"/><path d="M44 78L50 92 56 78l4 1-8 21h-4l-8-21z" fill="#fff"/><path d="M40 80l10 12-3 8-9-18z" fill="${c.shade}"/><path d="M60 80L50 92l3 8 9-18z" fill="${c.shade}"/>`,
  },
  'top-05': {
    labelKey: 'avatarBuilder.top05',
    draw: (c) =>
      `<path d="M26 100c0-13 10-22 24-22s24 9 24 22z" fill="${c.fill}"/><path d="M42 79l8 9 8-9 3 1-6 20h-10l-6-20z" fill="${c.shade}"/>`,
  },
};

export const ACCESSORIES: Record<
  string,
  { labelKey: string; draw: () => string }
> = {
  'glasses-01': {
    labelKey: 'avatarBuilder.glasses01',
    draw: () =>
      `<g fill="none" stroke="#2b2b33" stroke-width="1.8"><circle cx="43" cy="43" r="6"/><circle cx="57" cy="43" r="6"/><path d="M49 43h2M31 41l6 1M69 41l-6 1"/></g>`,
  },
  'glasses-02': {
    labelKey: 'avatarBuilder.glasses02',
    draw: () =>
      `<g fill="none" stroke="#2b2b33" stroke-width="1.8"><rect x="36.5" y="38.5" width="12" height="9" rx="2"/><rect x="51.5" y="38.5" width="12" height="9" rx="2"/><path d="M48.5 43h3M31 41l5.5 1M69 41l-5.5 1"/></g>`,
  },
  'shades-01': {
    labelKey: 'avatarBuilder.shades01',
    draw: () =>
      `<g><rect x="36" y="38" width="13" height="9" rx="3" fill="#2b2b33"/><rect x="51" y="38" width="13" height="9" rx="3" fill="#2b2b33"/><path d="M49 42h2M31 40l5 1M69 40l-5 1" stroke="#2b2b33" stroke-width="1.8" fill="none"/></g>`,
  },
  'earrings-01': {
    labelKey: 'avatarBuilder.earrings01',
    draw: () =>
      `<circle cx="30" cy="47" r="2.2" fill="#d9a441"/><circle cx="70" cy="47" r="2.2" fill="#d9a441"/>`,
  },
  'glasses-03': {
    labelKey: 'avatarBuilder.glasses03',
    draw: () =>
      `<g fill="none" stroke="#6b7280" stroke-width="1.1"><path d="M37 39h11v8H37zM52 39h11v8H52z" opacity="0.55"/><path d="M48 43h4M37 41l-6-1M63 41l6-1"/></g><g fill="#cfd6e4" opacity="0.28"><rect x="37" y="39" width="11" height="8"/><rect x="52" y="39" width="11" height="8"/></g>`,
  },
  'glasses-04': {
    labelKey: 'avatarBuilder.glasses04',
    draw: () =>
      `<g fill="none" stroke="#2b2b33" stroke-width="1.6"><path d="M36 39h13v4a6 6 0 0 1-13 0z"/><path d="M51 39h13v4a6 6 0 0 1-13 0z"/><path d="M49 41h2M36 40l-5-1M64 40l5-1"/></g>`,
  },
  'glasses-05': {
    labelKey: 'avatarBuilder.glasses05',
    draw: () =>
      `<g fill="none" stroke="#9aa1ad" stroke-width="1.3"><circle cx="42" cy="43" r="6.5"/><circle cx="58" cy="43" r="6.5"/><path d="M48.5 43h3M35.5 42l-4.5-1M64.5 42l4.5-1"/></g>`,
  },
  'glasses-06': {
    labelKey: 'avatarBuilder.glasses06',
    draw: () =>
      `<g fill="none" stroke="#16181d" stroke-width="3"><rect x="35.5" y="38" width="13" height="10" rx="2.5"/><rect x="51.5" y="38" width="13" height="10" rx="2.5"/><path d="M48.5 43h3M35.5 41l-5-1M64.5 41l5-1"/></g>`,
  },
  'shades-02': {
    labelKey: 'avatarBuilder.shades02',
    draw: () =>
      `<g stroke="#4b5563" stroke-width="1.3" fill="#374151" opacity="0.9"><path d="M35 40h13l-2 8a4.5 4.5 0 0 1-9 0z"/><path d="M52 40h13l-2 8a4.5 4.5 0 0 1-9 0z"/></g><path d="M48 41h4" stroke="#4b5563" stroke-width="1.3" fill="none"/>`,
  },
  'earrings-02': {
    labelKey: 'avatarBuilder.earrings02',
    draw: () =>
      `<g fill="none" stroke="#e0b64a" stroke-width="1.6"><circle cx="30" cy="49" r="3.5"/><circle cx="70" cy="49" r="3.5"/></g>`,
  },
  'mask-01': {
    labelKey: 'avatarBuilder.mask01',
    draw: () =>
      `<path d="M36 48c4 2 9 3 14 3s10-1 14-3c0 8-6 14-14 14s-14-6-14-14z" fill="#dbeafe" stroke="#93b4d8" stroke-width="1"/><path d="M36 50l-6-3M64 50l6-3" stroke="#93b4d8" stroke-width="1.2" fill="none"/>`,
  },
  'safety-01': {
    labelKey: 'avatarBuilder.safety01',
    draw: () =>
      `<path d="M27 40c0-13 10-22 23-22s23 9 23 22z" fill="#f59e0b"/><path d="M24 40h52v3H24z" fill="#d97706"/><path d="M46 19h8v20h-8z" fill="#d97706" opacity="0.5"/>`,
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
/**
 * Daftar pilihan untuk pembangun avatar.
 *
 * Yang dibawa adalah `labelKey`, bukan teksnya. Penerjemahan dilakukan di
 * template lewat pipe, sehingga daftar ini tidak perlu dirakit ulang setiap
 * kali bahasanya diganti.
 */
export const AVATAR_OPTIONS = {
  faces: Object.keys(FACES).map((id) => ({ id, labelKey: FACES[id].labelKey })),
  hairs: Object.keys(HAIRS).map((id) => ({ id, labelKey: HAIRS[id].labelKey })),
  eyes: Object.keys(EYES).map((id) => ({ id, labelKey: EYES[id].labelKey })),
  mouths: Object.keys(MOUTHS).map((id) => ({ id, labelKey: MOUTHS[id].labelKey })),
  tops: Object.keys(TOPS).map((id) => ({ id, labelKey: TOPS[id].labelKey })),
  accessories: [
    { id: '', labelKey: 'avatarBuilder.none' },
    ...Object.keys(ACCESSORIES).map((id) => ({
      id,
      labelKey: ACCESSORIES[id].labelKey,
    })),
  ],
  skinTones: Object.keys(SKIN_TONES).map((id) => ({
    id,
    labelKey: SKIN_TONES[id].labelKey,
    color: SKIN_TONES[id].fill,
  })),
  hairColors: Object.keys(HAIR_COLORS).map((id) => ({
    id,
    labelKey: HAIR_COLORS[id].labelKey,
    color: HAIR_COLORS[id].fill,
  })),
  topColors: Object.keys(TOP_COLORS).map((id) => ({
    id,
    labelKey: TOP_COLORS[id].labelKey,
    color: TOP_COLORS[id].fill,
  })),
  backgroundColors: Object.keys(BACKGROUND_COLORS).map((id) => ({
    id,
    labelKey: BACKGROUND_COLORS[id].labelKey,
    color: BACKGROUND_COLORS[id].fill,
  })),
};

