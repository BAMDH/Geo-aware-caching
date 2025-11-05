import { useNavigate } from "react-router-dom";
import { LuCircleUserRound, LuLogOut } from "react-icons/lu";

const Layout = ({ children }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        // TODO
        navigate("/");
    };

    return (
        <div className="min-h-screen bg-white text-[rgb(28,58,141)] flex flex-col">
            {/* HEADER */}
            <header className="flex items-center justify-between px-8 py-7 bg-[rgb(28,58,141)] text-white">
                <h1
                    className="text-2xl font-bold cursor-pointer"
                    onClick={() => navigate("/dashboard")} >
                    Dashboard
                </h1>
                <div className="flex items-center gap-6">
                    <LuCircleUserRound className="w-8 h-8 cursor-pointer hover:scale-110" />
                    <LuLogOut
                        className="w-8 h-8 cursor-pointer hover:scale-110"
                        onClick={handleLogout}
                    />
                </div>
            </header>

            {/* CONTENIDO DE LA PÁGINA */}
            <main className="flex-1 px-8 py-6">{children}</main>
        </div>
    );
};

export default Layout;
