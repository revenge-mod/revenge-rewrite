#!/usr/bin/env node
import * as repl from 'node:repl'
import { WebSocketServer } from 'ws'
import chalk from 'chalk'
import clipboardy from 'clipboardy'
import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'

const debuggerHistoryPath = resolve(join('node_modules', 'debugger'))

if ('Bun' in globalThis)
    throw new Error(
        `Bun is unsupported due to it lacking compatibility with node:repl. Please run "node ./scripts/debugger.mjs" or "bun debugger"`,
    )

let isPrompting = false

const debuggerColorify = message => (isPrompting ? '\n' : '') + chalk.bold.blue('[Debugger] ') + message

const clientColorify = (style, message) =>
    (isPrompting ? '\n' : '') +
    (style === 'error'
        ? chalk.bold.red('[Revenge] ERR! ') + chalk.red(message)
        : style === 'warn'
          ? chalk.bold.yellow('[Revenge] ') + chalk.yellow(message)
          : chalk.bold.green('[Revenge] ') + message)

const logAsDebugger = message => console.info(debuggerColorify(message))

const logAsClient = message => console.info(clientColorify(null, message))
const logAsClientWarn = message => console.warn(clientColorify('warn', message))
const logAsClientError = message => console.error(clientColorify('error', message))

const copyPrompt = ' --copy'
const clearHistoryPrompt = '--ch'

export function serve() {
    let websocketOpen = false
    let awaitingReply

    const wss = new WebSocketServer({
        port: 9090,
    })
    wss.on('connection', ws => {
        if (websocketOpen) return
        websocketOpen = true

        logAsDebugger('Starting debugger session')

        ws.on('message', data => {
            try {
                /** @type {{ level: "info" | "warn" | "error", message: string, nonce?: string }} */
                const json = JSON.parse(data.toString())

                if (awaitingReply?.cb && awaitingReply?.nonce && awaitingReply.nonce === json.nonce) {
                    if (json.level === 'info' && awaitingReply.toCopy) {
                        clipboardy.write(json.message)
                        awaitingReply.cb(null, debuggerColorify('Copied result to clipboard'))
                    } else
                        awaitingReply.cb(
                            null,
                            json.level === 'error'
                                ? clientColorify('error', json.message)
                                : clientColorify(null, json.message),
                        )
                    awaitingReply = null
                    isPrompting = true
                } else {
                    if (json.level === 'error') logAsClientError(json.message)
                    else if (json.level === 'warn') logAsClientWarn(json.message)
                    else logAsClient(json.message)

                    if (isPrompting) rl.displayPrompt(true)
                }
            } catch {}
        })

        isPrompting = true
        const rl = repl.start({
            eval(input, _, __, cb) {
                if (!isPrompting) return
                if (!input.trim()) return cb()

                try {
                    isPrompting = false

                    const code = input.trim()
                    if (code === clearHistoryPrompt) {
                        writeFile(join(debuggerHistoryPath, 'history.txt'), '')
                        logAsDebugger('Cleared repl history')
                        return cb()
                    }

                    awaitingReply = {
                        nonce: crypto.randomUUID(),
                        cb,
                        toCopy: code.endsWith(copyPrompt),
                    }
                    ws.send(
                        JSON.stringify({
                            code: code.endsWith(copyPrompt) ? code.slice(0, -copyPrompt.length) : code,
                            nonce: awaitingReply.nonce,
                        }),
                    )
                } catch (e) {
                    cb(e)
                }
            },
            writer(msg) {
                return msg
            },
        })
        rl.setupHistory(join(debuggerHistoryPath, 'history.txt'), () => void 0)

        rl.on('close', () => {
            isPrompting = false
            ws.close()
            logAsDebugger('Closing debugger, press Ctrl+C to exit')
        })

        ws.on('close', () => {
            logAsDebugger('Websocket was closed')
            rl.close()
            websocketOpen = false
        })
    })

    logAsDebugger('Debugger ready at :9090')
    logAsDebugger(`Add${chalk.bold(copyPrompt)} to your prompt to copy the result to clipboard`)
    logAsDebugger(`Type ${chalk.bold(clearHistoryPrompt)} to clear your repl history `)

    return wss
}

if (!existsSync(debuggerHistoryPath)) await mkdir(debuggerHistoryPath, { recursive: true })

serve()
