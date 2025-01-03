// from https://github.com/Vendicated/Vencord/blob/dev/src/api/Commands/types.ts

import type { Channel, Guild } from 'discord-types/general'

export interface CommandContext {
    channel: Channel
    guild?: Guild
}

export enum ApplicationCommandOptionType {
    SubCommand = 1,
    SubCommandGroup = 2,
    String = 3,
    Integer = 4,
    Boolean = 5,
    User = 6,
    Channel = 7,
    Role = 8,
    Mentionable = 9,
    Number = 10,
    Attachment = 11,
}

export enum ApplicationCommandInputType {
    BuiltIn = 0,
    BuiltInText = 1,
    BuiltInIntegration = 2,
    Bot = 3,
    Placeholder = 4,
}

export interface Option {
    name: string
    displayName?: string
    type: ApplicationCommandOptionType
    description: string
    displayDescription?: string
    required?: boolean
    options?: Option[]
    choices?: Array<ChoicesOption>
}

export interface ChoicesOption {
    label: string
    value: string
    name: string
    displayName?: string
}

export enum ApplicationCommandType {
    ChatInput = 1,
    User = 2,
    Message = 3,
}

export interface CommandReturnValue {
    content: string
}

export interface Argument {
    type: ApplicationCommandOptionType
    name: string
    value: string
    focused: undefined
    options: Argument[]
}

export interface Command {
    id: string
    untranslatedName: string
    displayName: string
    type: ApplicationCommandType
    inputType: ApplicationCommandInputType
    applicationId: string
    untranslatedDescription?: string
    displayDescription?: string
    options?: Option[]

    predicate?(ctx: CommandContext): boolean
    execute(args: Argument[], ctx: CommandContext): void | CommandReturnValue | Promise<void | CommandReturnValue>
}
