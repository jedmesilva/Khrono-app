import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type CardBandeira = "Visa" | "Mastercard";

export type Card = {
  id: string;
  bandeira: CardBandeira;
  numero: string;
  titular: string;
  validade: string;
  padrao: boolean;
};

type CardsContextType = {
  cards: Card[];
  addCard: (card: Omit<Card, "id" | "padrao">) => void;
  removeCard: (id: string) => void;
  setDefault: (id: string) => void;
};

const CardsContext = createContext<CardsContextType | null>(null);

const STORAGE_KEY = "krono_cards";

const INITIAL_CARDS: Card[] = [
  {
    id: "card-1",
    bandeira: "Visa",
    numero: "4532",
    titular: "Carlos Mendes",
    validade: "12/27",
    padrao: true,
  },
  {
    id: "card-2",
    bandeira: "Mastercard",
    numero: "5891",
    titular: "Carlos Mendes",
    validade: "08/26",
    padrao: false,
  },
];

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = useState<Card[]>(INITIAL_CARDS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCards(parsed);
          }
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    }
  }, [cards, loaded]);

  const addCard = useCallback((card: Omit<Card, "id" | "padrao">) => {
    const id =
      Date.now().toString() + Math.random().toString(36).substring(2, 9);
    setCards((prev) => {
      const isFirst = prev.length === 0;
      return [...prev, { ...card, id, padrao: isFirst }];
    });
  }, []);

  const removeCard = useCallback((id: string) => {
    setCards((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      const hadDefault = prev.find((c) => c.id === id)?.padrao ?? false;
      if (hadDefault && filtered.length > 0) {
        filtered[0] = { ...filtered[0], padrao: true };
      }
      return filtered;
    });
  }, []);

  const setDefault = useCallback((id: string) => {
    setCards((prev) => prev.map((c) => ({ ...c, padrao: c.id === id })));
  }, []);

  return (
    <CardsContext.Provider value={{ cards, addCard, removeCard, setDefault }}>
      {children}
    </CardsContext.Provider>
  );
}

export function useCards() {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error("useCards must be used within CardsProvider");
  return ctx;
}
