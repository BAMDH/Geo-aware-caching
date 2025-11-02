import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LoginPage from './pages/Login.jsx'
import RegisterPage from './pages/Register.jsx'
import './index.css'

const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage/>
  }, {
    path: "/register",
    element: <RegisterPage/>
  }
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)
