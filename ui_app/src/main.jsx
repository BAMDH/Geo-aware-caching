import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LoginPage from './pages/Login.jsx'
import RegisterPage from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AddDomainPage from './pages/AddDomain.jsx'
import AddURLPage from './pages/AddURL.jsx'
import './index.css'

const router = createBrowserRouter([
  { path: "/", element: <LoginPage/>},
  { path: "/register", element: <RegisterPage/> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/domainAdd", element: <AddDomainPage /> },
  { path: "/urlAdd", element: <AddURLPage /> },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)
