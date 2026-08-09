import React, { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { tokens } from '@rentqil/shared';

// horizontal row that says out loud that it scrolls: an arrow button sits on
// the edge whenever there is more content that way. Phones have no scrollbar
// and a row of chips cut off by the screen edge reads as the end of the list.

const STEP = 160;
const EDGE = 2;

interface Props {
  children: React.ReactNode;
  contentStyle?: ViewStyle;
}

export function HScroll({ children, contentStyle }: Props) {
  const ref = useRef<ScrollView>(null);
  const [offset, setOffset] = useState(0);
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);

  const maxOffset = Math.max(0, content - viewport);
  const canLeft = offset > EDGE;
  const canRight = offset < maxOffset - EDGE;

  const scrollBy = (delta: number) => {
    const next = Math.min(Math.max(offset + delta, 0), maxOffset);
    ref.current?.scrollTo({ x: next, animated: true });
  };

  const arrow = (side: 'left' | 'right') => (
    <View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        // the plain background hides the chip sliding under the button
        backgroundColor: tokens.colors.bg,
        ...(side === 'right'
          ? { right: 0, paddingLeft: tokens.spacing.sm }
          : { left: 0, paddingRight: tokens.spacing.sm }),
      }}
    >
      <Pressable
        onPress={() => scrollBy(side === 'right' ? STEP : -STEP)}
        style={{
          width: 26,
          height: 26,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: tokens.border,
          borderColor: tokens.colors.text,
          backgroundColor: tokens.colors.white,
        }}
      >
        {side === 'right' ? (
          <ChevronRight size={15} color={tokens.colors.text} strokeWidth={2} />
        ) : (
          <ChevronLeft size={15} color={tokens.colors.text} strokeWidth={2} />
        )}
      </Pressable>
    </View>
  );

  return (
    <View>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => setOffset(e.nativeEvent.contentOffset.x)}
        onLayout={(e) => setViewport(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContent(w)}
        contentContainerStyle={contentStyle}
      >
        {children}
      </ScrollView>
      {canLeft ? arrow('left') : null}
      {canRight ? arrow('right') : null}
    </View>
  );
}
