import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  product: any;
  quantity: number;
  subtotal: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: any) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product) => {
        set((state) => {
          const existingItem = state.items.find(item => item.product.id === product.id);
          if (existingItem) {
            return {
              items: state.items.map(item =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.product.price }
                  : item
              )
            };
          } else {
            return {
              items: [...state.items, { product, quantity: 1, subtotal: product.price }]
            };
          }
        });
      },
      
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(item => item.product.id !== productId)
        }));
      },
      
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          set((state) => ({
            items: state.items.filter(item => item.product.id !== productId)
          }));
        } else {
          set((state) => ({
            items: state.items.map(item =>
              item.product.id === productId
                ? { ...item, quantity, subtotal: quantity * item.product.price }
                : item
            )
          }));
        }
      },
      
      clearCart: () => {
        set({ items: [] });
      },
      
      getSubtotal: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.subtotal, 0);
      },
      
      getTax: () => {
        const state = get();
        const subtotal = state.items.reduce((total, item) => total + item.subtotal, 0);
        return subtotal * 0.05; // 5% tax
      },
      
      getTotal: () => {
        const state = get();
        const subtotal = state.items.reduce((total, item) => total + item.subtotal, 0);
        const tax = subtotal * 0.05; // 5% tax
        return subtotal + tax;
      }
    }),
    {
      name: 'cart-storage',
      getStorage: () => localStorage,
    }
  )
);
