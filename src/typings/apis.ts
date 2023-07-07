export type ChessPlayer = {
    avatar: string;
    player_id: number;
    '@id': string;
    url: string;
    username: string;
    followers: number;
    country: string;
    last_online: number;
    joined: number;
    status: string;
    is_streamer: boolean;
    verified: boolean;
    league: string;
};
export type ChessStats = {
    chess_daily: {
        last: {
            rating: number;
            date: number;
            rd: number;
        };
        best: {
            rating: number;
            date: number;
            game: string;
        };
        record: {
            win: number;
            loss: number;
            draw: number;
            time_per_move: number;
            timeout_percent: number;
        };
    };
    chess_rapid: {
        last: {
            rating: number;
            date: number;
            rd: number;
        };
        best: {
            rating: number;
            date: number;
            game: string;
        };
        record: {
            win: number;
            loss: number;
            draw: number;
        };
    };
    chess_bullet: {
        last: {
            rating: number;
            date: number;
            rd: number;
        };
        best: {
            rating: number;
            date: number;
            game: string;
        };
        record: {
            win: number;
            loss: number;
            draw: number;
        };
    };
    chess_blitz: {
        last: {
            rating: number;
            date: number;
            rd: number;
        };
        best: {
            rating: number;
            date: number;
            game: string;
        };
        record: {
            win: number;
            loss: number;
            draw: number;
        };
    };
    fide: number;
    tactics: {
        highest: {
            rating: number;
            date: number;
        };
        lowest: {
            rating: number;
            date: number;
        };
    };
    puzzle_rush: {
        best: {
            total_attempts: number;
            score: number;
        };
    };
};
export type LichessStats = {
    id: string;
    username: string;
    perfs: {
        blitz: {
            games: number;
            rating: number;
            rd: number;
            prog: number;
        };
        puzzle: {
            games: number;
            rating: number;
            rd: number;
            prog: number;
        };
        streak: {
            runs: number;
            score: number;
        };
        storm: {
            runs: number;
            score: number;
        };
        bullet: {
            games: number;
            rating: number;
            rd: number;
            prog: number;
        };
        correspondence: {
            games: number;
            rating: number;
            rd: number;
            prog: number;
            prov: boolean;
        };
        classical: {
            games: number;
            rating: number;
            rd: number;
            prog: number;
            prov: boolean;
        };
        rapid: {
            games: number;
            rating: number;
            rd: number;
            prog: number;
        };
    };
    createdAt: number;
    profile: {
        country: string;
        bio: string;
        links: string;
    };
    seenAt: number;
    playTime: {
        total: number;
        tv: number;
    };
    url: string;
    count: {
        all: number;
        rated: number;
        ai: number;
        draw: number;
        drawH: number;
        loss: number;
        lossH: number;
        win: number;
        winH: number;
        bookmark: number;
        playing: number;
        import: number;
        me: number;
    };
    followable: boolean;
    following: boolean;
    blocking: boolean;
    followsYou: boolean;
};

export type BenderAPIType =
    | 'Mute'
    | 'Unmute'
    | 'Ban'
    | 'Unban'
    | 'Kick'
    | 'Rename'
    | 'ChannelCreate'
    | 'ChannelDelete'
    | 'ChannelEdit'
    | 'RoleCreate'
    | 'RoleDelete'
    | 'RoleEdit'
    | 'Censor'
    | 'RoleAdded'
    | 'RoleRemoved';

type BenderAPIOptionsData<T extends BenderAPIType> = T extends 'Unmute'
    ? { remainingTimeInMs: number; member: string }
    : T extends 'Kick' | 'Mute'
    ? { member: string }
    : T extends 'Censor' | 'Rename'
    ? { oldName: string; member: string }
    : T extends 'ChannelEdit' | 'RoleEdit'
    ? { before: any; after: any }
    : T extends 'RoleCreate' | 'ChannelCreate'
    ? { id: string }
    : T extends 'RoleDelete' | 'ChannelDelete'
    ? { value: any; permissions: any }
    : T extends 'RoleAdded' | 'RoleRemoved'
    ? { member: string; role: string }
    : T extends 'Ban' | 'Unban'
    ? { member: string }
    : never;

export type BenderAPIOptions<T extends BenderAPIType> = {
    type: T;
    guild: string;
    user: string;
    data: BenderAPIOptionsData<T>;
};
