import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { tokens } from '@rentqil/shared';
import { AppText } from './AppText';

interface Props {
  renderTrigger: (open: () => void) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  menuWidth?: number;
  align?: 'left' | 'right';
}

// anchored dropdown panel on desktop, bottom sheet on small screens
export function Popover({ renderTrigger, children, menuWidth = 260, align = 'left' }: Props) {
  const anchorRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const { width: winW } = useWindowDimensions();
  const desktop = winW >= tokens.breakpointDesktop;

  const open = () => {
    if (!desktop) {
      setPos(null);
      setVisible(true);
      return;
    }
    anchorRef.current?.measureInWindow((x, y, w, h) => {
      const wanted = align === 'right' ? x + w - menuWidth : x;
      setPos({
        top: y + h + 6,
        left: Math.max(8, Math.min(wanted, winW - menuWidth - 8)),
      });
      setVisible(true);
    });
  };

  const close = () => setVisible(false);

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        {renderTrigger(open)}
      </View>
      <Modal visible={visible} transparent animationType={desktop ? 'fade' : 'slide'} onRequestClose={close}>
        <Pressable
          style={{ flex: 1, backgroundColor: desktop ? 'transparent' : 'rgba(10,10,10,0.4)' }}
          onPress={close}
        >
          {desktop && pos ? (
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: pos.top,
                left: pos.left,
                width: menuWidth,
                backgroundColor: tokens.colors.white,
                borderWidth: 1,
                borderColor: tokens.colors.gray150,
                borderRadius: tokens.radius.md,
                maxHeight: 380,
                overflow: 'hidden',
              }}
            >
              <ScrollView contentContainerStyle={{ padding: tokens.spacing.xs }}>{children(close)}</ScrollView>
            </Pressable>
          ) : (
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                marginTop: 'auto',
                backgroundColor: tokens.colors.white,
                borderTopLeftRadius: tokens.radius.lg,
                borderTopRightRadius: tokens.radius.lg,
                maxHeight: '70%',
                width: '100%',
                maxWidth: tokens.maxContentWidth,
                alignSelf: 'center',
              }}
            >
              <ScrollView contentContainerStyle={{ padding: tokens.spacing.sm }}>{children(close)}</ScrollView>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

export function MenuItem({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: { hovered?: boolean }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.spacing.sm,
        paddingVertical: 11,
        paddingHorizontal: tokens.spacing.md,
        borderRadius: tokens.radius.sm,
        backgroundColor: selected ? tokens.colors.gray50 : hovered ? tokens.colors.gray50 : tokens.colors.white,
      })}
    >
      {icon}
      <AppText style={{ flex: 1 }} weight={selected ? 'semibold' : 'regular'}>
        {label}
      </AppText>
    </Pressable>
  );
}
