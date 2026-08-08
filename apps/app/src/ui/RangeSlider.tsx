import React, { useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import { tokens } from '@rentqil/shared';

interface Props {
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
}

// two handle range slider, drag either knob to pick a price window
export function RangeSlider({ min, max, step, valueMin, valueMax, onChange }: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  // live values during a drag, committed through onChange as they move
  const valuesRef = useRef({ lo: valueMin, hi: valueMax });
  valuesRef.current = { lo: valueMin, hi: valueMax };
  // where the knob stood when the finger grabbed it, dx is relative to that
  const grabRef = useRef({ lo: valueMin, hi: valueMax });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const span = Math.max(max - min, 1);
  // the responders are created once, refs keep their math current
  const boundsRef = useRef({ min, max, step, span });
  boundsRef.current = { min, max, step, span };

  const toX = (v: number) => ((v - min) / span) * width;
  const clampStep = (v: number) => {
    const b = boundsRef.current;
    const snapped = Math.round((v - b.min) / b.step) * b.step + b.min;
    return Math.min(Math.max(snapped, b.min), b.max);
  };

  const makeResponder = (knob: 'lo' | 'hi') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        grabRef.current = { ...valuesRef.current };
      },
      onPanResponderMove: (_evt, gesture) => {
        const w = widthRef.current;
        if (w <= 0) return;
        const b = boundsRef.current;
        const startValue = knob === 'lo' ? grabRef.current.lo : grabRef.current.hi;
        const raw = startValue + (gesture.dx / w) * b.span;
        const next = clampStep(raw);
        const { lo, hi } = valuesRef.current;
        if (knob === 'lo') {
          const bounded = Math.min(next, hi - b.step);
          if (bounded !== lo) onChangeRef.current(bounded, hi);
        } else {
          const bounded = Math.max(next, lo + b.step);
          if (bounded !== hi) onChangeRef.current(lo, bounded);
        }
      },
    });

  // responders survive rerenders, the refs feed them fresh values
  const loResponder = useRef(makeResponder('lo')).current;
  const hiResponder = useRef(makeResponder('hi')).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const inner = Math.max(e.nativeEvent.layout.width - 14, 0);
    setWidth(inner);
    widthRef.current = inner;
  };

  const knobStyle = {
    position: 'absolute' as const,
    top: -6,
    width: 14,
    height: 14,
    backgroundColor: tokens.colors.text,
    marginLeft: -7,
  };

  return (
    <View onLayout={onLayout} style={{ height: 16, justifyContent: 'center', paddingHorizontal: 7 }}>
      <View style={{ height: 2, backgroundColor: tokens.colors.gray300 }} />
      {width > 0 ? (
        <>
          <View
            style={{
              position: 'absolute',
              left: toX(valueMin) + 7,
              width: Math.max(toX(valueMax) - toX(valueMin), 0),
              height: 2,
              backgroundColor: tokens.colors.text,
            }}
          />
          <View {...loResponder.panHandlers} style={[knobStyle, { left: toX(valueMin) + 7 }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} />
          <View {...hiResponder.panHandlers} style={[knobStyle, { left: toX(valueMax) + 7 }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} />
        </>
      ) : null}
    </View>
  );
}
