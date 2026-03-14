import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, Product } from "./supabase";
import { formatCurrency } from "./currency";

interface CartStore {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
  getFormattedSubtotal: () => string;
  getFormattedTax: () => string;
  getFormattedTotal: () => string;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product) => {
        const items = get().items;
        const existingItem = items.find(
          (item) => item.product.id === product.id,
        );

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.product.id === product.id
                ? {
                    ...item,
                    quantity: item.quantity + 1,
                    subtotal: (item.quantity + 1) * item.product.price,
                  }
                : item,
            ),
          });
        } else {
          set({
            items: [
              ...items,
              { product, quantity: 1, subtotal: product.price },
            ],
          });
        }
      },

      removeItem: (productId: string) => {
        set({
          items: get().items.filter((item) => item.product.id !== productId),
        });
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.product.id === productId
              ? { ...item, quantity, subtotal: quantity * item.product.price }
              : item,
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.subtotal, 0);
      },

      getTax: () => {
        return get().getSubtotal() * 0.05; // 5% tax
      },

      getTotal: () => {
        return get().getSubtotal() + get().getTax();
      },

      getFormattedSubtotal: () => {
        return formatCurrency(get().getSubtotal());
      },

      getFormattedTax: () => {
        return formatCurrency(get().getTax());
      },

      getFormattedTotal: () => {
        return formatCurrency(get().getTotal());
      },
    }),
    {
      name: "onyxx-pos-cart",
    },
  ),
);

// Auth store with real session management
import { supabase } from "./supabase";

interface AuthStore {
  user: { id: string; name: string; email: string; role: string } | null;
  isAuthenticated: boolean;
  login: (user: {
    id: string;
    name: string;
    email: string;
    role: string;
  }) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  initAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: (user) => set({ user, isAuthenticated: true }),
      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          const { data: userProfile } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (userProfile) {
            set({
              user: {
                id: userProfile.id,
                name: userProfile.name,
                email: userProfile.email,
                role: userProfile.role,
              },
              isAuthenticated: true,
            });
          }
        }
      },

      initAuth: () => {
        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === "SIGNED_IN") {
            const { data: userProfile } = await supabase
              .from("users")
              .select("*")
              .eq("id", session!.user.id)
              .single();

            if (userProfile) {
              set({
                user: {
                  id: userProfile.id,
                  name: userProfile.name,
                  email: userProfile.email,
                  role: userProfile.role,
                },
                isAuthenticated: true,
              });
            }
          } else if (event === "SIGNED_OUT") {
            set({ user: null, isAuthenticated: false });
          }
        });

        // Check current session
        get().checkAuth();
      },
    }),
    {
      name: "onyxx-pos-auth",
    },
  ),
);

// Offline sales store
interface OfflineSale {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  cashierId: string;
  cashierName: string;
  timestamp: string;
}

interface OfflineStore {
  pendingSales: OfflineSale[];
  addPendingSale: (sale: OfflineSale) => void;
  removePendingSale: (id: string) => void;
  clearPendingSales: () => void;
}

export const useOfflineStore = create<OfflineStore>()(
  persist(
    (set) => ({
      pendingSales: [],

      addPendingSale: (sale) =>
        set({ pendingSales: [...get().pendingSales, sale] }),
      removePendingSale: (id) =>
        set({ pendingSales: get().pendingSales.filter((s) => s.id !== id) }),
      clearPendingSales: () => set({ pendingSales: [] }),
    }),
    {
      name: "onyxx-pos-offline",
    },
  ),
);

function get() {
  return useOfflineStore.getState();
}
