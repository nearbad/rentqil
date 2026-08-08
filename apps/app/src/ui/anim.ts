// react native web turns dataSet into data-* attributes which our global
// css targets for hover transitions. Native ignores the prop, and the rn
// types do not know it, hence the loose record type for spreading.
export const animProps = { dataSet: { anim: 'true' } } as Record<string, unknown>;
