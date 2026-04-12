// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import { CustomerProvider } from './context/CustomerContext';
import { FavoritesProvider } from './context/FavoritesContext';
import './styles/index.css';

// One-time cleanup of demo/test data
if (!localStorage.getItem('savit_data_v1_cleaned')) {
  ['savit_demo_products', 'savit_demo_orders', 'savit_custom_categories'].forEach(key => localStorage.removeItem(key));
  localStorage.setItem('savit_data_v1_cleaned', 'true');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <CustomerProvider>
          <NotificationProvider>
            <AuthProvider>
              <CartProvider>
                <FavoritesProvider>
                  <App />
                </FavoritesProvider>
              </CartProvider>
            </AuthProvider>
          </NotificationProvider>
        </CustomerProvider>
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>
);
