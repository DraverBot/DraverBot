declare global {
    namespace NodeJS {
        interface ProcessEnv {
            token: string;
            host: string;
            database: string;
            user: string;
            password: string;
        }
    }
}

export {}