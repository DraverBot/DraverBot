export enum ButtonIds {
    DisplayDevInfo = 'button-dev-info',
    DisplayNote = 'moderation.display-note',
    DownloadSqlLogs = 'dev.download-sql-logs',
    AnalyzeSqlLogs = 'dev.analyze-sql-logs',
    DevInstantInfos = 'dev.display-instant-infos',
    ClearSqlLogs = 'dev.clear-sql-logs',
    GBanUser = 'bot-admin.gban.ban-user',
    UnGBanUser = 'bot-admin.gban.unban-user',
    GBanList = 'bot-admin.gban.list',
    PollAddChoice = 'cmd.poll.add-choice',
    PollChoices = 'cmd.poll.choices',
    PollRemoveChoice = 'cmd.poll.remove-choice',
    PollCancel = 'cmd.poll.cancel',
    PollValidate = 'cmd.poll.validate',
    TaskAssign = 'task.assign',
    TaskClose = 'task.close',
    TaskUnAssign = 'task.remove.assign',
    TaskDone = 'task.done',
    MastermindReply = 'mastermind.try',
    MastermindResign = 'mastermind.resign',
    RoleReactAdd = 'cmd.rolesreact.roles.add',
    RoleReactRemove = 'cmd.rolesreact.roles.remove',
    RoleReactsOk = 'cmd.rolesreact.validate',
    RoleReactsCancel = 'cmd.rolesreact.cancel',
    PlayMastermindEasy = 'play.mastermind.easy',
    PlayMastermindHard = 'play.mastermind.hard',
    PlayMinesweeper = 'play.minesweeper',
    SendRandomJoke = 'play.sendRandom.joke',
    ResignToCurrentMastermind = 'mastermind.external.resign',
    LevelAddChannel = 'cmd.level.list.add',
    LevelRemoveChannel = 'cmd.level.list.remove',
    LevelPurgeList = 'cmd.level.list.purge',
    LevelListSwap = 'cmd.level.list.swap'
}
import { ButtonBuilder } from 'discord.js';

export type buttonsInputData = {
    participate?: (customId: string) => ButtonBuilder;
    cancelParticipation?: (customId: string) => ButtonBuilder;
};
