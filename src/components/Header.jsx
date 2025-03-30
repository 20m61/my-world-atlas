import { NavLink } from 'react-router-dom'
import './Header.css'

function Header() {
  return (
    <header className="header">
      <div className="container header-container">
        <h1 className="logo">
          <NavLink to="/">My World Atlas</NavLink>
        </h1>
        <nav className="nav">
          <ul className="nav-list">
            <li className="nav-item">
              <NavLink 
                to="/" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                end
              >
                地図表示
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink 
                to="/list" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                一覧表示
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header
