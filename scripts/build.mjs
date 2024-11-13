import { execSync } from 'child_process'
import { randomBytes } from 'crypto'
import { resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'
import { transformFile } from '@swc/core'
import chalk from 'chalk'
import { build } from 'esbuild'
import yargs from 'yargs-parser'

const args = yargs(process.argv.slice(2))
const { release, minify, dev } = args

let context = {
    /**
     * @type {string | null}
     */
    hash: null,
}

/**
 * @type {import('esbuild').BuildOptions}
 */
const config = {
    entryPoints: ['src/index.tsx'],
    bundle: true,
    outfile: 'dist/revenge.js',
    format: 'iife',
    splitting: false,
    external: ['react', 'react-native'],
    supported: {
        // Hermes does not actually support const and let, even though it syntactically
        // accepts it, but it's treated just like 'var' and causes issues
        'const-and-let': false,
    },
    define: {
        __BUNDLE_DEV__: `${dev}`,
        __BUNDLE_RELEASE__: `"${release ?? 'local'}"`,
    },
    footer: {
        js: '//# sourceURL=revenge',
    },
    loader: {
        '.png': 'dataurl',
    },
    // inject: ["./shims/asyncIteratorSymbol.js", "./shims/promiseAllSettled.js"],
    legalComments: 'none',
    alias: {
        react: './shims/react.ts',
        'react-native': './shims/react-native.ts',
        'react/jsx-runtime': './shims/react~jsx-runtime.ts',
        events: './shims/events.ts',
    },
    plugins: [
        {
            name: 'swc',
            setup(build) {
                build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async args => {
                    const result = await transformFile(args.path, {
                        jsc: {
                            externalHelpers: true,
                            transform: {
                                react: {
                                    runtime: 'automatic',
                                },
                            },
                        },
                        // https://github.com/facebook/hermes/blob/3815fec63d1a6667ca3195160d6e12fee6a0d8d5/doc/Features.md
                        // https://github.com/facebook/hermes/issues/696#issuecomment-1396235791
                        env: {
                            targets: 'fully supports es6',
                            include: [
                                'transform-block-scoping',
                                'transform-classes',
                                'transform-async-to-generator',
                                'transform-async-generator-functions',
                                'transform-named-capturing-groups-regex',
                            ],
                            exclude: [
                                'transform-parameters',
                                'transform-template-literals',
                                'transform-exponentiation-operator',
                                'transform-nullish-coalescing-operator',
                                'transform-object-rest-spread',
                                'transform-optional-chaining',
                                'transform-logical-assignment-operators',
                            ],
                        },
                    })

                    return { contents: result.code }
                })
            },
        },
    ],
}

export async function buildBundle(overrideConfig = {}) {
    context = {
        hash: release
            ? execSync('git rev-parse --short HEAD').toString().trim()
            : randomBytes(8).toString('hex').slice(0, 7),
    }

    const initialStartTime = performance.now()
    await build({ ...config, ...overrideConfig })

    return {
        config,
        context,
        timeTook: performance.now() - initialStartTime,
    }
}

const pathToThisFile = resolvePath(fileURLToPath(import.meta.url))
const pathPassedToNode = resolvePath(process.argv[1])
const isThisFileBeingRunViaCLI = pathToThisFile.includes(pathPassedToNode)

if (isThisFileBeingRunViaCLI) {
    const { timeTook } = await buildBundle()

    printBuildSuccess(context.hash, release, timeTook)

    if (minify) {
        const { timeTook } = await buildBundle({
            minifyWhitespace: true,
            minifySyntax: true,
            outfile: config.outfile.replace(/\.js$/, '.min.js'),
        })

        printBuildSuccess(context.hash, release, timeTook, true)
    }
}

export function printBuildSuccess(hash, release, timeTook, minified = false) {
    console.info(
        [
            chalk.bold.greenBright(`✔ Built bundle${minified ? ' (minified)' : ''}`),
            hash && chalk.bold.blueBright(`(${hash})`),
            !release && chalk.bold.cyanBright('(local)'),
            timeTook && chalk.gray(`in ${timeTook.toFixed(3)}ms`),
        ]
            .filter(Boolean)
            .join(' '),
    )
}
