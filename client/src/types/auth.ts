export interface User {
    id: number;
    name: string;
    email: string;
    created_at: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    user: User;
    token: string;
}

export interface CurrentUserResponse {
    success: boolean;
    user: User;
}