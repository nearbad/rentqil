// react native web turns dataSet into data-* attributes which our global
// css targets for hover transitions. Native ignores the prop, and the rn
// types do not know it, hence the loose record type for spreading.
export const animProps = { dataSet: { anim: 'true' } } as Record<string, unknown>;

// the wordmark keeps breathing so the header is never fully static:
// the whole word swells a little, the bang pulses harder on the same beat
export const breatheProps = { dataSet: { breathe: 'true' } } as Record<string, unknown>;
export const pulseProps = { dataSet: { pulse: 'true' } } as Record<string, unknown>;
