import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import {
    api,
} from "../api/client";

import type {
    AuthResponse,
    CurrentUserResponse,
    User,
} from "../types/auth";


interface AuthContextValue {
    user: User | null;
    loading: boolean;

    login: (
        email: string,
        password: string
    ) => Promise<void>;

    register: (
        name: string,
        email: string,
        password: string
    ) => Promise<void>;

    logout: () => void;
}


const AuthContext =
    createContext<
        AuthContextValue | undefined
    >(undefined);


interface AuthProviderProps {
    children: ReactNode;
}


export function AuthProvider({
    children,
}: AuthProviderProps) {
    const [
        user,
        setUser,
    ] =
        useState<User | null>(
            null
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);


    useEffect(
        () => {
            async function loadUser() {
                const token =
                    localStorage.getItem(
                        "flowforge_token"
                    );

                if (!token) {
                    setLoading(false);
                    return;
                }

                try {
                    const response =
                        await api.get<
                            CurrentUserResponse
                        >(
                            "/auth/me"
                        );

                    setUser(
                        response.data.user
                    );
                } catch {
                    localStorage.removeItem(
                        "flowforge_token"
                    );

                    setUser(null);
                } finally {
                    setLoading(false);
                }
            }

            void loadUser();
        },
        []
    );


    async function login(
        email: string,
        password: string
    ) {
        const response =
            await api.post<
                AuthResponse
            >(
                "/auth/login",
                {
                    email,
                    password,
                }
            );

        localStorage.setItem(
            "flowforge_token",
            response.data.token
        );

        setUser(
            response.data.user
        );
    }


    async function register(
        name: string,
        email: string,
        password: string
    ) {
        const response =
            await api.post<
                AuthResponse
            >(
                "/auth/register",
                {
                    name,
                    email,
                    password,
                }
            );

        localStorage.setItem(
            "flowforge_token",
            response.data.token
        );

        setUser(
            response.data.user
        );
    }


    function logout() {
        localStorage.removeItem(
            "flowforge_token"
        );

        setUser(null);
    }


    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}


export function useAuth() {
    const context =
        useContext(
            AuthContext
        );

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider"
        );
    }

    return context;
}