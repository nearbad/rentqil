import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { tokens } from '@rentqil/shared';
import { AppText } from './AppText';
import { hardShadow } from './shadow';

interface Props {
  renderTrigger: (open: () => void) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  menuWidth?: number;
  align?: 'left' | 'right';
}

// dropdown panel anchored to its trigger on every screen size
export function Popover({ renderTrigger, children, menuWidth = 260, align = 'left' }: Props) {
  const anchorRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const { width: winW, height: winH } = useWindowDimensions();
  // the panel never gets wider than the screen minus the side margins
  const panelW = Math.min(menuWidth, winW - 16);

  const open = () => {
    anchorRef.current?.measureInWindow((x, y, w, h) => {
      const wanted = align === 'right' ? x + w - panelW : x;
      const left = Math.max(8, Math.min(wanted, winW - panelW - 8));
      const below = winH - (y + h) - 16;
      const above = y - 16;
      // open downward when it fits, otherwise flip above the trigger
      if (below >= 220 || below >= above) {
        setPos({ top: y + h + 6, left, maxHeight: Math.min(380, Math.max(below, 140)) });
      } else {
        const maxHeight = Math.min(380, above);
        setPos({ top: Math.max(8, y - 6 - maxHeight), left, maxHeight });
      }
      setVisible(true);
    });
  };

  const close = () => setVisible(false);

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        {renderTrigger(open)}
      </View>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={{ flex: 1 }} onPress={close}>
          {pos ? (
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: pos.top,
                left: pos.left,
                width: panelW,
                backgroundColor: tokens.colors.white,
                borderWidth: tokens.border,
                borderColor: tokens.colors.text,
                maxHeight: pos.maxHeight,
                overflow: 'hidden',
                ...hardShadow('md'),
              }}
            >
              <ScrollView contentContainerStyle={{ padding: tokens.spacing.xs }}>{children(close)}</ScrollView>
            </Pressable>
          ) : null}
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
