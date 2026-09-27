import jwt, {
    type JwtPayload,
    type Secret,
    type SignOptions,
} from "jsonwebtoken";

const jwtSecretFromEnv =
    process.env.JWT_SECRET;

if (!jwtSecretFromEnv) {
    throw new Error(
        "JWT_SECRET is not defined"
    );
}

const JWT_SECRET: Secret =
    jwtSecretFromEnv;

const JWT_EXPIRES_IN =
    (
        process.env.JWT_EXPIRES_IN ??
        "7d"
    ) as SignOptions["expiresIn"];

interface FlowForgeTokenPayload
    extends JwtPayload {
    userId: number;
}

export function signToken(
    userId: number
) {
    return jwt.sign(
        {
            userId,
        },
        JWT_SECRET,
        {
            expiresIn:
                JWT_EXPIRES_IN,
        }
    );
}

export function verifyToken(
    token: string
): FlowForgeTokenPayload {
    const decoded =
        jwt.verify(
            token,
            JWT_SECRET
        );

    if (
        typeof decoded ===
        "string"
    ) {
        throw new Error(
            "Invalid token payload"
        );
    }

    if (
        typeof decoded.userId !==
        "number"
    ) {
        throw new Error(
            "Invalid token payload"
        );
    }

    return {
        ...decoded,
        userId:
            decoded.userId,
    };
}