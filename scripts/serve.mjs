import { createServer } from 'http'
import os from 'os'
import chalk from 'chalk'
import { readFile } from 'fs/promises'
import yargs from 'yargs-parser'

import { buildBundle, printBuildSuccess } from './build.mjs'

const args = yargs(process.argv.slice(2))

export function serve() {
    const server = createServer(async (_, res) => {
        try {
            const initialStartTime = performance.now()
            const { config, context } = await buildBundle()

            printBuildSuccess(context.hash, undefined, performance.now() - initialStartTime, false)

            res.writeHead(200, { 'Content-Type': 'application/javascript' })
            res.end(await readFile(config.outfile, 'utf-8'))
        } catch {
            res.writeHead(500)
            res.end()
        }
    })

    server.listen(args.port ?? 4040)

    console.info(
        chalk.bold.whiteBright(
            `   
   ░▓█████▓░             ░▓█████▓
  ░▓█████████████████████████████▓
 ▓████████████████████████████████▓
 ▓█████████████████████████████████▓
 ▓████████▀▓███████████████▓▀██████▓
  ▓██████▓       ▓███▓       ▓█████▓
  ▓███████▓░   ▒██████▓░   ▒████████▓
  ▓█████████████████████████████████▓
  ▓█████████████████████████████████▓
   ░▓███████████████████████████████▓
                    ▓██████████████▓
                   ▓█████████████▓
                     ▀▀▀▀▀▀▀▀▀▀▀
    `.trimEnd(),
        ),
    )

    console.info(chalk.bold.redBright('\nServing REVENGE bundle, available on:\n'))

    const netInterfaces = os.networkInterfaces()
    for (const netinterfaces of Object.values(netInterfaces)) {
        for (const details of netinterfaces || []) {
            if (details.family !== 'IPv4') continue
            const port = chalk.yellowBright(server.address()?.port.toString())
            console.info(`  ${chalk.gray('http://')}${details.address}:${port}`)
        }
    }

    return server
}

serve()

console.log(chalk.underline.gray('\nPress Ctrl+C to stop'))
