import { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);

    const addToCart = (product, quantity = 1) => {
        setCart((prevCart) => {
            // Check if the item is already in the cart
            const existingItemIndex = prevCart.findIndex(item => item._id === product._id);

            if (existingItemIndex > -1) {
                // If it exists, update the quantity of that specific item
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex].quantity += quantity;
                return updatedCart;
            } else {
                // If it's new, add it with the initial quantity
                return [...prevCart, { ...product, quantity }];
            }
        });
    };

    const removeFromCart = (productId) => {
        setCart((prevCart) => prevCart.filter(item => item._id !== productId));
    };

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);