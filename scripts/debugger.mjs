#!/usr/bin/env node
import { existsSync } from 'fs'
import * as repl from 'node:repl'
import os from 'os'
import { join, resolve } from 'path'
import chalk from 'chalk'
import clipboardy from 'clipboardy'
import { mkdir, writeFile } from 'fs/promises'
import { WebSocketServer } from 'ws'

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
        ? chalk.bold.red('[Revenge] ') + chalk.red(message)
        : style === 'warn'
          ? chalk.bold.yellow('[Revenge] ') + chalk.yellow(message)
          : chalk.bold.green('[Revenge] ') + message)

const logAsDebugger = message => console.info(debuggerColorify(message))

const logAsClient = message => console.info(clientColorify(null, message))
const logAsClientWarn = message => console.warn(clientColorify('warn', message))
const logAsClientError = message => console.error(clientColorify('error', message))

const copyPrompt = '--copy'
const clearHistoryPrompt = '--clear'

export function serve() {
    let websocketOpen = false
    let nextReply

    const wss = new WebSocketServer({
        port: 9090,
    })
    wss.on('connection', ws => {
        if (websocketOpen) return
        websocketOpen = true

        logAsDebugger('Client connected')

        ws.on('message', data => {
            try {
                /** @type {{ level: "info" | "warn" | "error", message: string, nonce?: string }} */
                const json = JSON.parse(data.toString())

                if (nextReply?.cb && nextReply?.nonce && nextReply.nonce === json.nonce) {
                    if (json.level === 'info' && nextReply.toCopy) {
                        clipboardy.write(json.message)
                        nextReply.cb(null, debuggerColorify('Copied result to clipboard'))
                    } else
                        nextReply.cb(
                            null,
                            json.level === 'error'
                                ? clientColorify('error', json.message)
                                : clientColorify(null, json.message),
                        )
                    nextReply = null
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
                        logAsDebugger('Cleared REPL history')
                        return cb()
                    }

                    nextReply = {
                        nonce: crypto.randomUUID(),
                        cb,
                        toCopy: code.endsWith(copyPrompt),
                    }
                    ws.send(
                        JSON.stringify({
                            code: code.endsWith(copyPrompt) ? code.slice(0, -copyPrompt.length) : code,
                            nonce: nextReply.nonce,
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
        })

        ws.on('close', () => {
            logAsDebugger('Client disconnected')
            rl.close()
            websocketOpen = false
        })
    })

    console.info(chalk.red('\nDebugger ready, available on:\n'))
    const netInterfaces = os.networkInterfaces()
    for (const netinterfaces of Object.values(netInterfaces)) {
        for (const details of netinterfaces || []) {
            if (details.family !== 'IPv4') continue
            const port = chalk.yellowBright(wss.address()?.port.toString())
            console.info(`  ${chalk.gray('http://')}${details.address}:${port}`)
        }
    }

    console.log(
        chalk.gray.underline(
            `\nRun with ${chalk.bold.white(copyPrompt)}  to your prompt to copy the result to clipboard`,
        ),
    )
    console.log(chalk.gray.underline(`Run with ${chalk.bold.white(clearHistoryPrompt)} to clear your REPL history\n`))

    return wss
}

if (!existsSync(debuggerHistoryPath)) await mkdir(debuggerHistoryPath, { recursive: true })

serve()
