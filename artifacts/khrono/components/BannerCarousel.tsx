import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

export type Banner = {
  id: string;
  tag?: string;
  title: string;
  subtitle: string;
  cta?: string;
  accent: string;
  onPress?: () => void;
};

type Props = {
  banners: Banner[];
  autoScrollInterval?: number;
  style?: object;
};

export function BannerCarousel({ banners, autoScrollInterval = 4000, style }: Props) {
  const { colors } = useTheme();
  const flatRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [itemWidth, setItemWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeIndexRef = useRef(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setItemWidth(e.nativeEvent.layout.width);
  }, []);

  const scrollTo = useCallback(
    (index: number) => {
      if (!flatRef.current || itemWidth === 0) return;
      flatRef.current.scrollToOffset({ offset: index * itemWidth, animated: true });
    },
    [itemWidth]
  );

  const startTimer = useCallback(() => {
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      const next = (activeIndexRef.current + 1) % banners.length;
      activeIndexRef.current = next;
      setActiveIndex(next);
      scrollTo(next);
    }, autoScrollInterval);
  }, [banners.length, autoScrollInterval, scrollTo]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      const i = viewableItems[0].index;
      activeIndexRef.current = i;
      setActiveIndex(i);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  if (banners.length === 0) return null;

  return (
    <View style={style} onLayout={onLayout}>
      <FlatList
        ref={flatRef}
        data={banners}
        keyExtractor={(b) => b.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScrollBeginDrag={resetTimer}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: itemWidth,
          offset: itemWidth * index,
          index,
        })}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.banner, { width: itemWidth, backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={item.onPress}
            disabled={!item.onPress}
          >
            {item.tag && (
              <View style={[styles.tag, { backgroundColor: item.accent + "20", borderColor: item.accent + "40" }]}>
                <Text style={[styles.tagText, { color: item.accent }]}>{item.tag}</Text>
              </View>
            )}
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{item.subtitle}</Text>
            {item.cta && (
              <View style={[styles.ctaRow]}>
                <Text style={[styles.ctaText, { color: item.accent }]}>{item.cta}</Text>
                <Text style={[styles.ctaArrow, { color: item.accent }]}>→</Text>
              </View>
            )}
            <View style={[styles.accentBar, { backgroundColor: item.accent }]} />
          </Pressable>
        )}
      />

      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => {
                scrollTo(i);
                activeIndexRef.current = i;
                setActiveIndex(i);
                resetTimer();
              }}
              hitSlop={6}
            >
              <View
                style={[
                  styles.dot,
                  i === activeIndex
                    ? { backgroundColor: "#ff6b35", width: 16 }
                    : { backgroundColor: colors.surfaceBorder, width: 6 },
                ]}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    minHeight: 130,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  tag: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  tagText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "Sora_700Bold",
    fontSize: 16,
    marginBottom: 6,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    lineHeight: 17,
    maxWidth: "85%",
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
  },
  ctaText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 12,
  },
  ctaArrow: {
    fontFamily: "DMMono_500Medium",
    fontSize: 13,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
